import { Prisma, PrismaClient } from "@prisma/client";

import { syncRevenueLeaksForWorkspace } from "../services/revenue-leaks/sync-revenue-leaks";

const prisma = new PrismaClient();
const runId = `revenue-leak-engine-${Date.now()}`;
const emailPrefix = "revenue.leak.engine.qa+";
const now = new Date("2026-05-28T12:00:00.000Z");
const staleDate = new Date("2026-05-10T12:00:00.000Z");

let openAiFetchCalls = 0;
const originalFetch = globalThis.fetch;

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input.toString();

  if (url.includes("openai.com")) {
    openAiFetchCalls += 1;
    throw new Error("Unexpected OpenAI call during deterministic leak engine QA.");
  }

  return originalFetch(input, init);
}) as typeof fetch;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function log(message: string) {
  console.log(`[revenue-leak-engine-qa] ${message}`);
}

async function cleanupPreviousRuns() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
    },
    where: {
      email: {
        startsWith: emailPrefix,
      },
    },
  });

  for (const user of users) {
    await prisma.workspace.deleteMany({
      where: {
        ownerUserId: user.id,
      },
    });
    await prisma.user.delete({
      where: {
        id: user.id,
      },
    });
  }
}

async function createWorkspace(input: {
  averageDealValue?: Prisma.Decimal | null;
  suffix: string;
}) {
  const user = await prisma.user.create({
    data: {
      authProvider: "qa",
      authSubject: `${runId}-${input.suffix}`,
      email: `${emailPrefix}${runId}-${input.suffix}@example.com`,
      fullName: "Revenue Leak Engine QA",
    },
  });
  const workspace = await prisma.workspace.create({
    data: {
      billingStatus: "ACTIVE",
      name: `Revenue Leak QA ${input.suffix}`,
      ownerUserId: user.id,
      planKey: "GROWTH",
      slug: `revenue-leak-qa-${runId}-${input.suffix}`,
      status: "ACTIVE",
    },
  });

  await prisma.activationSetup.create({
    data: {
      averageDealValue: input.averageDealValue ?? null,
      currentStep: "activation",
      isCompleted: true,
      primaryChannel: "EMAIL",
      recommendedModeKey: "MODE_A",
      selectedTemplate: "injectables",
      workspaceId: workspace.id,
    },
  });

  return workspace;
}

async function createClient(input: {
  email?: string | null;
  externalId: string;
  fullName: string;
  phone?: string | null;
  workspaceId: string;
}) {
  return prisma.client.create({
    data: {
      email: input.email ?? null,
      externalId: input.externalId,
      fullName: input.fullName,
      hasLeadBaseSupport: true,
      phone: input.phone ?? null,
      workspaceId: input.workspaceId,
    },
  });
}

async function createAppointmentSource(workspaceId: string) {
  return prisma.dataSource.create({
    data: {
      lastImportCompletedAt: staleDate,
      lastImportedAt: staleDate,
      lastImportFileName: "revenue-leak-engine-qa.csv",
      lastImportRowCount: 20,
      lastImportSuccessRowCount: 20,
      name: `appointments-csv-upload-${runId}`,
      status: "IMPORTED",
      type: "APPOINTMENTS_CSV",
      updatedAt: staleDate,
      workspaceId,
    },
  });
}

async function createAppointment(input: {
  canceledAt?: Date | null;
  clientId: string;
  dataSourceId: string;
  estimatedRevenue?: Prisma.Decimal | null;
  externalId: string;
  scheduledAt: Date;
  status: "CANCELED" | "COMPLETED" | "NO_SHOW" | "SCHEDULED";
  workspaceId: string;
}) {
  return prisma.appointment.create({
    data: {
      canceledAt: input.canceledAt ?? null,
      clientId: input.clientId,
      dataSourceId: input.dataSourceId,
      estimatedRevenue: input.estimatedRevenue ?? null,
      externalId: input.externalId,
      scheduledAt: input.scheduledAt,
      serviceName: "QA Injectable",
      status: input.status,
      workspaceId: input.workspaceId,
    },
  });
}

async function createOpportunity(input: {
  blockingReason: string;
  clientId: string;
  workspaceId: string;
}) {
  return prisma.leadBookingOpportunity.create({
    data: {
      blockingReason: input.blockingReason,
      bookingPath: null,
      clientId: input.clientId,
      mainOfferKey: "injectables",
      nextAction:
        input.blockingReason === "missing_contact"
          ? "capture_contact"
          : "set_booking_path",
      status: "BLOCKED",
      workspaceId: input.workspaceId,
    },
  });
}

async function setupMainWorkspace() {
  const workspace = await createWorkspace({
    averageDealValue: new Prisma.Decimal(300),
    suffix: "main",
  });
  const dataSource = await createAppointmentSource(workspace.id);

  const noShowDirectClient = await createClient({
    email: "direct@example.com",
    externalId: "qa-direct",
    fullName: "Direct Value",
    workspaceId: workspace.id,
  });
  const noShowAverageClient = await createClient({
    email: "average@example.com",
    externalId: "qa-average",
    fullName: "Average Value",
    workspaceId: workspace.id,
  });
  const canceledNoRebookingClient = await createClient({
    email: "cancel-no-rebook@example.com",
    externalId: "qa-cancel-no-rebook",
    fullName: "Cancel No Rebook",
    workspaceId: workspace.id,
  });
  const canceledWithRebookingClient = await createClient({
    email: "cancel-rebook@example.com",
    externalId: "qa-cancel-rebook",
    fullName: "Cancel Rebook",
    workspaceId: workspace.id,
  });
  const missingContactClient = await createClient({
    email: null,
    externalId: "qa-missing-contact",
    fullName: "Missing Contact",
    phone: null,
    workspaceId: workspace.id,
  });
  const blockedPathClient = await createClient({
    email: "blocked-path@example.com",
    externalId: "qa-blocked-path",
    fullName: "Blocked Path",
    workspaceId: workspace.id,
  });

  const noShowDirect = await createAppointment({
    clientId: noShowDirectClient.id,
    dataSourceId: dataSource.id,
    estimatedRevenue: new Prisma.Decimal(650),
    externalId: "qa-no-show-direct",
    scheduledAt: new Date("2026-05-01T12:00:00.000Z"),
    status: "NO_SHOW",
    workspaceId: workspace.id,
  });
  const noShowAverage = await createAppointment({
    clientId: noShowAverageClient.id,
    dataSourceId: dataSource.id,
    estimatedRevenue: null,
    externalId: "qa-no-show-average",
    scheduledAt: new Date("2026-05-02T12:00:00.000Z"),
    status: "NO_SHOW",
    workspaceId: workspace.id,
  });
  const canceledNoRebooking = await createAppointment({
    canceledAt: new Date("2026-05-03T12:00:00.000Z"),
    clientId: canceledNoRebookingClient.id,
    dataSourceId: dataSource.id,
    estimatedRevenue: new Prisma.Decimal(500),
    externalId: "qa-canceled-no-rebook",
    scheduledAt: new Date("2026-05-03T12:00:00.000Z"),
    status: "CANCELED",
    workspaceId: workspace.id,
  });
  const canceledWithRebooking = await createAppointment({
    canceledAt: new Date("2026-05-04T12:00:00.000Z"),
    clientId: canceledWithRebookingClient.id,
    dataSourceId: dataSource.id,
    estimatedRevenue: new Prisma.Decimal(500),
    externalId: "qa-canceled-rebook",
    scheduledAt: new Date("2026-05-04T12:00:00.000Z"),
    status: "CANCELED",
    workspaceId: workspace.id,
  });

  await createAppointment({
    clientId: canceledWithRebookingClient.id,
    dataSourceId: dataSource.id,
    estimatedRevenue: new Prisma.Decimal(500),
    externalId: "qa-rebooking",
    scheduledAt: new Date("2026-05-06T12:00:00.000Z"),
    status: "SCHEDULED",
    workspaceId: workspace.id,
  });

  const missingContactOpportunity = await createOpportunity({
    blockingReason: "missing_contact",
    clientId: missingContactClient.id,
    workspaceId: workspace.id,
  });
  const blockedPathOpportunity = await createOpportunity({
    blockingReason: "missing_booking_path",
    clientId: blockedPathClient.id,
    workspaceId: workspace.id,
  });

  return {
    blockedPathOpportunity,
    canceledNoRebooking,
    canceledWithRebooking,
    dataSource,
    missingContactOpportunity,
    noShowAverage,
    noShowDirect,
    workspace,
  };
}

async function setupNoValueWorkspace() {
  const workspace = await createWorkspace({
    averageDealValue: null,
    suffix: "no-value",
  });
  const dataSource = await createAppointmentSource(workspace.id);
  const client = await createClient({
    email: "novalue@example.com",
    externalId: "qa-no-value",
    fullName: "No Value",
    workspaceId: workspace.id,
  });
  const noShowNoValue = await createAppointment({
    clientId: client.id,
    dataSourceId: dataSource.id,
    estimatedRevenue: null,
    externalId: "qa-no-show-no-value",
    scheduledAt: new Date("2026-05-05T12:00:00.000Z"),
    status: "NO_SHOW",
    workspaceId: workspace.id,
  });

  return {
    noShowNoValue,
    workspace,
  };
}

async function main() {
  log("Cleaning previous QA runs");
  await cleanupPreviousRuns();

  log("Creating deterministic leak engine fixtures");
  const mainWorkspace = await setupMainWorkspace();
  const noValueWorkspace = await setupNoValueWorkspace();

  log("Running first sync");
  const firstSync = await syncRevenueLeaksForWorkspace({
    now,
    workspaceId: mainWorkspace.workspace.id,
  });
  const leaks = await prisma.revenueLeak.findMany({
    where: {
      workspaceId: mainWorkspace.workspace.id,
    },
  });

  assert(firstSync.created === leaks.length, "First sync should create all detected leaks.");
  assert(firstSync.detected === 6, `Expected 6 detected leaks, got ${firstSync.detected}.`);

  const noShowDirect = findLeak(leaks, `no_show_revenue:${mainWorkspace.workspace.id}:${mainWorkspace.noShowDirect.id}`);
  assert(noShowDirect.estimatedValueCents === 65000, "Direct no-show should use appointment estimatedRevenue.");
  assert(noShowDirect.confidence === "HIGH", "Direct no-show should have HIGH confidence.");

  const noShowAverage = findLeak(leaks, `no_show_revenue:${mainWorkspace.workspace.id}:${mainWorkspace.noShowAverage.id}`);
  assert(noShowAverage.estimatedValueCents === 30000, "No-show without appointment value should use averageDealValue.");
  assert(noShowAverage.confidence === "MEDIUM", "Average value no-show should have MEDIUM confidence.");

  const canceledNoRebooking = findLeak(leaks, `canceled_not_recovered:${mainWorkspace.workspace.id}:${mainWorkspace.canceledNoRebooking.id}`);
  assert(canceledNoRebooking.leakType === "CANCELED_NOT_RECOVERED", "Canceled without rebooking should create a leak.");

  const canceledWithRebookingFingerprint = `canceled_not_recovered:${mainWorkspace.workspace.id}:${mainWorkspace.canceledWithRebooking.id}`;
  assert(
    !leaks.some((leak) => leak.fingerprint === canceledWithRebookingFingerprint),
    "Canceled with future rebooking should not create a leak.",
  );

  const missingContact = findLeak(leaks, `missing_contact:${mainWorkspace.workspace.id}:${mainWorkspace.missingContactOpportunity.id}`);
  assert(missingContact.estimatedValueCents === null, "Missing contact should not receive estimated value.");
  assert(missingContact.leakType === "MISSING_CONTACT", "Missing contact should create operational risk.");

  const bookingPathBlocked = findLeak(leaks, `booking_path_blocked:${mainWorkspace.workspace.id}:${mainWorkspace.blockedPathOpportunity.id}`);
  assert(bookingPathBlocked.estimatedValueCents === null, "Booking path blocked should not receive estimated value.");
  assert(bookingPathBlocked.leakType === "BOOKING_PATH_BLOCKED", "Booking path blocked should create operational risk.");

  const staleSource = findLeak(leaks, `stale_booked_proof:${mainWorkspace.workspace.id}:${mainWorkspace.dataSource.id}`);
  assert(staleSource.estimatedValueCents === null, "Stale data risk should not receive estimated value.");
  assert(staleSource.leakType === "STALE_BOOKED_PROOF", "Stale data source should create data quality risk.");

  for (const leak of leaks) {
    assert(leak.fingerprint.length > 0, "Every leak should have fingerprint.");
    assert(leak.evidenceJson !== null, "Every leak should have evidenceJson.");
  }

  log("Running second sync for idempotency");
  const secondSync = await syncRevenueLeaksForWorkspace({
    now,
    workspaceId: mainWorkspace.workspace.id,
  });
  const leakCountAfterSecondSync = await prisma.revenueLeak.count({
    where: {
      workspaceId: mainWorkspace.workspace.id,
    },
  });
  assert(secondSync.created === 0, "Second sync should not create duplicate leaks.");
  assert(leakCountAfterSecondSync === leaks.length, "Second sync should preserve leak count.");

  log("Validating no-value financial leak behavior");
  await syncRevenueLeaksForWorkspace({
    now,
    workspaceId: noValueWorkspace.workspace.id,
  });
  const noValueLeak = await prisma.revenueLeak.findUniqueOrThrow({
    where: {
      workspaceId_fingerprint: {
        fingerprint: `no_show_revenue:${noValueWorkspace.workspace.id}:${noValueWorkspace.noShowNoValue.id}`,
        workspaceId: noValueWorkspace.workspace.id,
      },
    },
  });
  assert(noValueLeak.estimatedValueCents === null, "No-value no-show should not invent estimated value.");
  assert(noValueLeak.confidence === "LOW", "No-value no-show should have LOW confidence.");

  log("Validating resolved/dismissed preservation");
  await prisma.revenueLeak.update({
    data: {
      status: "RESOLVED",
    },
    where: {
      id: noShowDirect.id,
    },
  });
  await prisma.revenueLeak.update({
    data: {
      status: "DISMISSED",
    },
    where: {
      id: noShowAverage.id,
    },
  });
  const preservedSync = await syncRevenueLeaksForWorkspace({
    now,
    workspaceId: mainWorkspace.workspace.id,
  });
  const preservedLeaks = await prisma.revenueLeak.findMany({
    where: {
      id: {
        in: [noShowDirect.id, noShowAverage.id],
      },
    },
  });
  assert(
    preservedSync.dismissedOrResolvedPreserved >= 2,
    "Sync should preserve resolved/dismissed leaks.",
  );
  assert(
    preservedLeaks.some((leak) => leak.status === "RESOLVED"),
    "Resolved leak should stay resolved.",
  );
  assert(
    preservedLeaks.some((leak) => leak.status === "DISMISSED"),
    "Dismissed leak should stay dismissed.",
  );

  assert(openAiFetchCalls === 0, "Leak engine QA should not make OpenAI calls.");

  log("All checks passed");
}

function findLeak<TLeak extends { fingerprint: string }>(
  leaks: TLeak[],
  fingerprint: string,
) {
  const leak = leaks.find((item) => item.fingerprint === fingerprint);

  assert(leak, `Expected leak with fingerprint ${fingerprint}`);

  return leak;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    globalThis.fetch = originalFetch;
    await cleanupPreviousRuns().catch(() => undefined);
    await prisma.$disconnect();
  });
