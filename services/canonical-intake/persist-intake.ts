import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";
import type { IntakePlan } from "@/services/canonical-intake/secure-intake";

export async function persistSecureIntakePlan(input: { workspaceId: string; plan: IntakePlan }) {
  if (!input.plan.accepted || input.plan.records.some((record) => record.workspaceId !== input.workspaceId)) {
    throw new Error("Only an accepted, workspace-scoped intake plan can be committed.");
  }

  return prisma.$transaction(async (tx) => {
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

    for (const record of input.plan.records) {
      await tx.canonicalRecord.upsert({
        where: { workspaceId_entityType_sourceSystem_externalId: { workspaceId: input.workspaceId, entityType: record.entityType, sourceSystem: record.sourceSystem, externalId: record.externalId } },
        create: { workspaceId: input.workspaceId, importSessionId: session.id, entityType: record.entityType, sourceSystem: record.sourceSystem, externalId: record.externalId, relationExternalIdsJson: record.relationExternalIds, provenanceJson: record.provenance, payloadJson: record.payload as Prisma.InputJsonValue, occurredAt: record.occurredAt ? new Date(record.occurredAt) : null },
        update: { importSessionId: session.id, relationExternalIdsJson: record.relationExternalIds, provenanceJson: record.provenance, payloadJson: record.payload as Prisma.InputJsonValue, occurredAt: record.occurredAt ? new Date(record.occurredAt) : null },
      });
    }

    for (const [fileName, mapping] of Object.entries(input.plan.mappings)) {
      const entityType = input.plan.records.find((record) => record.provenance.fileName === fileName)?.entityType;
      if (!entityType) continue;
      const sourceSignature = createHash("sha256").update(Object.keys(mapping).sort().join("|")).digest("hex");
      await tx.savedCanonicalMapping.upsert({
        where: { workspaceId_entityType_sourceSignature: { workspaceId: input.workspaceId, entityType, sourceSignature } },
        create: { workspaceId: input.workspaceId, entityType, sourceSignature, mappingJson: mapping },
        update: { mappingJson: mapping },
      });
    }

    const committed = await tx.canonicalImportSession.update({ where: { id: session.id }, data: { status: "COMMITTED", acceptedCount: input.plan.records.length, rejectedCount: input.plan.issues.filter((issue) => issue.rowNumber).length, committedAt: new Date() }, include: { records: true } });
    return { created: !existing, session: committed };
  });
}
