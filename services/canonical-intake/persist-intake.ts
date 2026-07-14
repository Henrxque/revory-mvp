import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";
import type { CanonicalRecordContract } from "@/domain/revory/contracts";
import type { IntakePlan } from "@/services/canonical-intake/secure-intake";
import { runQuoteRecoveryEngine } from "@/services/quote-recovery/engine";

function toCanonicalContract(row: {
  entityType: CanonicalRecordContract["entityType"];
  externalId: string;
  occurredAt: Date | null;
  payloadJson: Prisma.JsonValue;
  provenanceJson: Prisma.JsonValue;
  relationExternalIdsJson: Prisma.JsonValue;
  sourceSystem: string;
  workspaceId: string;
}): CanonicalRecordContract {
  return {
    workspaceId: row.workspaceId,
    entityType: row.entityType,
    sourceSystem: row.sourceSystem,
    externalId: row.externalId,
    relationExternalIds: row.relationExternalIdsJson as Record<string, string>,
    provenance: row.provenanceJson as CanonicalRecordContract["provenance"],
    payload: row.payloadJson as CanonicalRecordContract["payload"],
    occurredAt: row.occurredAt?.toISOString() ?? null,
  };
}

export async function persistSecureIntakePlan(input: { workspaceId: string; plan: IntakePlan; snapshotMode: "FULL_REPLACEMENT" }) {
  if (!input.plan.accepted || input.plan.records.some((record) => record.workspaceId !== input.workspaceId)) {
    throw new Error("Only an accepted, workspace-scoped intake plan can be committed.");
  }
  if (input.snapshotMode !== "FULL_REPLACEMENT") throw new Error("Explicit full-snapshot confirmation is required.");

  return prisma.$transaction(async (tx) => {
    const lockedWorkspace = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "workspaces" WHERE "id" = ${input.workspaceId} FOR UPDATE
    `;
    if (lockedWorkspace.length !== 1) throw new Error("Canonical import workspace was not found.");
    const existing = await tx.canonicalImportSession.findUnique({
      where: { workspaceId_idempotencyKey: { workspaceId: input.workspaceId, idempotencyKey: input.plan.idempotencyKey } },
      include: { records: true },
    });
    if (existing?.status === "COMMITTED") return { created: false, session: existing };

    const session = await tx.canonicalImportSession.upsert({
      where: { workspaceId_idempotencyKey: { workspaceId: input.workspaceId, idempotencyKey: input.plan.idempotencyKey } },
      create: { workspaceId: input.workspaceId, idempotencyKey: input.plan.idempotencyKey, status: "READY", sourceFileNamesJson: Object.keys(input.plan.mappings), mappingJson: input.plan.mappings as Prisma.InputJsonValue, dataQualityJson: { issues: input.plan.issues, linkCoverage: input.plan.linkCoverage } as Prisma.InputJsonValue, eligibilityJson: input.plan.eligibility as Prisma.InputJsonValue, rowCount: input.plan.records.length },
      update: { status: "READY", mappingJson: input.plan.mappings as Prisma.InputJsonValue, dataQualityJson: { issues: input.plan.issues, linkCoverage: input.plan.linkCoverage } as Prisma.InputJsonValue, eligibilityJson: input.plan.eligibility as Prisma.InputJsonValue },
    });

    const committedAt = new Date();
    const scopes = new Map<string, { entityType: typeof input.plan.records[number]["entityType"]; sourceSystem: string }>();
    for (const record of input.plan.records) {
      scopes.set(`${record.entityType}:${record.sourceSystem}`, { entityType: record.entityType, sourceSystem: record.sourceSystem });
    }
    const currentRows = await tx.canonicalRecord.findMany({ where: { workspaceId: input.workspaceId, isActive: true } });
    const prospectiveRecords = [
      ...currentRows
        .filter((row) => !scopes.has(`${row.entityType}:${row.sourceSystem}`))
        .map(toCanonicalContract),
      ...input.plan.records,
    ];
    const engineFindings = runQuoteRecoveryEngine({ workspaceId: input.workspaceId, records: prospectiveRecords, now: committedAt, defaultCurrency: input.plan.defaultCurrency });
    const dismissed = engineFindings.length
      ? await tx.quoteRecoveryFinding.findMany({
          where: { workspaceId: input.workspaceId, status: "DISMISSED", fingerprint: { in: engineFindings.map((finding) => finding.fingerprint) } },
          select: { fingerprint: true },
        })
      : [];
    const dismissedFingerprints = new Set(dismissed.map((finding) => finding.fingerprint));
    const quoteRecoverySnapshot = engineFindings
      .filter((finding) => !dismissedFingerprints.has(finding.fingerprint))
      .map((finding) => ({
        id: `snapshot:${finding.fingerprint}`,
        findingType: finding.type,
        severity: finding.severity,
        confidence: finding.confidence,
        valueBasis: finding.valueBasis,
        valueCents: finding.valueCents,
        currency: finding.currency,
        estimateExternalId: finding.estimateExternalId,
        fingerprint: finding.fingerprint,
        reason: finding.reason,
        recommendedAction: finding.recommendedAction,
        evidenceJson: finding.evidence,
      }));
    const quoteRecoveryDataQualitySnapshot = {
      hasImport: true,
      importedAt: committedAt.toISOString(),
      recordCount: prospectiveRecords.length,
      issues: input.plan.issues,
      linkCoverage: input.plan.linkCoverage,
      eligibility: input.plan.eligibility,
    };
    for (const scope of scopes.values()) {
      await tx.canonicalRecord.updateMany({
        data: { isActive: false, supersededAt: committedAt },
        where: { workspaceId: input.workspaceId, entityType: scope.entityType, sourceSystem: scope.sourceSystem, isActive: true },
      });
    }

    for (const record of input.plan.records) {
      await tx.canonicalRecord.upsert({
        where: { workspaceId_entityType_sourceSystem_externalId: { workspaceId: input.workspaceId, entityType: record.entityType, sourceSystem: record.sourceSystem, externalId: record.externalId } },
        create: { workspaceId: input.workspaceId, importSessionId: session.id, entityType: record.entityType, sourceSystem: record.sourceSystem, externalId: record.externalId, relationExternalIdsJson: record.relationExternalIds, provenanceJson: record.provenance, payloadJson: record.payload as Prisma.InputJsonValue, occurredAt: record.occurredAt ? new Date(record.occurredAt) : null, isActive: true },
        update: { importSessionId: session.id, relationExternalIdsJson: record.relationExternalIds, provenanceJson: record.provenance, payloadJson: record.payload as Prisma.InputJsonValue, occurredAt: record.occurredAt ? new Date(record.occurredAt) : null, isActive: true, supersededAt: null },
      });
    }

    for (const [fileName, mapping] of Object.entries(input.plan.mappings)) {
      const sourceRecord = input.plan.records.find((record) => record.provenance.fileName === fileName);
      const entityType = sourceRecord?.entityType;
      if (!entityType || !sourceRecord) continue;
      const sourceSignature = createHash("sha256").update(Object.keys(mapping).sort().join("|")).digest("hex");
      await tx.savedCanonicalMapping.upsert({
        where: { workspaceId_entityType_sourceSignature: { workspaceId: input.workspaceId, entityType, sourceSignature } },
        create: { workspaceId: input.workspaceId, entityType, sourceSignature, sourceSystem: sourceRecord.sourceSystem, mappingJson: mapping },
        update: { sourceSystem: sourceRecord.sourceSystem, mappingJson: mapping },
      });
    }

    const committed = await tx.canonicalImportSession.update({
      where: { id: session.id },
      data: {
        status: "COMMITTED",
        acceptedCount: input.plan.records.length,
        rejectedCount: input.plan.issues.filter((issue) => issue.rowNumber).length,
        committedAt,
        quoteRecoverySnapshotJson: quoteRecoverySnapshot as Prisma.InputJsonValue,
        quoteRecoveryDataQualitySnapshotJson: quoteRecoveryDataQualitySnapshot as Prisma.InputJsonValue,
      },
      include: { records: true },
    });
    await tx.workspaceAuditEvent.create({
      data: {
        workspaceId: input.workspaceId,
        action: "CANONICAL_IMPORT_COMMITTED",
        metadataJson: {
          importSessionId: session.id,
          recordCount: input.plan.records.length,
          scopes: [...scopes.values()],
          unmatchedCount: input.plan.linkCoverage.unmatched,
          conflictingCount: input.plan.linkCoverage.conflicting,
        } as Prisma.InputJsonValue,
      },
    });
    return { created: !existing, session: committed };
  }, {
    maxWait: 10_000,
    timeout: 120_000,
  });
}
