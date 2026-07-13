import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";
import type { CanonicalRecordContract, RecordProvenance } from "@/domain/revory/contracts";
import { buildRevenueRealizationRead } from "@/services/revenue-realization/reconciliation-engine";

function asObject(value: Prisma.JsonValue) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {};
}

export async function getRevenueRealizationRead(workspaceId: string) {
  if (!workspaceId.trim()) throw new Error("Workspace authorization is required.");
  const rows = await prisma.canonicalRecord.findMany({
    orderBy: [{ entityType: "asc" }, { externalId: "asc" }],
    where: { workspaceId },
  });
  if (!rows.length) return null;

  const records: CanonicalRecordContract[] = rows.map((row) => ({
    entityType: row.entityType,
    externalId: row.externalId,
    occurredAt: row.occurredAt?.toISOString() ?? null,
    payload: asObject(row.payloadJson) as CanonicalRecordContract["payload"],
    provenance: asObject(row.provenanceJson) as unknown as RecordProvenance,
    relationExternalIds: Object.fromEntries(
      Object.entries(asObject(row.relationExternalIdsJson)).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
    sourceSystem: row.sourceSystem,
    workspaceId: row.workspaceId,
  }));
  return buildRevenueRealizationRead(records);
}
