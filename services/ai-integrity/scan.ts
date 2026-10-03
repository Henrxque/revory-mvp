import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/db/prisma";
import { canonicalAiJson } from "@/domain/ai-integrity/contracts";
import { isAiIntegrityExperienceEnabled } from "./experience";
import { AI_INTEGRITY_RULE_VERSION, aiDigest, aiTimestamp, reconcileAiIntegrity,
  type AiScanInput, type AiScanResult, type ScanBucket, type ScanUsage, type SourceClosureReview } from "@/domain/ai-integrity/reconciliation";

export type RunAiScanRequest = {
  workspaceId: string; actorUserId: string; batchIds: string[]; asOf: string; lagHours: number;
  sourceReviews: SourceClosureReview[]; syntheticDataConfirmed: boolean;
  grantId?: string;
};
const MAX_ROWS = 25000;
const json = <T>(value: unknown): T => JSON.parse(JSON.stringify(value)) as T;
const rowSelect = { id: true, importBatchId: true, sourceSystem: true, externalId: true, recordHash: true, sourceRowNumber: true } as const;
const usageSelect = { ...rowSelect, provider: true, providerProjectId: true, model: true, providerRequestId: true,
  internalCustomerExternalId: true, occurredAt: true, quantity: true, unit: true, creditsDelta: true } as const;
const bucketSelect = { ...rowSelect, provider: true, organizationId: true, projectId: true, model: true, windowStart: true, windowEnd: true,
  costAmount: true, costCurrency: true, costBasis: true, adjustmentKind: true, reportedAt: true, usageQuantity: true, usageUnit: true } as const;

export async function runAiIntegrityScan(request: RunAiScanRequest, attempt = 0): Promise<{ snapshotId: string; replayed: boolean; result: AiScanResult }> {
  if (process.env.NODE_ENV === "production") throw new Error("Internal scan is unavailable in production.");
  if (request.syntheticDataConfirmed !== true) throw new Error("Sprint 4 internal scans require synthetic test data confirmation.");
  if (!request.workspaceId || !request.actorUserId || request.batchIds.length !== 3 || new Set(request.batchIds).size !== 3) throw new Error("Three source batches and an authenticated actor are required.");
  if (aiTimestamp(request.asOf) > Date.now()) throw new Error("Analysis time cannot be in the future.");
  let raceKey: string | null = null;
  try {
    return await prisma.$transaction(async (tx) => {
      const requiresPurchase = isAiIntegrityExperienceEnabled();
      if (requiresPurchase && !request.grantId) throw new Error("Select a confirmed one-time test purchase before running a scan.");
      if (requiresPurchase) await tx.$queryRaw`SELECT id FROM ai_integrity_scan_grants WHERE id = ${request.grantId!} AND "workspaceId" = ${request.workspaceId} FOR UPDATE`;
      const grant = requiresPurchase ? await tx.aiIntegrityScanGrant.findFirst({ where: { id: request.grantId, workspaceId: request.workspaceId,
        status: "ACTIVE", order: { status: "PAID" } } }) : null;
      if (requiresPurchase && !grant) throw new Error("A confirmed test purchase is required in this workspace.");
      const batches = await tx.aiIntegrityImportBatch.findMany({ where: { workspaceId: request.workspaceId, id: { in: request.batchIds } }, orderBy: { id: "asc" },
        select: { id: true, sourceKind: true, sourceSystem: true, windowStart: true, windowEnd: true, sourceTimezone: true,
          fileSha256: true, mappingSha256: true, rowCount: true, insertedCount: true, duplicateCount: true, dataQualityJson: true } });
      if (batches.length !== 3) throw new Error("Source batch missing or unavailable in this workspace.");
      // Load workspace evidence once within a repeatable read. Other imports are used only for contradictions, never totals.
      const [usageRows, bucketRows, revenueRows, mappings] = await Promise.all([
        tx.aiIntegrityUsageRecord.findMany({ where: { workspaceId: request.workspaceId }, select: usageSelect, orderBy: { id: "asc" }, take: MAX_ROWS + 1 }),
        tx.aiIntegrityProviderBucket.findMany({ where: { workspaceId: request.workspaceId }, select: bucketSelect, orderBy: { id: "asc" }, take: MAX_ROWS + 1 }),
        tx.aiIntegrityRevenueRecord.findMany({ where: { workspaceId: request.workspaceId, importBatchId: { in: request.batchIds } },
          select: { ...rowSelect, eventKind: true, status: true, occurredAt: true, amountMinor: true, currency: true, parentExternalId: true }, orderBy: { id: "asc" }, take: MAX_ROWS + 1 }),
        tx.aiIntegrityMapping.findMany({ where: { workspaceId: request.workspaceId }, orderBy: { id: "asc" }, take: MAX_ROWS + 1,
          select: { id: true, kind: true, externalId: true, internalCustomerExternalId: true, validFrom: true, validUntil: true,
            status: true, confirmationMethod: true, provenanceJson: true } }),
      ]);
      if ([usageRows, bucketRows, revenueRows, mappings].some((rows) => rows.length > MAX_ROWS)) throw new Error("Workspace evidence limit exceeded; narrow intake before running this internal scan.");
      const knownUsage = json<ScanUsage[]>(usageRows), knownBuckets = json<ScanBucket[]>(bucketRows);
      const input: AiScanInput = { ruleVersion: AI_INTEGRITY_RULE_VERSION, workspaceId: request.workspaceId,
        asOf: new Date(request.asOf).toISOString(), lagHours: request.lagHours,
        sourceReviews: [...request.sourceReviews].sort((a, b) => a.batchId.localeCompare(b.batchId)).map((r) => ({ batchId: r.batchId,
          exportedAt: new Date(aiTimestamp(r.exportedAt)).toISOString(), completeThrough: new Date(aiTimestamp(r.completeThrough)).toISOString() })),
        batches: json(batches), usage: knownUsage.filter((r) => request.batchIds.includes(r.importBatchId)),
        buckets: knownBuckets.filter((r) => request.batchIds.includes(r.importBatchId)),
        knownUsage, knownBuckets, revenue: json(revenueRows), mappings: json(mappings) };
      const result = reconcileAiIntegrity(input);
      const manifest = { format: "revory-ai-integrity-evidence/v1", syntheticDataConfirmed: true, input, resultHash: aiDigest(result) };
      const manifestText = canonicalAiJson(manifest);
      if (Buffer.byteLength(manifestText, "utf8") > 20 * 1024 * 1024) throw new Error("Snapshot evidence exceeds the 20 MB internal limit.");
      const idempotencyKey = aiDigest(manifest);
      raceKey = idempotencyKey;
      const existing = await tx.aiIntegritySnapshot.findUnique({ where: { workspaceId_idempotencyKey: { workspaceId: request.workspaceId, idempotencyKey } } });
      if (existing) {
        if (grant?.consumedAt && grant.consumedSnapshotId !== existing.id) throw new Error("This purchase already delivered another report.");
        return { snapshotId: existing.id, replayed: true, result };
      }
      if (grant?.consumedAt) throw new Error("This purchase already delivered a report. Purchase another scan for new evidence.");
      const snapshot = await tx.aiIntegritySnapshot.create({ data: { workspaceId: request.workspaceId, idempotencyKey,
        ruleVersion: AI_INTEGRITY_RULE_VERSION, windowStart: new Date(result.windowStart), windowEnd: new Date(result.windowEnd),
        inputManifestJson: json<Prisma.InputJsonValue>(manifest), dataQualityJson: json<Prisma.InputJsonValue>(result.dataQuality),
        coverageJson: json<Prisma.InputJsonValue>(result.coverage), suppressionsJson: json<Prisma.InputJsonValue>({ items: result.suppressions, comparisons: result.comparisons }) } });
      const evidenceBatchIds = new Set([...request.batchIds, ...knownUsage.map((r) => r.importBatchId), ...knownBuckets.map((r) => r.importBatchId)]);
      // Mapping provenance can reference evidence not otherwise selected. Include it in retention dependencies.
      for (const mapping of mappings) {
        const provenance = mapping.provenanceJson as Record<string, unknown> | null;
        for (const key of ["sourceBatchId", "ledgerBatchId"]) if (typeof provenance?.[key] === "string") evidenceBatchIds.add(provenance[key] as string);
      }
      const dependencies = await tx.aiIntegrityImportBatch.findMany({ where: { workspaceId: request.workspaceId, id: { in: [...evidenceBatchIds] } }, select: { id: true } });
      await tx.aiIntegritySnapshotInput.createMany({ data: dependencies.map((batch) => ({ workspaceId: request.workspaceId, snapshotId: snapshot.id, importBatchId: batch.id })) });
      if (result.findings.length) await tx.aiIntegrityFinding.createMany({ data: result.findings.map((f) => ({ workspaceId: request.workspaceId, snapshotId: snapshot.id,
        fingerprint: f.fingerprint, findingType: f.findingType, valueBasis: f.valueBasis, valueAmount: f.valueAmount, valueCurrency: f.valueCurrency,
        formula: f.formula, confidenceClass: f.confidenceClass, attributionClass: f.attributionClass,
        evidenceJson: json<Prisma.InputJsonValue>(f.evidence), limitationsJson: f.limitations, recommendedReview: f.recommendedReview })) });
      if (grant) await tx.aiIntegrityScanGrant.update({ where: { id: grant.id }, data: { consumedAt: new Date(), consumedSnapshotId: snapshot.id } });
      await tx.workspaceAuditEvent.create({ data: { workspaceId: request.workspaceId, actorUserId: request.actorUserId, action: "AI_INTEGRITY_SCAN_CREATED",
        metadataJson: { snapshotId: snapshot.id, ruleVersion: AI_INTEGRITY_RULE_VERSION, findingCount: result.findings.length, syntheticDataConfirmed: true } } });
      return { snapshotId: snapshot.id, replayed: false, result };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, maxWait: 10000, timeout: 60000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || (error.code === "P2010" && error.meta?.code === "40001")) && attempt < 2) return runAiIntegrityScan(request, attempt + 1);
    if (raceKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const snapshot = await prisma.aiIntegritySnapshot.findUnique({ where: { workspaceId_idempotencyKey: { workspaceId: request.workspaceId, idempotencyKey: raceKey } } });
      if (snapshot) {
        if (isAiIntegrityExperienceEnabled()) {
          const grant = await prisma.aiIntegrityScanGrant.findFirst({ where: { id: request.grantId, workspaceId: request.workspaceId, status: "ACTIVE", order: { status: "PAID" } } });
          if (!grant || (grant.consumedAt && grant.consumedSnapshotId !== snapshot.id)) throw new Error("Purchase is unavailable for this report.");
        }
        const manifest = snapshot.inputManifestJson as unknown as { input: AiScanInput }; return { snapshotId: snapshot.id, replayed: true, result: reconcileAiIntegrity(manifest.input) };
      }
    }
    throw error;
  }
}

export async function getAiIntegrityScan(workspaceId: string, snapshotId: string) {
  const snapshot = await prisma.aiIntegritySnapshot.findFirst({ where: { workspaceId, id: snapshotId, ruleVersion: AI_INTEGRITY_RULE_VERSION },
    include: { findings: { orderBy: { fingerprint: "asc" } } } });
  if (!snapshot) return null;
  const manifest = snapshot.inputManifestJson as unknown as { format: string; input: AiScanInput; resultHash: string };
  if (manifest.format !== "revory-ai-integrity-evidence/v1") throw new Error("Unsupported snapshot manifest.");
  const result = reconcileAiIntegrity(manifest.input);
  if (aiDigest(result) !== manifest.resultHash) throw new Error("Snapshot reproduction failed integrity check.");
  return { snapshot, result };
}

export function exportAiIntegrityScan(scan: NonNullable<Awaited<ReturnType<typeof getAiIntegrityScan>>>, format: "json" | "csv") {
  if (format === "json") return canonicalAiJson({ format: "revory-ai-integrity-scan/v1", snapshotId: scan.snapshot.id,
    createdAt: scan.snapshot.createdAt.toISOString(), idempotencyKey: scan.snapshot.idempotencyKey,
    manifest: scan.snapshot.inputManifestJson, result: scan.result });
  // CSV is a findings summary. JSON contains the complete replayable evidence and suppressions.
  const cell = (value: unknown) => {
    let text = typeof value === "string" ? value : value == null ? "" : canonicalAiJson(value);
    if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const fields = ["snapshotId", "fingerprint", "findingType", "valueBasis", "valueAmount", "valueCurrency", "formula", "evidence", "limitations", "recommendedReview"] as const;
  const rows = scan.result.findings.map((f) => ({ snapshotId: scan.snapshot.id, ...f }));
  return [fields.map(cell).join(","), ...rows.map((r) => fields.map((key) => cell(r[key])).join(","))].join("\r\n") + "\r\n";
}

export type { AiScanResult };
