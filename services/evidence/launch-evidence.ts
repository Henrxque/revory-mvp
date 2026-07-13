import "server-only";

import type { RevoryEvidenceMetric, RevoryEvidenceSource, RevoryOfferKey } from "@prisma/client";

import { prisma } from "@/db/prisma";

export type EvidenceInput = {
  workspaceId: string;
  metric: RevoryEvidenceMetric;
  source: RevoryEvidenceSource;
  idempotencyKey: string;
  offerKey?: RevoryOfferKey | null;
  booleanValue?: boolean | null;
  integerValue?: number | null;
  amountCents?: number | null;
  currency?: string | null;
  relatedEntityId?: string | null;
  notes?: string | null;
  observedAt?: Date;
};

export async function recordEvidenceEvent(input: EvidenceInput) {
  const populated = [input.booleanValue, input.integerValue, input.amountCents].filter((value) => value !== null && value !== undefined);
  if (populated.length !== 1) throw new Error("Evidence events require exactly one measured value.");
  if (!input.workspaceId.trim() || !input.idempotencyKey.trim()) throw new Error("Workspace and idempotency are required for evidence.");
  return prisma.revoryEvidenceEvent.upsert({
    where: { workspaceId_idempotencyKey: { workspaceId: input.workspaceId, idempotencyKey: input.idempotencyKey } },
    create: { ...input, currency: input.currency?.toUpperCase() ?? null },
    update: {
      amountCents: input.amountCents,
      booleanValue: input.booleanValue,
      currency: input.currency?.toUpperCase() ?? null,
      integerValue: input.integerValue,
      notes: input.notes,
      observedAt: input.observedAt,
      relatedEntityId: input.relatedEntityId,
      source: input.source,
    },
  });
}

export type PackagingDecision = {
  offerKey: RevoryOfferKey;
  decision: "DELAY" | "REPACKAGE" | "RETAIN";
  evidenceCount: number;
  reason: string;
};

type EvidenceLike = {
  metric: RevoryEvidenceMetric;
  offerKey: RevoryOfferKey | null;
  booleanValue: boolean | null;
  integerValue: number | null;
  amountCents: number | null;
};

function booleanRate(events: readonly EvidenceLike[], metric: RevoryEvidenceMetric) {
  const values = events.filter((event) => event.metric === metric && typeof event.booleanValue === "boolean");
  return { count: values.length, rate: values.length ? values.filter((event) => event.booleanValue).length / values.length : null };
}

export function evaluatePackagingEvidence(events: readonly EvidenceLike[]): PackagingDecision[] {
  const decision = (offerKey: RevoryOfferKey, requiredMetric: RevoryEvidenceMetric, threshold: number, minimum = 5): PackagingDecision => {
    const scoped = events.filter((event) => event.offerKey === offerKey);
    const measured = booleanRate(scoped, requiredMetric);
    if (measured.count < minimum) return { offerKey, decision: "DELAY", evidenceCount: measured.count, reason: `Need ${minimum - measured.count} more independent ${requiredMetric.toLowerCase().replaceAll("_", " ")} observations.` };
    if ((measured.rate ?? 0) >= threshold) return { offerKey, decision: "RETAIN", evidenceCount: measured.count, reason: `${Math.round((measured.rate ?? 0) * 100)}% positive evidence clears the predeclared ${Math.round(threshold * 100)}% threshold.` };
    return { offerKey, decision: "REPACKAGE", evidenceCount: measured.count, reason: `${Math.round((measured.rate ?? 0) * 100)}% positive evidence misses the predeclared ${Math.round(threshold * 100)}% threshold; investigate package fit before price changes.` };
  };
  return [
    decision("QUOTE_RECOVERY_AUDIT", "USEFUL_FINDING", 0.6),
    decision("STARTER", "SECOND_READ", 0.5),
    decision("GROWTH", "WEEKLY_DECISION_USEFUL", 0.6),
    decision("PRO", "PLAN_UPGRADE_INTEREST", 0.5),
  ];
}

export async function getWorkspaceLaunchEvidence(workspaceId: string) {
  const events = await prisma.revoryEvidenceEvent.findMany({ where: { workspaceId }, orderBy: { observedAt: "desc" } });
  return { decisions: evaluatePackagingEvidence(events), events };
}
