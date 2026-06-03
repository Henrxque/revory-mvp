import "server-only";

import { Prisma, RevenueLeakStatus } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { detectRevenueLeaksForWorkspace } from "@/services/revenue-leaks/detect-revenue-leaks";
import type { RevenueLeakCreateInput } from "@/types/revenue-leak";

type SyncRevenueLeaksResult = {
  created: number;
  detected: number;
  dismissedOrResolvedPreserved: number;
  unchanged: number;
  updated: number;
};

type ExistingRevenueLeakSnapshot = {
  confidence: string;
  currency: string;
  estimatedValueCents: number | null;
  evidenceJson: Prisma.JsonValue;
  fingerprint: string;
  leakType: string;
  providerName: string | null;
  reason: string;
  recommendedAction: string;
  relatedAppointmentId: string | null;
  relatedClientId: string | null;
  relatedLeadBookingOpportunityId: string | null;
  resolvedAt: Date | null;
  serviceName: string | null;
  severity: string;
  sourceDataSourceId: string | null;
  sourceName: string | null;
  sourceWindowEnd: Date | null;
  sourceWindowStart: Date | null;
  status: RevenueLeakStatus;
};

export async function syncRevenueLeaksForWorkspace(input: {
  now?: Date;
  workspaceId: string;
}): Promise<SyncRevenueLeaksResult> {
  const candidates = await detectRevenueLeaksForWorkspace(input.workspaceId, {
    now: input.now,
  });
  const dedupedCandidates = dedupeCandidates(candidates);

  if (dedupedCandidates.length === 0) {
    return {
      created: 0,
      detected: 0,
      dismissedOrResolvedPreserved: 0,
      unchanged: 0,
      updated: 0,
    };
  }

  const existingLeaks = await prisma.revenueLeak.findMany({
    select: existingRevenueLeakSelect,
    where: {
      fingerprint: {
        in: dedupedCandidates.map((candidate) => candidate.fingerprint),
      },
      workspaceId: input.workspaceId,
    },
  });
  const existingByFingerprint = new Map(
    existingLeaks.map((leak) => [leak.fingerprint, leak]),
  );
  const result: SyncRevenueLeaksResult = {
    created: 0,
    detected: dedupedCandidates.length,
    dismissedOrResolvedPreserved: 0,
    unchanged: 0,
    updated: 0,
  };

  await prisma.$transaction(async (tx) => {
    for (const candidate of dedupedCandidates) {
      const existing = existingByFingerprint.get(candidate.fingerprint);

      if (!existing) {
        await tx.revenueLeak.create({
          data: toRevenueLeakCreateData(candidate),
        });
        result.created += 1;
        continue;
      }

      if (isDismissedOrResolved(existing.status)) {
        result.dismissedOrResolvedPreserved += 1;
        continue;
      }

      const updateData = toRevenueLeakUpdateData(candidate, existing.status);

      if (isUnchanged(existing, updateData)) {
        result.unchanged += 1;
        continue;
      }

      await tx.revenueLeak.update({
        data: updateData,
        where: {
          workspaceId_fingerprint: {
            fingerprint: candidate.fingerprint,
            workspaceId: input.workspaceId,
          },
        },
      });
      result.updated += 1;
    }
  });

  return result;
}

const existingRevenueLeakSelect = {
  confidence: true,
  currency: true,
  estimatedValueCents: true,
  evidenceJson: true,
  fingerprint: true,
  leakType: true,
  providerName: true,
  reason: true,
  recommendedAction: true,
  relatedAppointmentId: true,
  relatedClientId: true,
  relatedLeadBookingOpportunityId: true,
  resolvedAt: true,
  serviceName: true,
  severity: true,
  sourceDataSourceId: true,
  sourceName: true,
  sourceWindowEnd: true,
  sourceWindowStart: true,
  status: true,
} as const satisfies Prisma.RevenueLeakSelect;

function dedupeCandidates(candidates: RevenueLeakCreateInput[]) {
  const byFingerprint = new Map<string, RevenueLeakCreateInput>();

  for (const candidate of candidates) {
    const fingerprint = candidate.fingerprint.trim();

    if (!fingerprint) {
      continue;
    }

    byFingerprint.set(fingerprint, {
      ...candidate,
      fingerprint,
    });
  }

  return [...byFingerprint.values()];
}

function isDismissedOrResolved(status: RevenueLeakStatus) {
  return (
    status === RevenueLeakStatus.DISMISSED ||
    status === RevenueLeakStatus.RESOLVED
  );
}

function toRevenueLeakCreateData(
  candidate: RevenueLeakCreateInput,
): Prisma.RevenueLeakUncheckedCreateInput {
  return {
    confidence: candidate.confidence ?? "MEDIUM",
    currency: candidate.currency ?? "USD",
    detectedAt: candidate.detectedAt ?? new Date(),
    estimatedValueCents: candidate.estimatedValueCents ?? null,
    evidenceJson: candidate.evidenceJson as Prisma.InputJsonValue,
    fingerprint: candidate.fingerprint,
    leakType: candidate.leakType,
    providerName: candidate.providerName ?? null,
    reason: candidate.reason,
    recommendedAction: candidate.recommendedAction,
    relatedAppointmentId: candidate.relatedAppointmentId ?? null,
    relatedClientId: candidate.relatedClientId ?? null,
    relatedLeadBookingOpportunityId:
      candidate.relatedLeadBookingOpportunityId ?? null,
    resolvedAt: candidate.resolvedAt ?? null,
    serviceName: candidate.serviceName ?? null,
    severity: candidate.severity ?? "MEDIUM",
    sourceDataSourceId: candidate.sourceDataSourceId ?? null,
    sourceName: candidate.sourceName ?? null,
    sourceWindowEnd: candidate.sourceWindowEnd ?? null,
    sourceWindowStart: candidate.sourceWindowStart ?? null,
    status: candidate.status ?? "OPEN",
    workspaceId: candidate.workspaceId,
  };
}

function toRevenueLeakUpdateData(
  candidate: RevenueLeakCreateInput,
  existingStatus: RevenueLeakStatus,
): Prisma.RevenueLeakUncheckedUpdateInput {
  return {
    confidence: candidate.confidence ?? "MEDIUM",
    currency: candidate.currency ?? "USD",
    estimatedValueCents: candidate.estimatedValueCents ?? null,
    evidenceJson: candidate.evidenceJson as Prisma.InputJsonValue,
    leakType: candidate.leakType,
    providerName: candidate.providerName ?? null,
    reason: candidate.reason,
    recommendedAction: candidate.recommendedAction,
    relatedAppointmentId: candidate.relatedAppointmentId ?? null,
    relatedClientId: candidate.relatedClientId ?? null,
    relatedLeadBookingOpportunityId:
      candidate.relatedLeadBookingOpportunityId ?? null,
    resolvedAt: candidate.resolvedAt ?? null,
    serviceName: candidate.serviceName ?? null,
    severity: candidate.severity ?? "MEDIUM",
    sourceDataSourceId: candidate.sourceDataSourceId ?? null,
    sourceName: candidate.sourceName ?? null,
    sourceWindowEnd: candidate.sourceWindowEnd ?? null,
    sourceWindowStart: candidate.sourceWindowStart ?? null,
    status:
      existingStatus === RevenueLeakStatus.ACKNOWLEDGED
        ? RevenueLeakStatus.ACKNOWLEDGED
        : candidate.status ?? RevenueLeakStatus.OPEN,
  };
}

function isUnchanged(
  existing: ExistingRevenueLeakSnapshot,
  updateData: Prisma.RevenueLeakUncheckedUpdateInput,
) {
  return (
    existing.confidence === updateData.confidence &&
    existing.currency === updateData.currency &&
    existing.estimatedValueCents === updateData.estimatedValueCents &&
    stableJson(existing.evidenceJson) === stableJson(updateData.evidenceJson) &&
    existing.leakType === updateData.leakType &&
    existing.providerName === updateData.providerName &&
    existing.reason === updateData.reason &&
    existing.recommendedAction === updateData.recommendedAction &&
    existing.relatedAppointmentId === updateData.relatedAppointmentId &&
    existing.relatedClientId === updateData.relatedClientId &&
    existing.relatedLeadBookingOpportunityId ===
      updateData.relatedLeadBookingOpportunityId &&
    dateTimeValue(existing.resolvedAt) === dateTimeValue(updateData.resolvedAt) &&
    existing.serviceName === updateData.serviceName &&
    existing.severity === updateData.severity &&
    existing.sourceDataSourceId === updateData.sourceDataSourceId &&
    existing.sourceName === updateData.sourceName &&
    dateTimeValue(existing.sourceWindowEnd) ===
      dateTimeValue(updateData.sourceWindowEnd) &&
    dateTimeValue(existing.sourceWindowStart) ===
      dateTimeValue(updateData.sourceWindowStart) &&
    existing.status === updateData.status
  );
}

function dateTimeValue(value: unknown) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }

  return null;
}

function stableJson(value: unknown) {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, nestedValue]) => [key, sortJsonValue(nestedValue)]),
    );
  }

  return value;
}
