import { createHash } from "node:crypto";

import type { CanonicalRecordContract, QuoteRecoveryFindingContract } from "@/domain/revory/contracts";

export type QuoteRecoveryPolicy = { agingDays: number; followUpGraceDays: number; highValueCents: number; lostRecoveryDays: number; staleDays: number };
export const defaultQuoteRecoveryPolicy: QuoteRecoveryPolicy = { agingDays: 30, followUpGraceDays: 1, highValueCents: 10_000_00, lostRecoveryDays: 30, staleDays: 14 };

function daysBetween(now: Date, value: string) { return Math.floor((now.valueOf() - new Date(value).valueOf()) / 86_400_000); }
function openStatus(value: unknown) { return ["open", "sent", "pending", "quoted"].includes(String(value ?? "").toLowerCase()); }
function evidence(record: CanonicalRecordContract, fields: string[]) { return fields.filter((field) => record.payload[field] !== undefined).map((field) => ({ field, value: record.payload[field] as string | number | null, provenance: record.provenance })); }
function fingerprint(workspaceId: string, type: string, estimateExternalId: string) { return createHash("sha256").update(`${workspaceId}|QUOTE_RECOVERY|${type}|${estimateExternalId}`).digest("hex"); }

export function runQuoteRecoveryEngine(input: { workspaceId: string; records: CanonicalRecordContract[]; now?: Date; policy?: QuoteRecoveryPolicy }) {
  if (input.records.some((record) => record.workspaceId !== input.workspaceId)) throw new Error("Cross-workspace records are not eligible for analysis.");
  const now = input.now ?? new Date(), policy = input.policy ?? defaultQuoteRecoveryPolicy;
  const estimates = input.records.filter((record) => record.entityType === "ESTIMATE");
  const activities = input.records.filter((record) => record.entityType === "ACTIVITY");
  const activitiesByEstimate = activities.reduce((index, activity) => {
    const estimateExternalId = activity.relationExternalIds.estimateExternalId;
    if (!estimateExternalId) return index;
    const current = index.get(estimateExternalId) ?? [];
    current.push(activity);
    index.set(estimateExternalId, current);
    return index;
  }, new Map<string, CanonicalRecordContract[]>());
  const findings: QuoteRecoveryFindingContract[] = [];
  const add = (record: CanonicalRecordContract, partial: Omit<QuoteRecoveryFindingContract, "family" | "fingerprint" | "estimateExternalId" | "currency">) => findings.push({ family: "QUOTE_RECOVERY", estimateExternalId: record.externalId, currency: String(record.payload.currency ?? "USD"), fingerprint: fingerprint(input.workspaceId, partial.type, record.externalId), ...partial });
  for (const estimate of estimates) {
    const createdAt = typeof estimate.payload.createdAt === "string" ? estimate.payload.createdAt : null;
    const amountCents = typeof estimate.payload.amountCents === "number" ? estimate.payload.amountCents : null;
    const status = estimate.payload.status;
    const estimateActivities = activitiesByEstimate.get(estimate.externalId) ?? [];
    const latestActivity = [typeof estimate.payload.lastActivityAt === "string" ? estimate.payload.lastActivityAt : null, ...estimateActivities.map((activity) => activity.occurredAt)].filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
    if (!openStatus(status)) {
      const lostAt = typeof estimate.payload.lostAt === "string" ? estimate.payload.lostAt : null;
      if (String(status).toLowerCase() === "lost" && lostAt && amountCents !== null && daysBetween(now, lostAt) <= policy.lostRecoveryDays && estimate.payload.nextStep) add(estimate, { type: "RECOVERABLE_LOST_QUOTE", category: "FINANCIAL", confidence: "MEDIUM", severity: "HIGH", valueBasis: "ESTIMATED", valueCents: amountCents, reason: "Recently lost estimate retains an explicit next step and value.", recommendedAction: "Review the recorded loss reason and next step before attempting recovery.", evidence: evidence(estimate, ["status", "lostAt", "amountCents", "nextStep"]) });
      continue;
    }
    const nextFollowUpAt = typeof estimate.payload.nextFollowUpAt === "string" ? estimate.payload.nextFollowUpAt : null;
    if (nextFollowUpAt && daysBetween(now, nextFollowUpAt) >= policy.followUpGraceDays) add(estimate, { type: "OVERDUE_FOLLOW_UP", category: "FINANCIAL", confidence: "HIGH", severity: amountCents && amountCents >= policy.highValueCents ? "HIGH" : "MEDIUM", valueBasis: amountCents === null ? "OPERATIONAL" : "ESTIMATED", valueCents: amountCents, reason: "The explicit next follow-up date is overdue.", recommendedAction: "Review the estimate and complete or reschedule the next follow-up.", evidence: evidence(estimate, ["status", "nextFollowUpAt", "amountCents"]) });
    if (createdAt && amountCents !== null && amountCents >= policy.highValueCents && daysBetween(now, latestActivity ?? createdAt) >= policy.staleDays) add(estimate, { type: "HIGH_VALUE_STALE_QUOTE", category: "FINANCIAL", confidence: latestActivity ? "HIGH" : "MEDIUM", severity: "HIGH", valueBasis: "ESTIMATED", valueCents: amountCents, reason: "A high-value open estimate has no recent activity.", recommendedAction: "Inspect the latest evidence and decide the next recovery step.", evidence: evidence(estimate, ["status", "amountCents", "createdAt", "lastActivityAt"]) });
    if (createdAt && !latestActivity && daysBetween(now, createdAt) >= policy.staleDays) add(estimate, { type: "OPEN_ESTIMATE_NO_ACTIVITY", category: "OPERATIONAL", confidence: "HIGH", severity: "MEDIUM", valueBasis: "OPERATIONAL", valueCents: null, reason: "The open estimate has no linked activity evidence.", recommendedAction: "Confirm whether activity exists in the source system before prioritizing outreach.", evidence: evidence(estimate, ["status", "createdAt"]) });
    if (createdAt && daysBetween(now, createdAt) >= policy.agingDays) add(estimate, { type: "ESTIMATE_AGING_RISK", category: "FINANCIAL", confidence: "HIGH", severity: daysBetween(now, createdAt) >= 60 ? "HIGH" : "MEDIUM", valueBasis: amountCents === null ? "OPERATIONAL" : "ESTIMATED", valueCents: amountCents, reason: "The open estimate exceeds the configured aging threshold.", recommendedAction: "Review age, value and recent evidence before deciding whether recovery is still viable.", evidence: evidence(estimate, ["status", "createdAt", "amountCents"]) });
    if (!estimate.payload.owner || !estimate.payload.nextStep) add(estimate, { type: "MISSING_OWNER_OR_NEXT_STEP", category: "OPERATIONAL", confidence: "HIGH", severity: "LOW", valueBasis: "OPERATIONAL", valueCents: null, reason: "The estimate is missing an owner or explicit next step.", recommendedAction: "Assign ownership and record the next review step.", evidence: evidence(estimate, ["status", "owner", "nextStep"]) });
  }
  return findings;
}
