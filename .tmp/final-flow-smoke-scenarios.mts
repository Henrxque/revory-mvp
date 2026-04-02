import fs from 'node:fs';
import path from 'node:path';

import {
  AppointmentStatus,
  CommunicationChannel,
  DataSourceStatus,
  DataSourceType,
  FlowModeKey,
  Prisma,
  PrismaClient,
  WorkspaceStatus,
} from '@prisma/client';

import { getInitialAppPath } from '@/services/app/get-initial-app-path';
import { csvUploadSourceNames } from '@/services/imports/csv-upload-source-config';
import {
  getCsvUploadSources,
  hasLiveCsvUploadSource,
} from '@/services/imports/get-csv-upload-sources';
import { buildActivationStepRead } from '@/services/decision-support/build-activation-step-read';
import { getDashboardOverview } from '@/services/dashboard/get-dashboard-overview';
import { getBookedProofRead } from '@/services/proof/get-booked-proof-read';
import {
  getOnboardingStep,
  onboardingSteps,
  resolveOnboardingStepKey,
} from '@/services/onboarding/wizard-steps';
import { getRevoryCsvTemplateColumns } from '@/lib/imports/csv-template-definitions';
import { buildAssistedImportPayloadFromCsv } from '@/lib/imports/assisted-import';

const prisma = new PrismaClient();
const root = process.cwd();
const outDir = path.join(root, '.tmp', 'final-flow-smoke-2026-04-01');
fs.mkdirSync(outDir, { recursive: true });

const runId = `smoke-${Date.now()}`;
const smokeEmail = `${runId}@example.com`;

function formatBookingPathLabel(value) {
  switch (value) {
    case 'SMS':
      return 'Assisted booking path (SMS)';
    case 'EMAIL':
      return 'Primary booking path (Email)';
    default:
      return null;
  }
}

function resolveBookingInputsStatus(activationCompleted, hasBookedProofVisible) {
  if (hasBookedProofVisible) return 'Proof active';
  if (activationCompleted) return 'Proof ready';
  return 'Proof next';
}

function getWorkspaceSubtitle(activationSetup, hasBookedProofVisible) {
  const currentStep = getOnboardingStep(resolveOnboardingStepKey(activationSetup.currentStep));
  return activationSetup.isCompleted
    ? hasBookedProofVisible
      ? 'Seller workspace live with booked proof'
      : 'Seller workspace live, booked proof next'
    : `Activation in progress: ${currentStep.eyebrow}`;
}

function getSetupBookingPathState(activationSetup) {
  const currentStepKey = resolveOnboardingStepKey(activationSetup.currentStep);
  const currentStepIndex = onboardingSteps.findIndex((candidate) => candidate.key === currentStepKey);
  const channelStepIndex = onboardingSteps.findIndex((candidate) => candidate.key === 'channel');
  const hasBookingPathConfirmed =
    activationSetup.isCompleted || currentStepIndex > channelStepIndex;
  return {
    bookingPathLabel: hasBookingPathConfirmed
      ? formatBookingPathLabel(activationSetup.primaryChannel)
      : null,
    currentStepKey,
    hasBookingPathConfirmed,
  };
}

function getImportsHeroState({ hasBookedProofVisible, hasAppointmentsSourceReady }) {
  const heroTitle = hasBookedProofVisible
    ? 'Keep revenue proof clean.'
    : 'Start revenue proof.';
  const heroSummary = hasBookedProofVisible
    ? 'Proof first. Lead support second.'
    : hasAppointmentsSourceReady
      ? 'Proof source is present, but booked outcomes still need a clean pass.'
      : 'Upload proof first. Lead support second.';
  const heroCta = hasBookedProofVisible
    ? {
        href: '/app/dashboard',
        label: 'Open Revenue View',
      }
    : {
        href: '#booking-inputs-flow',
        label: hasAppointmentsSourceReady ? 'Review booked proof' : 'Start booked proof',
      };
  return { heroCta, heroSummary, heroTitle };
}

async function cleanupWorkspace(workspaceId) {
  await prisma.reviewRequest.deleteMany({ where: { workspaceId } });
  await prisma.recoveryOpportunity.deleteMany({ where: { workspaceId } });
  await prisma.automationRun.deleteMany({ where: { workspaceId } });
  await prisma.metricsSnapshot.deleteMany({ where: { workspaceId } });
  await prisma.appointment.deleteMany({ where: { workspaceId } });
  await prisma.client.deleteMany({ where: { workspaceId } });
  await prisma.dataSource.deleteMany({ where: { workspaceId } });
  await prisma.activationSetup.deleteMany({ where: { workspaceId } });
  await prisma.workspace.deleteMany({ where: { id: workspaceId } });
}

async function cleanupUser(userId) {
  const workspaces = await prisma.workspace.findMany({ where: { ownerUserId: userId }, select: { id: true } });
  for (const workspace of workspaces) {
    await cleanupWorkspace(workspace.id);
  }
  await prisma.user.deleteMany({ where: { id: userId } });
}

async function createScenarioWorkspace({
  name,
  activation,
  workspaceStatus,
}) {
  const user = await prisma.user.upsert({
    where: { email: smokeEmail },
    update: {
      authProvider: 'smoke',
      fullName: 'Smoke QA',
      status: 'ACTIVE',
    },
    create: {
      authProvider: 'smoke',
      email: smokeEmail,
      fullName: 'Smoke QA',
      status: 'ACTIVE',
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      activeModeKey: FlowModeKey.MODE_A,
      name,
      ownerUserId: user.id,
      slug: `${runId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      status: workspaceStatus,
    },
  });

  const activationSetup = await prisma.activationSetup.create({
    data: {
      averageDealValue: activation.averageDealValue ?? null,
      currentStep: activation.currentStep,
      isCompleted: activation.isCompleted,
      primaryChannel: activation.primaryChannel,
      recommendedModeKey: activation.recommendedModeKey ?? null,
      selectedTemplate: activation.selectedTemplate ?? null,
      workspaceId: workspace.id,
      activatedAt: activation.isCompleted ? new Date() : null,
    },
  });

  return { activationSetup, user, workspace };
}

async function createImportedSource(workspaceId, templateKey, status = DataSourceStatus.IMPORTED, rowCount = 0, successRows = 0, errorRows = 0) {
  const type = templateKey === 'appointments' ? DataSourceType.APPOINTMENTS_CSV : DataSourceType.CLIENTS_CSV;
  return prisma.dataSource.create({
    data: {
      lastImportErrorRowCount: errorRows,
      lastImportFileName: `${templateKey}-${runId}.csv`,
      lastImportRowCount: rowCount,
      lastImportSuccessRowCount: successRows,
      lastImportedAt: new Date(),
      name: csvUploadSourceNames[templateKey],
      status,
      type,
      workspaceId,
    },
  });
}

async function createClient({ workspaceId, dataSourceId, externalId, fullName = 'Client One', email = null, phone = null }) {
  return prisma.client.create({
    data: {
      dataSourceId: dataSourceId ?? null,
      email,
      externalId,
      fullName,
      phone,
      workspaceId,
    },
  });
}

async function createAppointment({ workspaceId, clientId, dataSourceId, externalId, status, estimatedRevenue = null, scheduledOffsetDays = 1 }) {
  const scheduledAt = new Date(Date.now() + scheduledOffsetDays * 24 * 60 * 60 * 1000);
  return prisma.appointment.create({
    data: {
      clientId,
      dataSourceId: dataSourceId ?? null,
      estimatedRevenue,
      externalId,
      scheduledAt,
      status,
      workspaceId,
    },
  });
}

const results = [];

async function runScenario(name, fn) {
  try {
    const result = await fn();
    results.push({ scenario: name, ...result });
  } catch (error) {
    results.push({
      scenario: name,
      status: 'FAIL',
      observed: error instanceof Error ? error.message : String(error),
      expected: 'Scenario should complete without smoke failure.',
      impact: 'critical',
    });
  }
}

await cleanupUser((await prisma.user.findUnique({ where: { email: smokeEmail }, select: { id: true } }))?.id ?? '');

await runScenario('1. Workspace novo sem activation concluido', async () => {
  const ctx = await createScenarioWorkspace({
    name: 'Smoke Scenario 1',
    workspaceStatus: WorkspaceStatus.DRAFT,
    activation: {
      currentStep: 'template',
      isCompleted: false,
      primaryChannel: CommunicationChannel.EMAIL,
    },
  });

  const path = await getInitialAppPath(ctx);
  const proof = await getBookedProofRead(ctx.workspace.id);
  const bookingInputsStatus = resolveBookingInputsStatus(ctx.activationSetup.isCompleted, proof.hasBookedProofVisible);
  const subtitle = getWorkspaceSubtitle(ctx.activationSetup, proof.hasBookedProofVisible);
  const setupState = getSetupBookingPathState(ctx.activationSetup);

  return {
    status: path === '/app/setup/template' && !proof.hasBookedProofVisible && bookingInputsStatus === 'Proof next' && setupState.bookingPathLabel === null
      ? 'PASS'
      : 'FAIL',
    observed: {
      bookingInputsStatus,
      initialPath: path,
      proofVisible: proof.hasBookedProofVisible,
      setupBookingPathLabel: setupState.bookingPathLabel,
      subtitle,
    },
    expected: {
      bookingInputsStatus: 'Proof next',
      initialPath: '/app/setup/template',
      proofVisible: false,
      setupBookingPathLabel: null,
    },
    impact: 'critical',
    files: [
      'services/app/get-initial-app-path.ts',
      'src/app/(app)/app/layout.tsx',
      'src/app/(app)/app/setup/page.tsx',
    ],
  };
});

await runScenario('2. Activation concluido sem appointments importados', async () => {
  const ctx = await createScenarioWorkspace({
    name: 'Smoke Scenario 2',
    workspaceStatus: WorkspaceStatus.ACTIVE,
    activation: {
      averageDealValue: new Prisma.Decimal(350),
      currentStep: 'activation',
      isCompleted: true,
      primaryChannel: CommunicationChannel.EMAIL,
      recommendedModeKey: FlowModeKey.MODE_A,
      selectedTemplate: 'INJECTABLES',
    },
  });

  const path = await getInitialAppPath(ctx);
  const proof = await getBookedProofRead(ctx.workspace.id);
  const subtitle = getWorkspaceSubtitle(ctx.activationSetup, proof.hasBookedProofVisible);
  const status = resolveBookingInputsStatus(true, proof.hasBookedProofVisible);
  const hero = getImportsHeroState({ hasBookedProofVisible: false, hasAppointmentsSourceReady: false });

  return {
    status: path === '/app/imports' && subtitle === 'Seller workspace live, booked proof next' && status === 'Proof ready' && hero.heroCta.label === 'Start booked proof'
      ? 'PASS'
      : 'FAIL',
    observed: {
      heroCta: hero.heroCta,
      initialPath: path,
      proofVisible: proof.hasBookedProofVisible,
      shellSubtitle: subtitle,
      sidebarStatus: status,
    },
    expected: {
      heroCta: 'Start booked proof',
      initialPath: '/app/imports',
      shellSubtitle: 'Seller workspace live, booked proof next',
      sidebarStatus: 'Proof ready',
    },
    impact: 'critical',
    files: [
      'src/app/(app)/app/setup/actions.ts',
      'services/app/get-initial-app-path.ts',
      'src/app/(app)/app/imports/page.tsx',
      'src/app/(app)/app/layout.tsx',
    ],
  };
});

await runScenario('3. Importar apenas lead base / clients', async () => {
  const ctx = await createScenarioWorkspace({
    name: 'Smoke Scenario 3',
    workspaceStatus: WorkspaceStatus.ACTIVE,
    activation: {
      averageDealValue: new Prisma.Decimal(350),
      currentStep: 'activation',
      isCompleted: true,
      primaryChannel: CommunicationChannel.EMAIL,
      recommendedModeKey: FlowModeKey.MODE_A,
      selectedTemplate: 'INJECTABLES',
    },
  });
  const clientsSource = await createImportedSource(ctx.workspace.id, 'clients', DataSourceStatus.IMPORTED, 4, 4, 0);
  await createClient({ workspaceId: ctx.workspace.id, dataSourceId: clientsSource.id, externalId: 'client-1', fullName: 'Lead Base One', email: 'lead1@example.com' });
  const path = await getInitialAppPath(ctx);
  const proof = await getBookedProofRead(ctx.workspace.id);
  const overview = await getDashboardOverview(ctx.workspace.id, 350);
  const uploadSources = await getCsvUploadSources(ctx.workspace.id);
  const sidebarStatus = resolveBookingInputsStatus(true, proof.hasBookedProofVisible);
  const subtitle = getWorkspaceSubtitle(ctx.activationSetup, proof.hasBookedProofVisible);

  return {
    status:
      path === '/app/imports' &&
      proof.hasBookedProofVisible === false &&
      overview.bookedProofSource === null &&
      overview.leadBaseSource?.type === DataSourceType.CLIENTS_CSV &&
      sidebarStatus === 'Proof ready' &&
      subtitle === 'Seller workspace live, booked proof next' &&
      hasLiveCsvUploadSource(uploadSources.clients) === true
        ? 'PASS'
        : 'FAIL',
    observed: {
      bookedProofSource: overview.bookedProofSource,
      initialPath: path,
      leadBaseSourceType: overview.leadBaseSource?.type ?? null,
      proofVisible: proof.hasBookedProofVisible,
      shellSubtitle: subtitle,
      sidebarStatus,
    },
    expected: {
      bookedProofSource: null,
      initialPath: '/app/imports',
      proofVisible: false,
      sidebarStatus: 'Proof ready',
    },
    impact: 'critical',
    files: [
      'services/app/get-initial-app-path.ts',
      'src/app/(app)/app/layout.tsx',
      'services/dashboard/get-dashboard-overview.ts',
      'src/app/(app)/app/dashboard/page.tsx',
    ],
  };
});

await runScenario('4. Importar appointments validos com booked outcomes', async () => {
  const ctx = await createScenarioWorkspace({
    name: 'Smoke Scenario 4',
    workspaceStatus: WorkspaceStatus.ACTIVE,
    activation: {
      averageDealValue: new Prisma.Decimal(350),
      currentStep: 'activation',
      isCompleted: true,
      primaryChannel: CommunicationChannel.EMAIL,
      recommendedModeKey: FlowModeKey.MODE_A,
      selectedTemplate: 'INJECTABLES',
    },
  });
  const appointmentsSource = await createImportedSource(ctx.workspace.id, 'appointments', DataSourceStatus.IMPORTED, 2, 2, 0);
  const clientsSource = await createImportedSource(ctx.workspace.id, 'clients', DataSourceStatus.IMPORTED, 2, 2, 0);
  const clientA = await createClient({ workspaceId: ctx.workspace.id, dataSourceId: appointmentsSource.id, externalId: 'a', fullName: 'Booked One', email: 'booked1@example.com' });
  const clientB = await createClient({ workspaceId: ctx.workspace.id, dataSourceId: clientsSource.id, externalId: 'b', fullName: 'Booked Two', email: 'booked2@example.com' });
  await createAppointment({ workspaceId: ctx.workspace.id, clientId: clientA.id, dataSourceId: appointmentsSource.id, externalId: 'appt-1', status: AppointmentStatus.SCHEDULED, estimatedRevenue: new Prisma.Decimal(300) });
  await createAppointment({ workspaceId: ctx.workspace.id, clientId: clientB.id, dataSourceId: appointmentsSource.id, externalId: 'appt-2', status: AppointmentStatus.COMPLETED, estimatedRevenue: new Prisma.Decimal(450) });

  const path = await getInitialAppPath(ctx);
  const proof = await getBookedProofRead(ctx.workspace.id);
  const overview = await getDashboardOverview(ctx.workspace.id, 350);
  const sidebarStatus = resolveBookingInputsStatus(true, proof.hasBookedProofVisible);
  const subtitle = getWorkspaceSubtitle(ctx.activationSetup, proof.hasBookedProofVisible);

  return {
    status:
      path === '/app/dashboard' &&
      proof.hasBookedProofVisible === true &&
      overview.bookedAppointments === 2 &&
      overview.bookedProofSource?.type === DataSourceType.APPOINTMENTS_CSV &&
      overview.leadBaseSource?.type === DataSourceType.CLIENTS_CSV &&
      sidebarStatus === 'Proof active' &&
      subtitle === 'Seller workspace live with booked proof'
        ? 'PASS'
        : 'FAIL',
    observed: {
      bookedAppointments: overview.bookedAppointments,
      bookedProofSourceType: overview.bookedProofSource?.type ?? null,
      initialPath: path,
      leadBaseSourceType: overview.leadBaseSource?.type ?? null,
      proofVisible: proof.hasBookedProofVisible,
      shellSubtitle: subtitle,
      sidebarStatus,
    },
    expected: {
      initialPath: '/app/dashboard',
      proofVisible: true,
      sidebarStatus: 'Proof active',
    },
    impact: 'critical',
    files: [
      'services/app/get-initial-app-path.ts',
      'src/app/(app)/app/layout.tsx',
      'services/dashboard/get-dashboard-overview.ts',
      'src/app/(app)/app/dashboard/page.tsx',
    ],
  };
});

await runScenario('5. Appointments sem estimatedRevenue com averageDealValue configurado', async () => {
  const ctx = await createScenarioWorkspace({
    name: 'Smoke Scenario 5',
    workspaceStatus: WorkspaceStatus.ACTIVE,
    activation: {
      averageDealValue: new Prisma.Decimal(400),
      currentStep: 'activation',
      isCompleted: true,
      primaryChannel: CommunicationChannel.EMAIL,
      recommendedModeKey: FlowModeKey.MODE_A,
      selectedTemplate: 'INJECTABLES',
    },
  });
  const appointmentsSource = await createImportedSource(ctx.workspace.id, 'appointments', DataSourceStatus.IMPORTED, 3, 3, 0);
  const clientA = await createClient({ workspaceId: ctx.workspace.id, dataSourceId: appointmentsSource.id, externalId: 'c1', fullName: 'Fallback One', email: 'fb1@example.com' });
  const clientB = await createClient({ workspaceId: ctx.workspace.id, dataSourceId: appointmentsSource.id, externalId: 'c2', fullName: 'Fallback Two', email: 'fb2@example.com' });
  await createAppointment({ workspaceId: ctx.workspace.id, clientId: clientA.id, dataSourceId: appointmentsSource.id, externalId: 'f-1', status: AppointmentStatus.SCHEDULED, estimatedRevenue: null });
  await createAppointment({ workspaceId: ctx.workspace.id, clientId: clientB.id, dataSourceId: appointmentsSource.id, externalId: 'f-2', status: AppointmentStatus.COMPLETED, estimatedRevenue: null });

  const overview = await getDashboardOverview(ctx.workspace.id, 400);
  const proof = await getBookedProofRead(ctx.workspace.id);

  return {
    status:
      proof.visibleBookedAppointments === 2 &&
      overview.bookedAppointments === 2 &&
      overview.estimatedImportedRevenue === 800
        ? 'PASS'
        : 'FAIL',
    observed: {
      bookedAppointments: overview.bookedAppointments,
      proofVisibleCount: proof.visibleBookedAppointments,
      revenue: overview.estimatedImportedRevenue,
    },
    expected: {
      bookedAppointments: 2,
      revenue: 800,
    },
    impact: 'critical',
    files: [
      'services/dashboard/get-dashboard-overview.ts',
      'src/app/(app)/app/dashboard/page.tsx',
      'src/app/(app)/app/setup/page.tsx',
    ],
  };
});

await runScenario('6. Appointments com canceled / no_show', async () => {
  const ctx = await createScenarioWorkspace({
    name: 'Smoke Scenario 6',
    workspaceStatus: WorkspaceStatus.ACTIVE,
    activation: {
      averageDealValue: new Prisma.Decimal(400),
      currentStep: 'activation',
      isCompleted: true,
      primaryChannel: CommunicationChannel.EMAIL,
      recommendedModeKey: FlowModeKey.MODE_A,
      selectedTemplate: 'INJECTABLES',
    },
  });
  const appointmentsSource = await createImportedSource(ctx.workspace.id, 'appointments', DataSourceStatus.IMPORTED, 3, 3, 0);
  const clientA = await createClient({ workspaceId: ctx.workspace.id, dataSourceId: appointmentsSource.id, externalId: 'd1', fullName: 'Valid One', email: 'valid1@example.com' });
  const clientB = await createClient({ workspaceId: ctx.workspace.id, dataSourceId: appointmentsSource.id, externalId: 'd2', fullName: 'Canceled One', email: 'cancel1@example.com' });
  const clientC = await createClient({ workspaceId: ctx.workspace.id, dataSourceId: appointmentsSource.id, externalId: 'd3', fullName: 'No Show One', email: 'no1@example.com' });
  await createAppointment({ workspaceId: ctx.workspace.id, clientId: clientA.id, dataSourceId: appointmentsSource.id, externalId: 'v-1', status: AppointmentStatus.SCHEDULED, estimatedRevenue: null });
  await createAppointment({ workspaceId: ctx.workspace.id, clientId: clientB.id, dataSourceId: appointmentsSource.id, externalId: 'v-2', status: AppointmentStatus.CANCELED, estimatedRevenue: new Prisma.Decimal(900) });
  await createAppointment({ workspaceId: ctx.workspace.id, clientId: clientC.id, dataSourceId: appointmentsSource.id, externalId: 'v-3', status: AppointmentStatus.NO_SHOW, estimatedRevenue: new Prisma.Decimal(700) });

  const overview = await getDashboardOverview(ctx.workspace.id, 400);
  const proof = await getBookedProofRead(ctx.workspace.id);

  return {
    status:
      proof.visibleBookedAppointments === 1 &&
      overview.bookedAppointments === 1 &&
      overview.estimatedImportedRevenue === 400
        ? 'PASS'
        : 'FAIL',
    observed: {
      bookedAppointments: overview.bookedAppointments,
      canceledAppointments: overview.canceledAppointments,
      proofVisibleCount: proof.visibleBookedAppointments,
      revenue: overview.estimatedImportedRevenue,
    },
    expected: {
      bookedAppointments: 1,
      revenue: 400,
    },
    impact: 'critical',
    files: [
      'services/proof/get-booked-proof-read.ts',
      'services/dashboard/get-dashboard-overview.ts',
    ],
  };
});

await runScenario('7. Channel/default honesty', async () => {
  const earlyCtx = await createScenarioWorkspace({
    name: 'Smoke Scenario 7 Early',
    workspaceStatus: WorkspaceStatus.DRAFT,
    activation: {
      currentStep: 'template',
      isCompleted: false,
      primaryChannel: CommunicationChannel.EMAIL,
    },
  });
  const earlyState = getSetupBookingPathState(earlyCtx.activationSetup);
  const channelRead = buildActivationStepRead({
    averageDealValue: null,
    primaryChannel: CommunicationChannel.EMAIL,
    recommendedModeKey: FlowModeKey.MODE_A,
    selectedDataSourceType: DataSourceType.APPOINTMENTS_CSV,
    selectedTemplate: 'INJECTABLES',
    stepKey: 'channel',
  });

  return {
    status:
      earlyState.bookingPathLabel === null &&
      earlyState.hasBookingPathConfirmed === false &&
      channelRead.title === 'Email is the recommended default booking path.'
        ? 'PASS'
        : 'FAIL',
    observed: {
      channelReadTitle: channelRead.title,
      hasBookingPathConfirmed: earlyState.hasBookingPathConfirmed,
      setupBookingPathLabel: earlyState.bookingPathLabel,
    },
    expected: {
      channelReadTitle: 'Email is the recommended default booking path.',
      hasBookingPathConfirmed: false,
      setupBookingPathLabel: null,
    },
    impact: 'important',
    files: [
      'src/app/(app)/app/setup/page.tsx',
      'src/app/(app)/app/setup/[step]/page.tsx',
      'services/decision-support/build-activation-step-read.ts',
    ],
  };
});

await runScenario('8. Source step neutro', async () => {
  const sourceRead = buildActivationStepRead({
    averageDealValue: null,
    primaryChannel: CommunicationChannel.EMAIL,
    recommendedModeKey: FlowModeKey.MODE_A,
    selectedDataSourceType: null,
    selectedTemplate: 'INJECTABLES',
    stepKey: 'source',
  });

  return {
    status:
      sourceRead.title === 'Lead entry is still the missing activation choice.' &&
      sourceRead.signals[0]?.value === 'Lead entry next'
        ? 'PASS'
        : 'FAIL',
    observed: {
      signalOne: sourceRead.signals[0],
      title: sourceRead.title,
    },
    expected: {
      signalOneValue: 'Lead entry next',
      title: 'Lead entry is still the missing activation choice.',
    },
    impact: 'important',
    files: [
      'services/decision-support/build-activation-step-read.ts',
      'src/app/(app)/app/setup/[step]/page.tsx',
    ],
  };
});

await runScenario('9. Booking Inputs hero CTA logic', async () => {
  const noProof = getImportsHeroState({ hasBookedProofVisible: false, hasAppointmentsSourceReady: false });
  const sourcePresent = getImportsHeroState({ hasBookedProofVisible: false, hasAppointmentsSourceReady: true });
  const proofLive = getImportsHeroState({ hasBookedProofVisible: true, hasAppointmentsSourceReady: true });

  return {
    status:
      noProof.heroCta.label === 'Start booked proof' &&
      noProof.heroCta.href === '#booking-inputs-flow' &&
      sourcePresent.heroCta.label === 'Review booked proof' &&
      sourcePresent.heroCta.href === '#booking-inputs-flow' &&
      proofLive.heroCta.label === 'Open Revenue View' &&
      proofLive.heroCta.href === '/app/dashboard'
        ? 'PASS'
        : 'FAIL',
    observed: {
      noProof: noProof.heroCta,
      proofLive: proofLive.heroCta,
      sourcePresent: sourcePresent.heroCta,
    },
    expected: {
      noProof: { href: '#booking-inputs-flow', label: 'Start booked proof' },
      proofLive: { href: '/app/dashboard', label: 'Open Revenue View' },
      sourcePresent: { href: '#booking-inputs-flow', label: 'Review booked proof' },
    },
    impact: 'important',
    files: [
      'src/app/(app)/app/imports/page.tsx',
    ],
  };
});

await runScenario('10. Official mapping header order', async () => {
  const headers = getRevoryCsvTemplateColumns('appointments');
  const reordered = [
    headers[5],
    headers[0],
    headers[3],
    headers[1],
    headers[2],
    ...headers.slice(6),
    headers[4],
  ];
  const row = {
    appointment_external_id: 'ord-1',
    client_full_name: 'Ordered Header',
    client_external_id: 'client-ord-1',
    client_email: 'ordered@example.com',
    client_phone: '555-0101',
    scheduled_at: '2026-04-02T14:00:00.000Z',
    status: 'SCHEDULED',
    service_name: 'Consult',
    provider_name: 'Provider',
    estimated_revenue: '350',
    booked_at: '2026-04-01T13:00:00.000Z',
    canceled_at: '',
    location_name: 'Main',
    source_notes: 'note',
  };
  const csv = [
    reordered.join(','),
    reordered.map((header) => row[header] ?? '').join(','),
  ].join('\n');

  const payload = buildAssistedImportPayloadFromCsv('appointments', csv);

  return {
    status: payload.preview.exactTemplateMatch === true ? 'PASS' : 'FAIL',
    observed: {
      exactTemplateMatch: payload.preview.exactTemplateMatch,
      detectedHeaders: payload.preview.detectedHeaders,
    },
    expected: {
      exactTemplateMatch: true,
    },
    impact: 'polish',
    files: [
      'services/imports/build-assisted-import-payload.ts',
    ],
  };
});

const summary = {
  finishedAt: new Date().toISOString(),
  publicEvidence: {
    screenshot: path.join(outDir, 'app-redirect-signin.png'),
  },
  results,
};

fs.writeFileSync(path.join(outDir, 'scenario-results.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));

const user = await prisma.user.findUnique({ where: { email: smokeEmail }, select: { id: true } });
if (user?.id) {
  await cleanupUser(user.id);
}

await prisma.$disconnect();
