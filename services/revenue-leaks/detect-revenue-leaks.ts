import "server-only";

import {
  AppointmentStatus,
  DataSourceStatus,
  DataSourceType,
  LeadBookingOpportunityStatus,
  type Prisma,
  type RevenueLeakType,
} from "@prisma/client";

import { prisma } from "@/db/prisma";
import { buildRevenueLeakEvidence, formatRevenueLeakValueBasis } from "@/services/revenue-leaks/leak-evidence";
import { estimateLeakValueCents } from "@/services/revenue-leaks/leak-estimation";
import { calculateLeakConfidence } from "@/services/revenue-leaks/leak-confidence";
import { buildRevenueLeakFingerprint } from "@/services/revenue-leaks/leak-fingerprint";
import { calculateLeakSeverity } from "@/services/revenue-leaks/leak-severity";
import type { RevenueLeakCreateInput } from "@/types/revenue-leak";

const DEFAULT_STALE_THRESHOLD_DAYS = 7;
const DAY_MS = 1000 * 60 * 60 * 24;

type DetectRevenueLeaksOptions = {
  now?: Date;
  staleThresholdDays?: number;
};

export async function detectRevenueLeaksForWorkspace(
  workspaceId: string,
  options: DetectRevenueLeaksOptions = {},
): Promise<RevenueLeakCreateInput[]> {
  const detectors = await Promise.all([
    detectNoShowRevenueLeaks(workspaceId, options),
    detectCanceledNotRecoveredLeaks(workspaceId, options),
    detectMissingContactRisks(workspaceId, options),
    detectBookingPathBlockedRisks(workspaceId, options),
    detectStaleBookedProofRisks(workspaceId, options),
  ]);

  return detectors.flat().sort((left, right) =>
    left.fingerprint.localeCompare(right.fingerprint),
  );
}

export async function detectNoShowRevenueLeaks(
  workspaceId: string,
  options: DetectRevenueLeaksOptions = {},
): Promise<RevenueLeakCreateInput[]> {
  const leakType = "NO_SHOW_REVENUE" satisfies RevenueLeakType;
  const detectedAt = options.now ?? new Date();
  const [activationSetup, appointments] = await Promise.all([
    getActivationValue(workspaceId),
    prisma.appointment.findMany({
      orderBy: {
        scheduledAt: "desc",
      },
      select: appointmentLeakSelect,
      where: {
        status: AppointmentStatus.NO_SHOW,
        workspaceId,
      },
    }),
  ]);

  return appointments.flatMap((appointment) => {
    const fingerprint = buildRevenueLeakFingerprint({
      appointmentId: appointment.id,
      leakType,
      workspaceId,
    });

    if (!fingerprint) {
      return [];
    }

    return [
      buildAppointmentLeakCandidate({
        appointment,
        averageDealValue: activationSetup?.averageDealValue ?? null,
        confidenceReason:
          "Appointment status is NO_SHOW in imported appointment evidence.",
        detectedAt,
        fingerprint,
        leakType,
        reason:
          "A no-show appointment is visible in structured appointment evidence.",
        recommendedAction:
          "Review whether this no-show was recovered before treating the estimate as active revenue at risk.",
        signal: "appointment_status:no_show",
        summary:
          "A no-show appointment may place estimated appointment value at risk.",
        workspaceId,
      }),
    ];
  });
}

export async function detectCanceledNotRecoveredLeaks(
  workspaceId: string,
  options: DetectRevenueLeaksOptions = {},
): Promise<RevenueLeakCreateInput[]> {
  const leakType = "CANCELED_NOT_RECOVERED" satisfies RevenueLeakType;
  const detectedAt = options.now ?? new Date();
  const [activationSetup, canceledAppointments] = await Promise.all([
    getActivationValue(workspaceId),
    prisma.appointment.findMany({
      orderBy: {
        scheduledAt: "desc",
      },
      select: appointmentLeakSelect,
      where: {
        status: AppointmentStatus.CANCELED,
        workspaceId,
      },
    }),
  ]);
  const clientIds = [...new Set(canceledAppointments.map((item) => item.clientId))];
  const replacementAppointments =
    clientIds.length === 0
      ? []
      : await prisma.appointment.findMany({
          orderBy: {
            scheduledAt: "asc",
          },
          select: {
            clientId: true,
            id: true,
            scheduledAt: true,
            status: true,
          },
          where: {
            clientId: {
              in: clientIds,
            },
            status: {
              in: [AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED],
            },
            workspaceId,
          },
        });

  return canceledAppointments.flatMap((appointment) => {
    const recoveryAnchor = appointment.canceledAt ?? appointment.scheduledAt;
    const replacementBookingEvidenceFound = replacementAppointments.some(
      (replacement) =>
        replacement.clientId === appointment.clientId &&
        replacement.id !== appointment.id &&
        replacement.scheduledAt > recoveryAnchor,
    );

    if (replacementBookingEvidenceFound) {
      return [];
    }

    const fingerprint = buildRevenueLeakFingerprint({
      appointmentId: appointment.id,
      leakType,
      workspaceId,
    });

    if (!fingerprint) {
      return [];
    }

    return [
      buildAppointmentLeakCandidate({
        appointment,
        averageDealValue: activationSetup?.averageDealValue ?? null,
        confidenceReason:
          "Appointment is canceled and no later same-client scheduled/completed appointment is visible.",
        detectedAt,
        fingerprint,
        leakType,
        reason:
          "A canceled appointment has no later same-client replacement booking evidence in the current data.",
        recommendedAction:
          "Confirm whether this cancellation was rebooked before treating it as unrecovered revenue at risk.",
        signal: "appointment_status:canceled_not_recovered",
        summary:
          "A canceled appointment appears unrecovered based on later same-client booking evidence.",
        workspaceId,
      }),
    ];
  });
}

export async function detectMissingContactRisks(
  workspaceId: string,
  options: DetectRevenueLeaksOptions = {},
): Promise<RevenueLeakCreateInput[]> {
  const leakType = "MISSING_CONTACT" satisfies RevenueLeakType;
  const detectedAt = options.now ?? new Date();
  const opportunities = await prisma.leadBookingOpportunity.findMany({
    include: {
      client: {
        select: {
          email: true,
          id: true,
          phone: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    where: {
      blockingReason: "missing_contact",
      status: LeadBookingOpportunityStatus.BLOCKED,
      workspaceId,
    },
  });

  return opportunities.flatMap((opportunity) => {
    if (opportunity.client.email || opportunity.client.phone) {
      return [];
    }

    return buildLeadOpportunityRiskCandidate({
      clientId: opportunity.clientId,
      detectedAt,
      fingerprint: buildRevenueLeakFingerprint({
        leadBookingOpportunityId: opportunity.id,
        leakType,
        workspaceId,
      }),
      intakeDataSourceId: opportunity.intakeDataSourceId,
      leakType,
      opportunityId: opportunity.id,
      reason:
        "A booking opportunity is blocked because no usable email or phone is visible.",
      recommendedAction:
        "Add a usable contact method before treating this operational risk as actionable.",
      signal: "lead_booking:blocking_reason:missing_contact",
      summary:
        "A blocked booking opportunity has no usable contact evidence.",
      workspaceId,
    });
  });
}

export async function detectBookingPathBlockedRisks(
  workspaceId: string,
  options: DetectRevenueLeaksOptions = {},
): Promise<RevenueLeakCreateInput[]> {
  const leakType = "BOOKING_PATH_BLOCKED" satisfies RevenueLeakType;
  const detectedAt = options.now ?? new Date();
  const opportunities = await prisma.leadBookingOpportunity.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    where: {
      blockingReason: "missing_booking_path",
      status: LeadBookingOpportunityStatus.BLOCKED,
      workspaceId,
    },
  });

  return opportunities.flatMap((opportunity) =>
    buildLeadOpportunityRiskCandidate({
      clientId: opportunity.clientId,
      detectedAt,
      fingerprint: buildRevenueLeakFingerprint({
        leadBookingOpportunityId: opportunity.id,
        leakType,
        workspaceId,
      }),
      intakeDataSourceId: opportunity.intakeDataSourceId,
      leakType,
      opportunityId: opportunity.id,
      reason:
        "A booking opportunity is blocked because the booking path is incomplete.",
      recommendedAction:
        "Lock the intended booking path before using this opportunity for bounded action guidance.",
      signal: "lead_booking:blocking_reason:missing_booking_path",
      summary:
        "A blocked booking opportunity is missing the booking path required for action.",
      workspaceId,
    }),
  );
}

export async function detectStaleBookedProofRisks(
  workspaceId: string,
  options: DetectRevenueLeaksOptions = {},
): Promise<RevenueLeakCreateInput[]> {
  const leakType = "STALE_BOOKED_PROOF" satisfies RevenueLeakType;
  const detectedAt = options.now ?? new Date();
  const staleThresholdDays =
    options.staleThresholdDays ?? DEFAULT_STALE_THRESHOLD_DAYS;
  const sources = await prisma.dataSource.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    where: {
      type: DataSourceType.APPOINTMENTS_CSV,
      workspaceId,
    },
  });

  return sources.flatMap((source) => {
    const hasLiveSource =
      source.status === DataSourceStatus.IMPORTED ||
      source.status === DataSourceStatus.CONNECTED ||
      source.lastImportSuccessRowCount > 0;

    if (!hasLiveSource) {
      return [];
    }

    const freshnessDate =
      source.lastImportCompletedAt ?? source.lastImportedAt ?? source.updatedAt;
    const staleAgeDays = Math.floor(
      (detectedAt.getTime() - freshnessDate.getTime()) / DAY_MS,
    );

    if (staleAgeDays < staleThresholdDays) {
      return [];
    }

    const fingerprint = buildRevenueLeakFingerprint({
      dataSourceId: source.id,
      leakType,
      workspaceId,
    });

    if (!fingerprint) {
      return [];
    }

    const valueEstimate = estimateLeakValueCents({ leakType });
    const confidence = calculateLeakConfidence({
      hasLiveSource,
      leakType,
      staleAgeDays,
      valueBasis: valueEstimate.basis,
    });
    const severity = calculateLeakSeverity({
      confidence,
      estimatedValueCents: valueEstimate.estimatedValueCents,
      leakType,
    });

    return [{
      confidence,
      detectedAt,
      estimatedValueCents: valueEstimate.estimatedValueCents,
      evidenceJson: buildRevenueLeakEvidence({
        confidenceReason:
          "Appointment import source is live but older than the stale threshold.",
        signals: [
          "data_source:type:appointments_csv",
          "data_source:freshness:stale",
          `data_source:stale_age_days:${staleAgeDays}`,
        ],
        sourceRecordIds: [source.id],
        summary:
          "Appointment evidence may be stale, so the current revenue read may be outdated.",
        value: {
          contributesToRevenueAtRisk: false,
          staleAgeDays,
          valueBasis: formatRevenueLeakValueBasis(valueEstimate.basis),
        },
      }),
      fingerprint,
      leakType,
      reason:
        "The appointment data source is stale enough to weaken confidence in the current revenue read.",
      recommendedAction:
        "Upload a fresh appointment file before using the read for stronger revenue-risk decisions.",
      severity,
      sourceDataSourceId: source.id,
      sourceName: source.name,
      status: "OPEN",
      workspaceId,
    }];
  });
}

const appointmentLeakSelect = {
  canceledAt: true,
  clientId: true,
  dataSource: {
    select: {
      name: true,
    },
  },
  dataSourceId: true,
  estimatedRevenue: true,
  id: true,
  providerName: true,
  scheduledAt: true,
  serviceName: true,
} as const satisfies Prisma.AppointmentSelect;

type AppointmentRevenueLeakCandidate = Prisma.AppointmentGetPayload<{
  select: typeof appointmentLeakSelect;
}>;

async function getActivationValue(workspaceId: string) {
  return prisma.activationSetup.findUnique({
    select: {
      averageDealValue: true,
    },
    where: {
      workspaceId,
    },
  });
}

function buildAppointmentLeakCandidate(input: {
  appointment: AppointmentRevenueLeakCandidate;
  averageDealValue: { toString(): string } | null;
  confidenceReason: string;
  detectedAt: Date;
  fingerprint: string;
  leakType: Extract<
    RevenueLeakType,
    "CANCELED_NOT_RECOVERED" | "NO_SHOW_REVENUE"
  >;
  reason: string;
  recommendedAction: string;
  signal: string;
  summary: string;
  workspaceId: string;
}): RevenueLeakCreateInput {
  const valueEstimate = estimateLeakValueCents({
    appointmentEstimatedRevenue: input.appointment.estimatedRevenue,
    averageDealValue: input.averageDealValue,
    leakType: input.leakType,
  });
  const confidence = calculateLeakConfidence({
    hasRequiredEvidence: true,
    leakType: input.leakType,
    valueBasis: valueEstimate.basis,
  });
  const severity = calculateLeakSeverity({
    confidence,
    estimatedValueCents: valueEstimate.estimatedValueCents,
    leakType: input.leakType,
  });

  return {
    confidence,
    detectedAt: input.detectedAt,
    estimatedValueCents: valueEstimate.estimatedValueCents,
    evidenceJson: buildRevenueLeakEvidence({
      confidenceReason: input.confidenceReason,
      signals: [
        input.signal,
        `value_basis:${formatRevenueLeakValueBasis(valueEstimate.basis)}`,
      ],
      sourceRecordIds: [input.appointment.id],
      summary: input.summary,
      value: {
        estimatedValueCents: valueEstimate.estimatedValueCents,
        valueBasis: formatRevenueLeakValueBasis(valueEstimate.basis),
      },
    }),
    fingerprint: input.fingerprint,
    leakType: input.leakType,
    providerName: input.appointment.providerName,
    reason: input.reason,
    recommendedAction: input.recommendedAction,
    relatedAppointmentId: input.appointment.id,
    relatedClientId: input.appointment.clientId,
    serviceName: input.appointment.serviceName,
    severity,
    sourceDataSourceId: input.appointment.dataSourceId,
    sourceName: input.appointment.dataSource?.name ?? null,
    sourceWindowEnd: input.appointment.scheduledAt,
    sourceWindowStart: input.appointment.scheduledAt,
    status: "OPEN",
    workspaceId: input.workspaceId,
  };
}

function buildLeadOpportunityRiskCandidate(input: {
  clientId: string;
  detectedAt: Date;
  fingerprint: string | null;
  intakeDataSourceId: string | null;
  leakType: Extract<
    RevenueLeakType,
    "BOOKING_PATH_BLOCKED" | "MISSING_CONTACT"
  >;
  opportunityId: string;
  reason: string;
  recommendedAction: string;
  signal: string;
  summary: string;
  workspaceId: string;
}): RevenueLeakCreateInput[] {
  if (!input.fingerprint) {
    return [];
  }

  const valueEstimate = estimateLeakValueCents({ leakType: input.leakType });
  const confidence = calculateLeakConfidence({
    hasRequiredEvidence: true,
    leakType: input.leakType,
    valueBasis: valueEstimate.basis,
  });
  const severity = calculateLeakSeverity({
    confidence,
    estimatedValueCents: valueEstimate.estimatedValueCents,
    leakType: input.leakType,
  });

  return [{
    confidence,
    detectedAt: input.detectedAt,
    estimatedValueCents: valueEstimate.estimatedValueCents,
    evidenceJson: buildRevenueLeakEvidence({
      confidenceReason:
        "Lead booking opportunity is blocked by deterministic readiness state.",
      signals: [
        input.signal,
        `value_basis:${formatRevenueLeakValueBasis(valueEstimate.basis)}`,
      ],
      sourceRecordIds: [input.opportunityId],
      summary: input.summary,
      value: {
        contributesToRevenueAtRisk: false,
        valueBasis: formatRevenueLeakValueBasis(valueEstimate.basis),
      },
    }),
    fingerprint: input.fingerprint,
    leakType: input.leakType,
    reason: input.reason,
    recommendedAction: input.recommendedAction,
    relatedClientId: input.clientId,
    relatedLeadBookingOpportunityId: input.opportunityId,
    severity,
    sourceDataSourceId: input.intakeDataSourceId,
    status: "OPEN",
    workspaceId: input.workspaceId,
  }];
}
