import "server-only";

import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";
import {
  buildGuardedSegmentation,
  buildWeeklyManagementDecision,
  type GuardedSegmentation,
  type SegmentFinding,
} from "@/domain/revory/growth-intelligence";
import { getRevenueRealizationRecords } from "@/services/revenue-realization/get-revenue-realization-read";
import { summarizeRevenueRealizationFindings } from "@/services/revenue-realization/finding-engine";

function stableFingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function buildCurrentGrowthIntelligence(workspaceId: string) {
  if (!workspaceId.trim()) throw new Error("Workspace authorization is required.");
  const [records, quoteFindings, realizationFindings, latestImport] = await Promise.all([
    getRevenueRealizationRecords(workspaceId),
    prisma.quoteRecoveryFinding.findMany({
      orderBy: [{ fingerprint: "asc" }],
      where: { workspaceId, status: { in: ["OPEN", "ACKNOWLEDGED"] } },
    }),
    prisma.revenueRealizationFinding.findMany({
      orderBy: [{ fingerprint: "asc" }],
      where: { workspaceId, status: { in: ["OPEN", "ACKNOWLEDGED"] } },
    }),
    prisma.canonicalImportSession.findFirst({
      orderBy: { committedAt: "desc" },
      where: { workspaceId, status: "COMMITTED" },
    }),
  ]);
  const quoteSegmentFindings: SegmentFinding[] = quoteFindings.map((finding) => ({
    additive: true,
    currency: finding.currency,
    recordExternalId: finding.estimateExternalId,
    valueBasis: finding.valueBasis,
    valueCents: finding.valueCents,
  }));
  const realizationSegmentFindings: SegmentFinding[] = realizationFindings.map((finding) => ({
    additive: finding.additiveToExecutiveGap,
    currency: finding.currency,
    recordExternalId: finding.jobExternalId,
    valueBasis: finding.valueBasis,
    valueCents: finding.valueCents,
  }));
  const segmentation = buildGuardedSegmentation({
    quoteFindings: quoteSegmentFindings,
    realizationFindings: realizationSegmentFindings,
    records,
  });
  const realizationSummary = summarizeRevenueRealizationFindings(realizationFindings.map((finding) => ({
    additiveToExecutiveGap: finding.additiveToExecutiveGap,
    category: finding.category,
    currency: finding.currency,
    type: finding.findingType,
    valueCents: finding.valueCents,
  })));
  const quoteEstimatedValueCents = [...quoteFindings.reduce((byEstimate, finding) => {
    if (finding.valueBasis !== "ESTIMATED") return byEstimate;
    const current = byEstimate.get(finding.estimateExternalId) ?? 0;
    byEstimate.set(finding.estimateExternalId, Math.max(current, finding.valueCents ?? 0));
    return byEstimate;
  }, new Map<string, number>()).values()].reduce((total, value) => total + value, 0);
  return {
    decision: buildWeeklyManagementDecision(segmentation),
    latestImport,
    quoteEstimatedValueCents,
    quoteFindings,
    realizationFindings,
    realizationSummary,
    segmentation,
  };
}

export async function captureGrowthIntelligenceSnapshot(workspaceId: string) {
  const current = await buildCurrentGrowthIntelligence(workspaceId);
  const stateFingerprint = stableFingerprint({
    importSessionId: current.latestImport?.id ?? null,
    quote: current.quoteFindings.map((finding) => [finding.fingerprint, finding.severity, finding.valueCents, finding.status]),
    realization: current.realizationFindings.map((finding) => [finding.fingerprint, finding.priority, finding.valueCents, finding.status]),
  });
  return prisma.revenueIntelligenceSnapshot.upsert({
    create: {
      approvedChangeReviewCents: current.realizationSummary.approvedChangeOrderReviewCents,
      calculatedBillingGapCents: current.realizationSummary.calculatedUnderbillingCents,
      currency: current.realizationSummary.currency,
      importSessionId: current.latestImport?.id,
      marginAtRiskCents: current.realizationSummary.marginAtRiskCents,
      operationalCount: current.realizationSummary.operationalCount,
      quoteEstimatedValueCents: current.quoteEstimatedValueCents,
      quoteFindingSnapshotJson: current.quoteFindings as unknown as Prisma.InputJsonValue,
      realizationFindingSnapshotJson: current.realizationFindings as unknown as Prisma.InputJsonValue,
      segmentSnapshotJson: current.segmentation as unknown as Prisma.InputJsonValue,
      stateFingerprint,
      workspaceId,
    },
    update: {},
    where: { workspaceId_stateFingerprint: { stateFingerprint, workspaceId } },
  });
}

export async function getGrowthIntelligenceHistory(workspaceId: string) {
  const since = new Date();
  since.setUTCFullYear(since.getUTCFullYear() - 1);
  const [current, snapshots] = await Promise.all([
    buildCurrentGrowthIntelligence(workspaceId),
    prisma.revenueIntelligenceSnapshot.findMany({
      orderBy: { createdAt: "asc" },
      where: { workspaceId, createdAt: { gte: since } },
    }),
  ]);
  return { current, snapshots };
}

export function readSegmentationSnapshot(value: unknown): GuardedSegmentation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<GuardedSegmentation>;
  return Array.isArray(candidate.segments) && typeof candidate.minimumRecords === "number" && typeof candidate.minimumFindingRecords === "number"
    ? candidate as GuardedSegmentation
    : null;
}
