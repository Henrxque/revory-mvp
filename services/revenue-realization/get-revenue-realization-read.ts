import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";
import type { CanonicalRecordContract, RecordProvenance } from "@/domain/revory/contracts";
import { buildRevenueRealizationRead } from "@/services/revenue-realization/reconciliation-engine";
import { summarizeRevenueRealizationFindings } from "@/services/revenue-realization/finding-engine";

function asObject(value: Prisma.JsonValue) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {};
}

export async function getRevenueRealizationRecords(workspaceId: string) {
  if (!workspaceId.trim()) throw new Error("Workspace authorization is required.");
  const rows = await prisma.canonicalRecord.findMany({
    orderBy: [{ entityType: "asc" }, { externalId: "asc" }],
    where: { workspaceId },
  });
  return rows.map((row): CanonicalRecordContract => ({
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
}

export async function getRevenueRealizationRead(workspaceId: string) {
  const records = await getRevenueRealizationRecords(workspaceId);
  if (!records.length) return null;
  return buildRevenueRealizationRead(records);
}

export async function getRevenueRealizationFindingRead(workspaceId: string) {
  if (!workspaceId.trim()) throw new Error("Workspace authorization is required.");
  const findings = await prisma.revenueRealizationFinding.findMany({
    orderBy: [{ priority: "desc" }, { valueCents: "desc" }, { detectedAt: "desc" }],
    where: { workspaceId, status: { in: ["OPEN", "ACKNOWLEDGED"] } },
  });
  return {
    findings,
    summary: summarizeRevenueRealizationFindings(findings.map((finding) => ({
      additiveToExecutiveGap: finding.additiveToExecutiveGap,
      category: finding.category,
      currency: finding.currency,
      type: finding.findingType,
      valueCents: finding.valueCents,
    }))),
  };
}

export async function getRevenueRealizationFindingDetail(workspaceId: string, id: string) {
  return prisma.revenueRealizationFinding.findFirst({ where: { id, workspaceId } });
}
