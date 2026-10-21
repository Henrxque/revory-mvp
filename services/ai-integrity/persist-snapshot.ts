import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { canonicalAiJson } from "@/domain/ai-integrity/contracts";

export type AiIntegritySnapshotInput = {
  workspaceId: string;
  ruleVersion: string;
  windowStart: string;
  windowEnd: string;
  inputBatchIds: string[];
  dataQuality: Record<string, unknown>;
  coverage: Record<string, unknown>;
  suppressions: Record<string, unknown>;
};

export async function persistAiIntegritySnapshot(input: AiIntegritySnapshotInput) {
  if (!input.workspaceId.trim() || input.workspaceId !== input.workspaceId.trim() || !input.ruleVersion.trim()) throw new Error("Canonical workspace and rule version are required.");
  if (!input.inputBatchIds.length || new Set(input.inputBatchIds).size !== input.inputBatchIds.length) throw new Error("Snapshot needs distinct import batches.");
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(input.windowStart) || !/(?:Z|[+-]\d{2}:\d{2})$/.test(input.windowEnd)) throw new Error("Snapshot window needs explicit timezone offsets.");
  const from = new Date(input.windowStart);
  const to = new Date(input.windowEnd);
  if (Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf()) || from >= to) throw new Error("Snapshot window is invalid.");
  canonicalAiJson(input.dataQuality);
  canonicalAiJson(input.coverage);
  canonicalAiJson(input.suppressions);

  let racedWhere: { workspaceId_idempotencyKey: { workspaceId: string; idempotencyKey: string } } | null = null;
  try {
    return await prisma.$transaction(async (tx) => {
      const batches = await tx.aiIntegrityImportBatch.findMany({
        where: { workspaceId: input.workspaceId, id: { in: input.inputBatchIds } },
        select: { id: true, sourceKind: true, sourceSystem: true, fileSha256: true, mappingSha256: true, insertedCount: true, duplicateCount: true },
      });
      if (batches.length !== input.inputBatchIds.length) throw new Error("Snapshot references a missing or foreign-workspace import batch.");
      const manifest = batches.sort((left, right) => left.id.localeCompare(right.id));
      const idempotencyKey = createHash("sha256").update(canonicalAiJson({
        workspaceId: input.workspaceId,
        ruleVersion: input.ruleVersion.trim(),
        windowStart: from.toISOString(),
        windowEnd: to.toISOString(),
        manifest,
        dataQuality: input.dataQuality,
        coverage: input.coverage,
        suppressions: input.suppressions,
      })).digest("hex");
      const where = { workspaceId_idempotencyKey: { workspaceId: input.workspaceId, idempotencyKey } };
      racedWhere = where;
      const existing = await tx.aiIntegritySnapshot.findUnique({ where });
      if (existing) return { snapshot: existing, replayed: true };
      const snapshot = await tx.aiIntegritySnapshot.create({
        data: {
          workspaceId: input.workspaceId,
          idempotencyKey,
          ruleVersion: input.ruleVersion.trim(),
          windowStart: from,
          windowEnd: to,
          inputManifestJson: manifest as Prisma.InputJsonValue,
          dataQualityJson: input.dataQuality as Prisma.InputJsonValue,
          coverageJson: input.coverage as Prisma.InputJsonValue,
          suppressionsJson: input.suppressions as Prisma.InputJsonValue,
        },
      });
      await tx.aiIntegritySnapshotInput.createMany({
        data: manifest.map((batch) => ({ workspaceId: input.workspaceId, snapshotId: snapshot.id, importBatchId: batch.id })),
      });
      return { snapshot, replayed: false };
    }, { maxWait: 10_000, timeout: 30_000 });
  } catch (error) {
    if (racedWhere && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await prisma.aiIntegritySnapshot.findUnique({ where: racedWhere });
      if (raced) return { snapshot: raced, replayed: true };
    }
    throw error;
  }
}
