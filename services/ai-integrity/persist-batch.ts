import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";
import {
  prepareAiIntegrityBatch,
  type AiIntegrityBatchInput,
  type AiProviderBucketInput,
  type AiRevenueInput,
  type AiUsageInput,
} from "@/domain/ai-integrity/contracts";

export async function persistAiIntegrityBatch(input: AiIntegrityBatchInput, actorUserId?: string) {
  const plan = prepareAiIntegrityBatch(input);
  const idempotencyWhere = {
    workspaceId_idempotencyKey: {
      workspaceId: plan.workspaceId,
      idempotencyKey: plan.idempotencyKey,
    },
  };

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.aiIntegrityImportBatch.findUnique({ where: idempotencyWhere });
      if (existing) return { batch: existing, replayed: true };

      const batch = await tx.aiIntegrityImportBatch.create({
        data: {
          workspaceId: plan.workspaceId,
          sourceKind: plan.sourceKind,
          sourceSystem: plan.sourceSystem.trim(),
          idempotencyKey: plan.idempotencyKey,
          fileName: plan.fileName.trim(),
          fileSha256: plan.fileSha256.toLowerCase(),
          mappingSha256: plan.mappingSha256.toLowerCase(),
          windowStart: plan.normalizedWindowStart,
          windowEnd: plan.normalizedWindowEnd,
          sourceTimezone: plan.sourceTimezone.trim(),
          rowCount: plan.records.length,
          dataQualityJson: plan.dataQuality as Prisma.InputJsonValue,
        },
      });
      const common = (record: AiRevenueInput | AiUsageInput | AiProviderBucketInput, index: number) => ({
        workspaceId: plan.workspaceId,
        importBatchId: batch.id,
        sourceSystem: plan.sourceSystem.trim(),
        externalId: record.externalId.trim(),
        sourceVersion: record.sourceVersion ?? null,
        recordHash: plan.recordHashes[index],
        sourceRowNumber: record.sourceRowNumber,
        sourcePayloadJson: record.sourcePayload as Prisma.InputJsonValue,
        provenanceJson: record.provenance as Prisma.InputJsonValue,
      });
      let insertedCount = 0;

      if (plan.sourceKind === "STRIPE_REVENUE") {
        const result = await tx.aiIntegrityRevenueRecord.createMany({
          data: plan.records.map((record, index) => ({
            ...common(record, index),
            eventKind: record.eventKind.trim(),
            status: record.status.trim(),
            stripeCustomerExternalId: record.stripeCustomerExternalId ?? null,
            stripeSubscriptionId: record.stripeSubscriptionId ?? null,
            stripeInvoiceId: record.stripeInvoiceId ?? null,
            stripePaymentId: record.stripePaymentId ?? null,
            parentExternalId: record.parentExternalId ?? null,
            amountMinor: record.amountMinor ?? null,
            currency: record.currency ?? null,
            currencyExponent: record.currencyExponent ?? null,
            occurredAt: new Date(record.occurredAt),
            periodStart: record.periodStart ? new Date(record.periodStart) : null,
            periodEnd: record.periodEnd ? new Date(record.periodEnd) : null,
          })),
          skipDuplicates: true,
        });
        insertedCount = result.count;
      } else if (plan.sourceKind === "INTERNAL_LEDGER") {
        const result = await tx.aiIntegrityUsageRecord.createMany({
          data: plan.records.map((record, index) => ({
            ...common(record, index),
            internalCustomerExternalId: record.internalCustomerExternalId ?? null,
            provider: record.provider ?? null,
            providerRequestId: record.providerRequestId ?? null,
            providerProjectId: record.providerProjectId ?? null,
            model: record.model ?? null,
            quantity: record.quantity,
            unit: record.unit.trim(),
            creditsDelta: record.creditsDelta ?? null,
            occurredAt: new Date(record.occurredAt),
          })),
          skipDuplicates: true,
        });
        insertedCount = result.count;
      } else {
        const result = await tx.aiIntegrityProviderBucket.createMany({
          data: plan.records.map((record, index) => ({
            ...common(record, index),
            provider: record.provider.trim(),
            organizationId: record.organizationId ?? null,
            projectId: record.projectId ?? null,
            model: record.model ?? null,
            usageQuantity: record.usageQuantity ?? null,
            usageUnit: record.usageUnit ?? null,
            costAmount: record.costAmount ?? null,
            costCurrency: record.costCurrency ?? null,
            costBasis: record.costBasis,
            pricingVersion: record.pricingVersion ?? null,
            adjustmentKind: record.adjustmentKind ?? null,
            windowStart: new Date(record.windowStart),
            windowEnd: new Date(record.windowEnd),
            reportedAt: record.reportedAt ? new Date(record.reportedAt) : null,
          })),
          skipDuplicates: true,
        });
        insertedCount = result.count;
      }

      const committed = await tx.aiIntegrityImportBatch.update({
        where: { id: batch.id },
        data: { insertedCount, duplicateCount: plan.records.length - insertedCount },
      });
      if (actorUserId) {
        await tx.workspaceAuditEvent.create({ data: { workspaceId: plan.workspaceId, actorUserId, action: "AI_INTEGRITY_IMPORT_COMMITTED", metadataJson: { batchId: committed.id, sourceKind: plan.sourceKind, rowCount: committed.rowCount, insertedCount, duplicateCount: committed.duplicateCount, rejectedCount: (plan.dataQuality.rejectedRows as number | undefined) ?? 0 } } });
      }
      return { batch: committed, replayed: false };
    }, { maxWait: 10_000, timeout: 120_000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.aiIntegrityImportBatch.findUnique({ where: idempotencyWhere });
      if (existing) return { batch: existing, replayed: true };
    }
    throw error;
  }
}
