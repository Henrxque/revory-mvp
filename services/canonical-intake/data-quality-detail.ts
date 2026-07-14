import "server-only";

import type { CanonicalEntityType } from "@prisma/client";

import { prisma } from "@/db/prisma";
import type { CanonicalRecordContract } from "@/domain/revory/contracts";
import { quoteRecoveryEligibility } from "@/services/canonical-intake/definitions";
import { buildRevenueRealizationRead } from "@/services/revenue-realization/reconciliation-engine";

export type CanonicalLinkIssue = {
  relationField: string;
  sourceEntityType: CanonicalEntityType;
  sourceExternalId: string;
  sourceSystem: string;
  status: "CONFLICTING" | "UNMATCHED";
  targetEntityType: string;
  targetExternalId: string;
};

type RuleEligibility = Record<string, { eligible: boolean; missingFields: string[] }>;

function relationTargetType(field: string) {
  return field
    .replace("ExternalId", "")
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toUpperCase();
}

export async function getCanonicalDataQualityDetail(workspaceId: string) {
  const [latestImport, records] = await Promise.all([
    prisma.canonicalImportSession.findFirst({
      orderBy: { committedAt: "desc" },
      where: { status: "COMMITTED", workspaceId },
    }),
    prisma.canonicalRecord.findMany({
      orderBy: [{ entityType: "asc" }, { externalId: "asc" }],
      select: {
        entityType: true,
        externalId: true,
        occurredAt: true,
        payloadJson: true,
        provenanceJson: true,
        relationExternalIdsJson: true,
        sourceSystem: true,
        workspaceId: true,
      },
      where: { isActive: true, workspaceId },
    }),
  ]);

  const idCounts = records.reduce((counts, record) => {
    const key = `${record.entityType}:${record.externalId}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const linkIssues: CanonicalLinkIssue[] = [];
  let linked = 0;
  for (const record of records) {
    const relations = record.relationExternalIdsJson as Record<string, unknown>;
    for (const [relationField, rawTargetId] of Object.entries(relations)) {
      if (typeof rawTargetId !== "string" || !rawTargetId.trim()) continue;
      const targetEntityType = relationTargetType(relationField);
      const count = idCounts.get(`${targetEntityType}:${rawTargetId}`) ?? 0;
      if (count === 1) {
        linked += 1;
        continue;
      }
      linkIssues.push({
        relationField,
        sourceEntityType: record.entityType,
        sourceExternalId: record.externalId,
        sourceSystem: record.sourceSystem,
        status: count > 1 ? "CONFLICTING" : "UNMATCHED",
        targetEntityType,
        targetExternalId: rawTargetId,
      });
    }
  }

  const dataQuality = latestImport?.dataQualityJson as {
    issues?: Array<{ code: string; fileName?: string; message: string; rowNumber?: number }>;
  } | null;
  const activeContracts: CanonicalRecordContract[] = records.map((record) => ({
    entityType: record.entityType,
    externalId: record.externalId,
    occurredAt: record.occurredAt?.toISOString() ?? null,
    payload: record.payloadJson as CanonicalRecordContract["payload"],
    provenance: record.provenanceJson as CanonicalRecordContract["provenance"],
    relationExternalIds: record.relationExternalIdsJson as Record<string, string>,
    sourceSystem: record.sourceSystem,
    workspaceId: record.workspaceId,
  }));
  const estimateFields = new Set(
    activeContracts
      .filter((record) => record.entityType === "ESTIMATE")
      .flatMap((record) =>
        Object.entries(record.payload)
          .filter(([, value]) => value !== null && value !== "")
          .map(([field]) => field),
      ),
  );
  const quoteEligibility: RuleEligibility = Object.fromEntries(
    Object.entries(quoteRecoveryEligibility).map(([rule, requiredFields]) => {
      const missingFields = requiredFields.filter((field) => !estimateFields.has(field));
      return [rule, { eligible: missingFields.length === 0, missingFields }];
    }),
  );
  const realizationEligibility: RuleEligibility = activeContracts.length
    ? buildRevenueRealizationRead(activeContracts).eligibility
    : {};
  const eligibility: RuleEligibility = { ...quoteEligibility, ...realizationEligibility };

  return {
    committedAt: latestImport?.committedAt ?? null,
    eligibility,
    issues: dataQuality?.issues ?? [],
    linkCoverage: {
      conflicting: linkIssues.filter((issue) => issue.status === "CONFLICTING").length,
      linked,
      unmatched: linkIssues.filter((issue) => issue.status === "UNMATCHED").length,
    },
    linkIssues,
    recordCount: records.length,
  };
}
