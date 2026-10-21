import "server-only";

import { prisma } from "@/db/prisma";
import { evaluateAiAttributionCoverage } from "@/domain/ai-integrity/attribution";
import { providerProjectMappingKey, stripeCustomerMappingKey } from "@/domain/ai-integrity/mapping-key";

type MappingInput = {
  workspaceId: string; actorUserId: string; kind: "STRIPE_CUSTOMER" | "PROVIDER_PROJECT";
  externalId: string; internalCustomerExternalId: string; sourceBatchId: string; ledgerBatchId: string;
  provider?: string; organizationId?: string | null; validFrom: string; validUntil: string; exclusiveProjectConfirmed?: boolean;
};

function closedWindow(from: string, until: string) {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(from) || !/(?:Z|[+-]\d{2}:\d{2})$/.test(until)) throw new Error("Mapping dates need explicit timezone offsets.");
  const start = new Date(from); const end = new Date(until);
  if (!Number.isFinite(start.valueOf()) || !Number.isFinite(end.valueOf()) || start >= end) throw new Error("Mapping needs a valid closed period.");
  return { start, end };
}

export async function createAiIdentityMapping(input: MappingInput) {
  const rawExternalId = input.externalId.trim();
  const target = input.internalCustomerExternalId.trim();
  if (!rawExternalId || !target || rawExternalId.length > 200 || target.length > 200) throw new Error("Choose exact source and internal customer IDs.");
  if (input.kind === "PROVIDER_PROJECT" && !input.exclusiveProjectConfirmed) throw new Error("Confirm that the provider project is exclusive to this customer for the selected period.");
  const { start, end } = closedWindow(input.validFrom, input.validUntil);
  return prisma.$transaction(async (tx) => {
    const [sourceBatch, ledgerBatch] = await Promise.all([
      tx.aiIntegrityImportBatch.findFirst({ where: { id: input.sourceBatchId, workspaceId: input.workspaceId } }),
      tx.aiIntegrityImportBatch.findFirst({ where: { id: input.ledgerBatchId, workspaceId: input.workspaceId, sourceKind: "INTERNAL_LEDGER" } }),
    ]);
    if (!sourceBatch || !ledgerBatch || sourceBatch.sourceKind !== (input.kind === "STRIPE_CUSTOMER" ? "STRIPE_REVENUE" : "PROVIDER_REPORT")) throw new Error("Selected source or ledger batch is unavailable in this workspace.");
    if (start < sourceBatch.windowStart || end > sourceBatch.windowEnd || start < ledgerBatch.windowStart || end > ledgerBatch.windowEnd) throw new Error("Mapping period must fit both selected batch windows.");
    const ledger = await tx.aiIntegrityUsageRecord.findMany({ where: { workspaceId: input.workspaceId, importBatchId: ledgerBatch.id,
      occurredAt: { gte: start, lt: end } }, select: { internalCustomerExternalId: true, provider: true, providerProjectId: true } });
    if (!ledger.some((row) => row.internalCustomerExternalId === target)) throw new Error("Internal customer ID was not observed in the selected ledger and period.");
    let key: string;
    let method: string;
    let evidenceConflict = false;
    if (input.kind === "STRIPE_CUSTOMER") {
      const observed = await tx.aiIntegrityRevenueRecord.count({ where: { workspaceId: input.workspaceId, importBatchId: sourceBatch.id,
        stripeCustomerExternalId: rawExternalId, occurredAt: { gte: start, lt: end } } });
      if (!observed) throw new Error("Stripe customer ID was not observed in the selected revenue batch and period.");
      key = stripeCustomerMappingKey(sourceBatch.sourceSystem, rawExternalId);
      method = "USER_CONFIRMED_STRIPE_TO_LEDGER";
    } else {
      const provider = input.provider?.trim().toLowerCase() ?? "";
      const organizationId = input.organizationId?.trim() || null;
      if (!provider) throw new Error("Provider is required for a project mapping.");
      const bucket = await tx.aiIntegrityProviderBucket.findFirst({ where: { workspaceId: input.workspaceId, importBatchId: sourceBatch.id,
        provider: { equals: provider, mode: "insensitive" }, organizationId, projectId: rawExternalId,
        windowStart: { lt: end }, windowEnd: { gt: start } }, select: { id: true } });
      if (!bucket) throw new Error("Provider project was not observed in the selected report and period.");
      const projectUsage = ledger.filter((row) => row.provider?.toLowerCase() === provider && row.providerProjectId === rawExternalId);
      if (!projectUsage.some((row) => row.internalCustomerExternalId === target)) throw new Error("The selected ledger has no usage for this customer and provider project.");
      const knownProjectUsage = await tx.aiIntegrityUsageRecord.findMany({ where: { workspaceId: input.workspaceId,
        provider: { equals: provider, mode: "insensitive" }, providerProjectId: rawExternalId,
        occurredAt: { gte: start, lt: end } }, select: { internalCustomerExternalId: true }, take: 100_001 });
      if (knownProjectUsage.length > 100_000) throw new Error("Too many relevant ledger rows to verify exclusivity safely.");
      evidenceConflict = knownProjectUsage.some((row) => row.internalCustomerExternalId !== target);
      const otherOrganization = await tx.aiIntegrityProviderBucket.findFirst({ where: { workspaceId: input.workspaceId,
        provider: { equals: provider, mode: "insensitive" }, projectId: rawExternalId,
        OR: organizationId ? [{ organizationId: null }, { organizationId: { not: organizationId } }] : [{ organizationId: { not: null } }],
        windowStart: { lt: end }, windowEnd: { gt: start } }, select: { id: true } });
      evidenceConflict ||= Boolean(otherOrganization);
      key = providerProjectMappingKey(provider, organizationId, rawExternalId);
      method = "EXCLUSIVE_PROJECT_VERIFIED";
    }
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${input.workspaceId}), hashtext(${`${input.kind}:${key}`}))::text AS locked`;
    const overlapping = await tx.aiIntegrityMapping.findMany({ where: { workspaceId: input.workspaceId, kind: input.kind,
      externalId: key, status: { not: "REVOKED" }, validFrom: { lt: end },
      OR: [{ validUntil: null }, { validUntil: { gt: start } }] } });
    if (overlapping.some((row) => row.internalCustomerExternalId === target && row.validFrom.getTime() === start.getTime() && row.validUntil?.getTime() === end.getTime())) throw new Error("This identity mapping already exists for the same period.");
    const conflict = evidenceConflict || overlapping.length > 0;
    if (overlapping.length) await tx.aiIntegrityMapping.updateMany({ where: { id: { in: overlapping.map((row) => row.id) }, workspaceId: input.workspaceId }, data: { status: "CONFLICTED" } });
    const mapping = await tx.aiIntegrityMapping.create({ data: { workspaceId: input.workspaceId, kind: input.kind, externalId: key,
      internalCustomerExternalId: target, validFrom: start, validUntil: end, status: conflict ? "CONFLICTED" : "CONFIRMED",
      confirmationMethod: method, confirmedByUserId: input.actorUserId,
      provenanceJson: { rawExternalId, provider: input.provider?.trim().toLowerCase() ?? null, organizationId: input.organizationId?.trim() || null,
        sourceBatchId: sourceBatch.id, ledgerBatchId: ledgerBatch.id, evidenceConflict, actorUserId: input.actorUserId } } });
    await tx.workspaceAuditEvent.create({ data: { workspaceId: input.workspaceId, actorUserId: input.actorUserId,
      action: "AI_INTEGRITY_MAPPING_REVIEWED", metadataJson: { mappingId: mapping.id, kind: input.kind, status: mapping.status,
        sourceBatchId: sourceBatch.id, ledgerBatchId: ledgerBatch.id, conflictingMappingIds: overlapping.map((row) => row.id) } } });
    return mapping;
  }, { maxWait: 10_000, timeout: 30_000 });
}

export async function revokeAiIdentityMapping(workspaceId: string, actorUserId: string, mappingId: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.aiIntegrityMapping.findFirst({ where: { id: mappingId, workspaceId } });
    if (!current) throw new Error("Mapping unavailable in this workspace.");
    if (current.status === "REVOKED") return current;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${workspaceId}), hashtext(${`${current.kind}:${current.externalId}`}))::text AS locked`;
    const mapping = await tx.aiIntegrityMapping.update({ where: { id: current.id }, data: { status: "REVOKED" } });
    const remaining = await tx.aiIntegrityMapping.findMany({ where: { workspaceId, kind: current.kind, externalId: current.externalId,
      status: { not: "REVOKED" } } });
    const restored: string[] = [];
    for (const candidate of remaining) {
      if (candidate.status !== "CONFLICTED") continue;
      const evidence = candidate.provenanceJson && typeof candidate.provenanceJson === "object" && !Array.isArray(candidate.provenanceJson)
        ? candidate.provenanceJson as Record<string, unknown> : {};
      if (evidence.evidenceConflict || remaining.some((other) => other.id !== candidate.id
        && other.validFrom < (candidate.validUntil ?? new Date(8640000000000000))
        && (other.validUntil === null || other.validUntil > candidate.validFrom))) continue;
      if (candidate.kind === "PROVIDER_PROJECT") {
        const provider = typeof evidence.provider === "string" ? evidence.provider : "";
        const rawExternalId = typeof evidence.rawExternalId === "string" ? evidence.rawExternalId : "";
        if (!provider || !rawExternalId) continue;
        const conflictingUsage = await tx.aiIntegrityUsageRecord.findFirst({ where: { workspaceId,
          provider: { equals: provider, mode: "insensitive" }, providerProjectId: rawExternalId,
          OR: [{ internalCustomerExternalId: null }, { internalCustomerExternalId: { not: candidate.internalCustomerExternalId } }],
          occurredAt: { gte: candidate.validFrom, lt: candidate.validUntil ?? new Date(8640000000000000) } }, select: { id: true } });
        if (conflictingUsage) continue;
        const organizationId = typeof evidence.organizationId === "string" ? evidence.organizationId : null;
        const otherOrganization = await tx.aiIntegrityProviderBucket.findFirst({ where: { workspaceId,
          provider: { equals: provider, mode: "insensitive" }, projectId: rawExternalId,
          OR: organizationId ? [{ organizationId: null }, { organizationId: { not: organizationId } }] : [{ organizationId: { not: null } }],
          windowStart: { lt: candidate.validUntil ?? new Date(8640000000000000) }, windowEnd: { gt: candidate.validFrom } }, select: { id: true } });
        if (otherOrganization) continue;
      }
      await tx.aiIntegrityMapping.update({ where: { id: candidate.id }, data: { status: "CONFIRMED" } });
      restored.push(candidate.id);
    }
    await tx.workspaceAuditEvent.create({ data: { workspaceId, actorUserId, action: "AI_INTEGRITY_MAPPING_REVOKED", metadataJson: { mappingId: mapping.id, previousStatus: current.status, restoredMappingIds: restored } } });
    return mapping;
  });
}

export async function getAiAttributionCoverage(workspaceId: string, providerBatchId: string, ledgerBatchId: string) {
  const [providerBatch, ledgerBatch] = await Promise.all([
    prisma.aiIntegrityImportBatch.findFirst({ where: { id: providerBatchId, workspaceId, sourceKind: "PROVIDER_REPORT" } }),
    prisma.aiIntegrityImportBatch.findFirst({ where: { id: ledgerBatchId, workspaceId, sourceKind: "INTERNAL_LEDGER" } }),
  ]);
  if (!providerBatch || !ledgerBatch) throw new Error("Coverage requires provider and ledger batches from this workspace.");
  const [buckets, usage, mappings] = await Promise.all([
    prisma.aiIntegrityProviderBucket.findMany({ where: { workspaceId, importBatchId: providerBatch.id } }),
    prisma.aiIntegrityUsageRecord.findMany({ where: { workspaceId, importBatchId: ledgerBatch.id } }),
    prisma.aiIntegrityMapping.findMany({ where: { workspaceId, kind: "PROVIDER_PROJECT", status: { not: "REVOKED" } } }),
  ]);
  const projectIds = [...new Set(buckets.map((row) => row.projectId).filter((id): id is string => Boolean(id)))];
  const knownUsage = projectIds.length ? await prisma.aiIntegrityUsageRecord.findMany({ where: { workspaceId,
    providerProjectId: { in: projectIds }, occurredAt: { gte: providerBatch.windowStart, lt: providerBatch.windowEnd } },
    select: { provider: true, providerProjectId: true, internalCustomerExternalId: true, occurredAt: true }, take: 100_001 }) : [];
  if (knownUsage.length > 100_000) throw new Error("Too many relevant ledger rows to verify exclusivity safely.");
  return { providerBatch: { id: providerBatch.id, sourceSystem: providerBatch.sourceSystem, fileName: providerBatch.fileName },
    ledgerBatch: { id: ledgerBatch.id, sourceSystem: ledgerBatch.sourceSystem, fileName: ledgerBatch.fileName },
    ...evaluateAiAttributionCoverage({ providerWindowStart: providerBatch.windowStart, providerWindowEnd: providerBatch.windowEnd,
      ledgerWindowStart: ledgerBatch.windowStart, ledgerWindowEnd: ledgerBatch.windowEnd,
      buckets: buckets.map((row) => ({ ...row, costAmount: row.costAmount?.toString() ?? null })),
      usage, knownUsage, mappings }) };
}
