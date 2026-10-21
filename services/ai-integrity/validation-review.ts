import "server-only";
import { prisma } from "@/db/prisma";
import { aiDigest } from "@/domain/ai-integrity/reconciliation";
import { AI_REVIEW_MODE, AI_REVIEW_VERSION, parseAiReviewInput, summarizeAiReviews } from "@/domain/ai-integrity/validation-review";
import { isAiIntegrityExperienceEnabled } from "./experience";
import { getAiIntegrityScan } from "./scan";

export async function recordAiValidationReview(workspaceId: string, actorUserId: string, raw: unknown) {
  if (!isAiIntegrityExperienceEnabled()) throw new Error("Synthetic review rehearsal is unavailable.");
  const input = parseAiReviewInput(raw);
  const payloadHash = aiDigest({ workspaceId, actorUserId, input, mode: AI_REVIEW_MODE, version: AI_REVIEW_VERSION });
  // Snapshot lock orders corrections and concurrent idempotent requests without modifying the snapshot.
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM ai_integrity_snapshots WHERE id = ${input.snapshotId} AND "workspaceId" = ${workspaceId} FOR UPDATE`;
    const snapshot = await tx.aiIntegritySnapshot.findFirst({ where: { workspaceId, id: input.snapshotId }, select: { id: true } });
    if (!snapshot) throw new Error("Report is unavailable in this workspace.");
    const existing = await tx.aiIntegrityReviewEvent.findUnique({ where: { workspaceId_requestKey: { workspaceId, requestKey: input.requestKey } } });
    if (existing) {
      if (existing.payloadHash !== payloadHash) throw new Error("Review request key was reused with different content.");
      return { event: existing, replayed: true };
    }
    if (input.kind === "FINDING" && !(await tx.aiIntegrityFinding.findUnique({ where: { workspaceId_snapshotId_fingerprint: { workspaceId, snapshotId: input.snapshotId, fingerprint: input.fingerprint } }, select: { id: true } }))) throw new Error("Finding is unavailable in this report.");
    const previous = await tx.aiIntegrityReviewEvent.aggregate({ where: { workspaceId, snapshotId: input.snapshotId }, _max: { revision: true } });
    const revision = (previous._max.revision ?? 0) + 1;
    if (revision > 2000) throw new Error("Report review event limit reached.");
    const event = await tx.aiIntegrityReviewEvent.create({ data: { workspaceId, actorUserId, snapshotId: input.snapshotId, requestKey: input.requestKey, payloadHash, revision,
      mode: AI_REVIEW_MODE, reviewVersion: AI_REVIEW_VERSION, kind: input.kind, comment: input.comment,
      ...(input.kind === "FINDING" ? { fingerprint: input.fingerprint, disposition: input.disposition, sourceEvidenceChecked: true }
        : { usefulness: input.usefulness, assistanceRequired: input.assistanceRequired, preparationMinutes: input.preparationMinutes }) } });
    await tx.workspaceAuditEvent.create({ data: { workspaceId, actorUserId, action: "AI_INTEGRITY_REHEARSAL_REVIEW_RECORDED", metadataJson: { eventId: event.id, snapshotId: input.snapshotId, revision, kind: input.kind, mode: AI_REVIEW_MODE } } });
    return { event, replayed: false };
  }, { timeout: 15000 });
}

export async function getAiValidationReview(workspaceId: string, snapshotId: string) {
  if (!isAiIntegrityExperienceEnabled()) return null;
  const scan = await getAiIntegrityScan(workspaceId, snapshotId);
  if (!scan) return null;
  const events = await prisma.aiIntegrityReviewEvent.findMany({ where: { workspaceId, snapshotId }, orderBy: { revision: "asc" }, take: 2001 });
  if (events.length > 2000) throw new Error("Report review event limit exceeded.");
  const summary = summarizeAiReviews(scan.result.findings.map((finding) => finding.fingerprint), events);
  return { snapshotId, ruleVersion: scan.snapshot.ruleVersion, reviewVersion: AI_REVIEW_VERSION, summary,
    events: events.map(({ id, revision, kind, fingerprint, disposition, sourceEvidenceChecked, usefulness, assistanceRequired, preparationMinutes, comment, mode, createdAt }) =>
      ({ id, revision, kind, fingerprint, disposition, sourceEvidenceChecked, usefulness, assistanceRequired, preparationMinutes, comment, mode, createdAt: createdAt.toISOString() })) };
}
