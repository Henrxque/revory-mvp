import "server-only";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";
import type { CanonicalRecordContract } from "@/domain/revory/contracts";
import { runQuoteRecoveryEngine } from "@/services/quote-recovery/engine";

export async function syncQuoteRecoveryFindings(input: { workspaceId: string; records: CanonicalRecordContract[]; now?: Date }) {
  const findings = runQuoteRecoveryEngine(input);
  return prisma.$transaction(async (tx) => {
    const fingerprints = findings.map((finding) => finding.fingerprint);
    for (const finding of findings) {
      const existing = await tx.quoteRecoveryFinding.findUnique({ where: { workspaceId_fingerprint: { workspaceId: input.workspaceId, fingerprint: finding.fingerprint } } });
      await tx.quoteRecoveryFinding.upsert({
        where: { workspaceId_fingerprint: { workspaceId: input.workspaceId, fingerprint: finding.fingerprint } },
        create: { workspaceId: input.workspaceId, findingType: finding.type, severity: finding.severity, confidence: finding.confidence, valueBasis: finding.valueBasis, valueCents: finding.valueCents, currency: finding.currency, estimateExternalId: finding.estimateExternalId, fingerprint: finding.fingerprint, reason: finding.reason, recommendedAction: finding.recommendedAction, evidenceJson: finding.evidence as Prisma.InputJsonValue, lastSeenAt: input.now ?? new Date() },
        update: { severity: finding.severity, confidence: finding.confidence, valueBasis: finding.valueBasis, valueCents: finding.valueCents, reason: finding.reason, recommendedAction: finding.recommendedAction, evidenceJson: finding.evidence as Prisma.InputJsonValue, lastSeenAt: input.now ?? new Date(), ...(existing?.status === "RESOLVED" || existing?.status === "DISMISSED" ? {} : { status: "OPEN" }) },
      });
    }
    await tx.quoteRecoveryFinding.updateMany({ where: { workspaceId: input.workspaceId, status: { in: ["OPEN", "ACKNOWLEDGED"] }, ...(fingerprints.length ? { fingerprint: { notIn: fingerprints } } : {}) }, data: { status: "RESOLVED", resolvedAt: input.now ?? new Date() } });
    return { activeCount: findings.length, findings };
  });
}

export async function syncQuoteRecoveryFindingsForWorkspace(workspaceId: string, now?: Date) {
  const rows = await prisma.canonicalRecord.findMany({ where: { workspaceId } });
  const records: CanonicalRecordContract[] = rows.map((row) => ({
    workspaceId: row.workspaceId,
    entityType: row.entityType,
    sourceSystem: row.sourceSystem,
    externalId: row.externalId,
    relationExternalIds: row.relationExternalIdsJson as Record<string, string>,
    provenance: row.provenanceJson as CanonicalRecordContract["provenance"],
    payload: row.payloadJson as CanonicalRecordContract["payload"],
    occurredAt: row.occurredAt?.toISOString() ?? null,
  }));
  return syncQuoteRecoveryFindings({ workspaceId, records, now });
}
