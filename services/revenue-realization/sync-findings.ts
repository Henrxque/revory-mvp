import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";
import type { CanonicalRecordContract } from "@/domain/revory/contracts";
import { runRevenueRealizationFindingEngine } from "@/services/revenue-realization/finding-engine";
import { getRevenueRealizationRecords } from "@/services/revenue-realization/get-revenue-realization-read";
import { buildRevenueRealizationRead } from "@/services/revenue-realization/reconciliation-engine";

export async function syncRevenueRealizationFindings(input: {
  workspaceId: string;
  records: CanonicalRecordContract[];
  now?: Date;
}) {
  const reconciliation = buildRevenueRealizationRead(input.records);
  const findings = runRevenueRealizationFindingEngine({
    workspaceId: input.workspaceId,
    records: input.records,
    reconciliation,
  });
  const now = input.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const fingerprints = findings.map((finding) => finding.fingerprint);
    for (const finding of findings) {
      const existing = await tx.revenueRealizationFinding.findUnique({
        where: {
          workspaceId_fingerprint: {
            workspaceId: input.workspaceId,
            fingerprint: finding.fingerprint,
          },
        },
      });
      await tx.revenueRealizationFinding.upsert({
        where: {
          workspaceId_fingerprint: {
            workspaceId: input.workspaceId,
            fingerprint: finding.fingerprint,
          },
        },
        create: {
          additiveToExecutiveGap: finding.additiveToExecutiveGap,
          calculationInputsJson: finding.calculationInputs as Prisma.InputJsonValue,
          category: finding.category,
          changeOrderExternalId: finding.changeOrderExternalId,
          confidence: finding.confidence,
          currency: finding.currency,
          evidenceJson: finding.evidence as Prisma.InputJsonValue,
          findingType: finding.type,
          fingerprint: finding.fingerprint,
          formula: finding.formula,
          jobExternalId: finding.jobExternalId,
          lastSeenAt: now,
          priority: finding.priority,
          reason: finding.reason,
          recommendedAction: finding.recommendedAction,
          severity: finding.severity,
          urgency: finding.urgency,
          valueBasis: finding.valueBasis,
          valueCents: finding.valueCents,
          workspaceId: input.workspaceId,
        },
        update: {
          additiveToExecutiveGap: finding.additiveToExecutiveGap,
          calculationInputsJson: finding.calculationInputs as Prisma.InputJsonValue,
          category: finding.category,
          changeOrderExternalId: finding.changeOrderExternalId,
          confidence: finding.confidence,
          currency: finding.currency,
          evidenceJson: finding.evidence as Prisma.InputJsonValue,
          formula: finding.formula,
          lastSeenAt: now,
          priority: finding.priority,
          reason: finding.reason,
          recommendedAction: finding.recommendedAction,
          resolvedAt: null,
          severity: finding.severity,
          urgency: finding.urgency,
          valueBasis: finding.valueBasis,
          valueCents: finding.valueCents,
          ...(existing?.status === "DISMISSED" ? {} : { status: "OPEN" }),
        },
      });
    }

    await tx.revenueRealizationFinding.updateMany({
      data: { resolvedAt: now, status: "RESOLVED" },
      where: {
        workspaceId: input.workspaceId,
        status: { in: ["OPEN", "ACKNOWLEDGED"] },
        ...(fingerprints.length ? { fingerprint: { notIn: fingerprints } } : {}),
      },
    });

    return { activeCount: findings.length, findings };
  });
}

export async function syncRevenueRealizationFindingsForWorkspace(
  workspaceId: string,
  now?: Date,
) {
  const records = await getRevenueRealizationRecords(workspaceId);
  if (!records.some((record) => record.entityType === "JOB")) {
    await prisma.revenueRealizationFinding.updateMany({
      data: { resolvedAt: now ?? new Date(), status: "RESOLVED" },
      where: { workspaceId, status: { in: ["OPEN", "ACKNOWLEDGED"] } },
    });
    return { activeCount: 0, findings: [] };
  }
  return syncRevenueRealizationFindings({ workspaceId, records, now });
}
