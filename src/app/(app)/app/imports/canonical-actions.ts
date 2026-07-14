"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";

import type { CanonicalEntityType } from "@/domain/revory/contracts";
import { detectSourceSystem, revorySourceSystems, type SourceSystemDetection } from "@/domain/revory/source-systems";
import { prisma } from "@/db/prisma";
import { canonicalEntityTypes } from "@/domain/revory/contracts";
import { getAppContext } from "@/services/app/get-app-context";
import { getCanonicalVolumePolicy } from "@/services/billing/growth-access";
import type { CanonicalVolumePolicy } from "@/services/billing/growth-access";
import { getCapabilityAccess } from "@/services/billing/capabilities";
import { getCanonicalImportAccessNotice } from "@/services/billing/canonical-import-access";
import {
  buildCanonicalMappingReview,
  calculateReviewedMappingConfidence,
  type CanonicalMappingReview,
  validateReviewedCanonicalMapping,
} from "@/services/canonical-intake/assisted-mapping";
import { requestCanonicalMappingAssistance } from "@/services/canonical-intake/ai-assisted-mapping";
import { canonicalFields } from "@/services/canonical-intake/definitions";
import { persistSecureIntakePlan } from "@/services/canonical-intake/persist-intake";
import { buildSecureIntakePlan, type IntakeFile } from "@/services/canonical-intake/secure-intake";
import { assertCanonicalFileContent, assertCanonicalUploadMetadata } from "@/services/canonical-intake/file-security";
import {
  createQuoteRecoveryAnalysisRun,
  releaseQuoteRecoveryAnalysisRunCapacity,
  reserveQuoteRecoveryAnalysisRunCapacity,
} from "@/services/quote-recovery/analysis-runs";
import { syncQuoteRecoveryFindingsForWorkspace } from "@/services/quote-recovery/sync-findings";
import { syncRevenueRealizationFindingsForWorkspace } from "@/services/revenue-realization/sync-findings";
import { checkRateLimit } from "@/services/security/rate-limit";
import { captureGrowthIntelligenceSnapshot } from "@/services/growth-intelligence/snapshots";

export type CanonicalReviewFile = CanonicalMappingReview & {
  aiProviderUsed: boolean;
  aiWarnings: string[];
  savedMappingUsed: boolean;
};

export type CanonicalReviewActionState = {
  files: CanonicalReviewFile[];
  message: string;
  sourceDetection: SourceSystemDetection;
  status: "error" | "ready";
};

const emptySourceDetection: SourceSystemDetection = {
  confidence: "LOW",
  label: "Source not identified",
  matchedSignals: [],
  sourceSystem: null,
};

export type CanonicalImportActionState = {
  acceptedCount?: number;
  eligibleRules?: string[];
  findingCount?: number;
  issues?: string[];
  message: string;
  status: "committed" | "error" | "idle";
  unmatchedCount?: number;
};

async function readSubmittedFiles(formData: FormData, policy: CanonicalVolumePolicy) {
  const files: Array<{
    bytes: Uint8Array;
    entityType: CanonicalEntityType;
    fileName: string;
    mimeType: string;
  }> = [];
  let totalBytes = 0;
  let totalExpandedBytes = 0;
  for (const entityType of canonicalEntityTypes) {
    const value = formData.get(`file_${entityType}`);
    if (
      typeof value === "string" ||
      !value ||
      typeof value.arrayBuffer !== "function" ||
      value.size === 0
    ) continue;
    const fileName = typeof value.name === "string" && value.name.trim()
      ? value.name
      : `${entityType.toLowerCase()}.csv`;
    assertCanonicalUploadMetadata({ fileName, mimeType: value.type, size: value.size, maxFileBytes: policy.maxFileBytes });
    totalBytes += value.size;
    if (totalBytes > policy.maxTotalBytes) throw new Error("Combined upload size exceeds the current plan limit.");
    const bytes = new Uint8Array(await value.arrayBuffer());
    const content = await assertCanonicalFileContent({ bytes, fileName, maxFileBytes: policy.maxFileBytes });
    totalExpandedBytes += content.uncompressedBytes;
    if (totalExpandedBytes > 128 * 1024 * 1024) throw new Error("Combined workbook expansion exceeds the safe processing limit.");
    files.push({
      bytes,
      entityType,
      fileName,
      mimeType: value.type,
    });
  }
  return files;
}

export async function reviewCanonicalFiles(
  formData: FormData,
): Promise<CanonicalReviewActionState> {
  const context = await getAppContext();
  if (!context) return { files: [], message: "Sign in again before reviewing data.", sourceDetection: emptySourceDetection, status: "error" };
  if (!(await getCapabilityAccess(context.workspace.id, "QUOTE_RECOVERY")).allowed) return { files: [], message: "An active REVORY entitlement is required.", sourceDetection: emptySourceDetection, status: "error" };
  if (
    (await checkRateLimit({
      key: `canonical-review:${context.workspace.id}`,
      limit: 12,
      windowMs: 10 * 60 * 1000,
    })).limited
  ) {
    return { files: [], message: "Too many review attempts. Wait a few minutes and retry.", sourceDetection: emptySourceDetection, status: "error" };
  }

  const volumePolicy = await getCanonicalVolumePolicy(context.workspace.id);
  const submitted = await readSubmittedFiles(formData, volumePolicy);
  if (!submitted.length) return { files: [], message: "Choose at least one CSV or XLSX file.", sourceDetection: emptySourceDetection, status: "error" };
  if (submitted.some((file) => ["JOB", "INVOICE", "CHANGE_ORDER", "COST"].includes(file.entityType)) && !(await getCapabilityAccess(context.workspace.id, "REVENUE_REALIZATION")).allowed) {
    return { files: [], message: "Revenue Realization requires Pro access or an authorized internal preview.", sourceDetection: emptySourceDetection, status: "error" };
  }

  try {
    const files: CanonicalReviewFile[] = [];
    const rememberedSourceSystems = new Set<NonNullable<SourceSystemDetection["sourceSystem"]>>();
    for (const file of submitted) {
      const deterministic = await buildCanonicalMappingReview(file);
      const sourceSignature = createHash("sha256")
        .update(Object.keys(deterministic.mapping).sort().join("|"))
        .digest("hex");
      const saved = await prisma.savedCanonicalMapping.findUnique({
        where: {
          workspaceId_entityType_sourceSignature: {
            workspaceId: context.workspace.id,
            entityType: file.entityType,
            sourceSignature,
          },
        },
      });
      const savedMapping = saved?.mappingJson && typeof saved.mappingJson === "object" && !Array.isArray(saved.mappingJson)
        ? Object.fromEntries(
            Object.entries(saved.mappingJson as Record<string, unknown>).filter(
              (entry): entry is [string, string] =>
                deterministic.headers.includes(entry[0]) &&
                typeof entry[1] === "string" &&
                Boolean(canonicalFields[file.entityType][entry[1]]),
            ),
          )
        : null;
      const mappingForReview = savedMapping && Object.keys(savedMapping).length
        ? savedMapping
        : deterministic.mapping;
      const savedMappingUsed = mappingForReview === savedMapping;
      if (
        savedMappingUsed &&
        saved?.sourceSystem &&
        saved.sourceSystem !== "manual-export" &&
        saved.sourceSystem !== "other-system-export" &&
        revorySourceSystems.some(([sourceSystem]) => sourceSystem === saved.sourceSystem)
      ) {
        rememberedSourceSystems.add(saved.sourceSystem as NonNullable<SourceSystemDetection["sourceSystem"]>);
      }
      const baseConfidence = calculateReviewedMappingConfidence({
        entityType: file.entityType,
        headers: deterministic.headers,
        mapping: mappingForReview,
      });
      const needsAssistance =
        baseConfidence < 0.95 ||
        deterministic.headers.some((header) => !mappingForReview[header]);
      const assistance = needsAssistance
        ? await requestCanonicalMappingAssistance({ ...deterministic, confidence: baseConfidence, mapping: mappingForReview })
        : { mapping: mappingForReview, providerUsed: false, warnings: [] };
      const confidence = calculateReviewedMappingConfidence({
        entityType: file.entityType,
        headers: deterministic.headers,
        mapping: assistance.mapping,
      });
      const issues = validateReviewedCanonicalMapping({
        confidence,
        detectedEntityType: deterministic.detectedEntityType,
        entityType: file.entityType,
        mapping: assistance.mapping,
      });
      files.push({
        ...deterministic,
        acceptedForReview: !issues.some((issue) => issue.startsWith("Blocked:")),
        aiProviderUsed: assistance.providerUsed,
        aiWarnings: assistance.warnings,
        confidence,
        issues,
        mapping: assistance.mapping,
        savedMappingUsed,
      });
    }
    const rememberedSourceSystem = rememberedSourceSystems.size === 1
      ? [...rememberedSourceSystems][0]
      : null;
    const rememberedSourceLabel = rememberedSourceSystem
      ? revorySourceSystems.find(([sourceSystem]) => sourceSystem === rememberedSourceSystem)?.[1]
      : null;
    const sourceDetection: SourceSystemDetection = rememberedSourceSystem && rememberedSourceLabel
      ? {
          confidence: "HIGH",
          label: rememberedSourceLabel,
          matchedSignals: ["workspace-confirmed column pattern"],
          sourceSystem: rememberedSourceSystem,
        }
      : detectSourceSystem(files.map((file) => ({ fileName: file.fileName, headers: file.headers })));
    return {
      files,
      message: files.every((file) => file.acceptedForReview)
        ? "Check the column matches below, then confirm the import."
        : "One or more files need attention. Fix the highlighted problems before importing.",
      sourceDetection,
      status: files.every((file) => file.acceptedForReview) ? "ready" : "error",
    };
  } catch (error) {
    return {
      files: [],
      message: error instanceof Error ? error.message : "REVORY could not profile these files safely.",
      sourceDetection: emptySourceDetection,
      status: "error",
    };
  }
}

export async function importCanonicalFiles(
  _state: CanonicalImportActionState,
  formData: FormData,
): Promise<CanonicalImportActionState> {
  const context = await getAppContext();
  if (!context) return { status: "error", message: "Sign in again before importing data." };
  if (!(await getCapabilityAccess(context.workspace.id, "QUOTE_RECOVERY")).allowed) return { status: "error", message: "An active REVORY entitlement is required." };
  if (formData.get("mappingConfirmed") !== "yes") {
    return { status: "error", message: "Explicitly confirm the reviewed mapping before import." };
  }
  if (formData.get("snapshotMode") !== "FULL_REPLACEMENT") {
    return { status: "error", message: "Confirm that each selected entity/source file is a complete replacement snapshot." };
  }
  const importAccess = await getCanonicalImportAccessNotice(context.workspace.id);
  if (importAccess.blocked) {
    return {
      status: "error",
      message:
        importAccess.mode === "AUDIT"
          ? "This one-time Audit has already been used. Choose an ongoing plan or contact support before creating another read."
          : "An active REVORY entitlement is required.",
    };
  }
  if (
    importAccess.requiresConsumptionConfirmation &&
    formData.get("auditConsumptionConfirmed") !== "yes"
  ) {
    return {
      status: "error",
      message: "Confirm that this committed snapshot should consume the one-time Quote Recovery Audit.",
    };
  }
  if (
    (await checkRateLimit({
      key: `canonical-import:${context.workspace.id}`,
      limit: 8,
      windowMs: 10 * 60 * 1000,
    })).limited
  ) {
    return { status: "error", message: "Too many import attempts. Wait a few minutes and retry." };
  }

  const sourceSystem =
    String(formData.get("sourceSystem") ?? "manual-export").trim().slice(0, 80) ||
    "manual-export";
  const volumePolicy = await getCanonicalVolumePolicy(context.workspace.id);
  const submitted = await readSubmittedFiles(formData, volumePolicy);
  if (!submitted.length) return { status: "error", message: "Choose at least one reviewed file." };
  if (submitted.some((file) => ["JOB", "INVOICE", "CHANGE_ORDER", "COST"].includes(file.entityType)) && !(await getCapabilityAccess(context.workspace.id, "REVENUE_REALIZATION")).allowed) {
    return { status: "error", message: "Revenue Realization requires Pro access or an authorized internal preview." };
  }

  try {
    const files: IntakeFile[] = [];
    for (const file of submitted) {
      const mappingValue = formData.get(`mapping_${file.entityType}`);
      if (typeof mappingValue !== "string") {
        return { status: "error", message: `${file.fileName}: reviewed mapping is missing.` };
      }
      const parsed = JSON.parse(mappingValue) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { status: "error", message: `${file.fileName}: reviewed mapping is invalid.` };
      }
      const mapping = Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0,
        ),
      );
      const review = await buildCanonicalMappingReview(file);
      if (Object.keys(mapping).some((header) => !review.headers.includes(header))) {
        return { status: "error", message: `${file.fileName}: mapping contains a header not present in the file.` };
      }
      const confidence = calculateReviewedMappingConfidence({
        entityType: file.entityType,
        headers: review.headers,
        mapping,
      });
      const issues = validateReviewedCanonicalMapping({
        confidence,
        detectedEntityType: review.detectedEntityType,
        entityType: file.entityType,
        mapping,
      });
      if (issues.length) return { status: "error", message: issues[0], issues };
      files.push({ ...file, mapping, sourceSystem });
    }

    const plan = await buildSecureIntakePlan({ workspaceId: context.workspace.id, files, limits: volumePolicy, defaultCurrency: context.workspace.defaultCurrency });
    if (!plan.accepted) {
      return {
        status: "error",
        message: "Data Quality blocked this import. Correct the files and review again.",
        issues: plan.issues.slice(0, 8).map(
          (issue) =>
            `${issue.fileName}${issue.rowNumber ? ` row ${issue.rowNumber}` : ""}: ${issue.message}`,
        ),
      };
    }
    const existingSession = await prisma.canonicalImportSession.findUnique({
      where: { workspaceId_idempotencyKey: { workspaceId: context.workspace.id, idempotencyKey: plan.idempotencyKey } },
      select: { id: true, status: true },
    });
    const existingRun = existingSession?.status === "COMMITTED"
      ? await prisma.quoteRecoveryAnalysisRun.findUnique({ where: { importSessionId: existingSession.id } })
      : null;
    const reservation = existingSession?.status === "COMMITTED"
      ? null
      : await reserveQuoteRecoveryAnalysisRunCapacity(context.workspace.id);
    let capacitySettled = false;
    let canonicalCommitted = existingSession?.status === "COMMITTED";
    let result;
    try {
      result = await persistSecureIntakePlan({ workspaceId: context.workspace.id, plan, snapshotMode: "FULL_REPLACEMENT" });
      canonicalCommitted = canonicalCommitted || result.created;
      if (!result.created) {
        await releaseQuoteRecoveryAnalysisRunCapacity(reservation);
        capacitySettled = true;
      }
      const findingSync = await syncQuoteRecoveryFindingsForWorkspace(context.workspace.id);
      await syncRevenueRealizationFindingsForWorkspace(context.workspace.id);
      if (result.created || !existingRun) {
        await createQuoteRecoveryAnalysisRun(context.workspace.id, result.created ? reservation : null, result.session.id);
        capacitySettled = true;
      }
      await captureGrowthIntelligenceSnapshot(context.workspace.id);
      if (
        result.created &&
        formData.get("sourceDetectionConfirmed") === "yes" &&
        String(formData.get("detectedSourceSystem") ?? "") === sourceSystem
      ) {
        await prisma.workspaceAuditEvent.create({
          data: {
            workspaceId: context.workspace.id,
            actorUserId: context.user.id,
            action: "SOURCE_SYSTEM_SUGGESTION_CONFIRMED",
            metadataJson: {
              confidence: String(formData.get("sourceDetectionConfidence") ?? "UNKNOWN"),
              sourceSystem,
            },
          },
        });
      }
      revalidatePath("/app/imports");
      revalidatePath("/app/dashboard");
      revalidatePath("/app/revenue-realization");
      revalidatePath("/app/revenue-realization/report");
      revalidatePath("/app/history");
      return {
        status: "committed",
        message: result.created
          ? "Your files were imported and the latest REVORY read is ready. Each selected dataset replaced its prior active snapshot while preserving history."
          : "This unchanged import was already committed; no records were duplicated.",
        acceptedCount: result.session.acceptedCount,
        findingCount: findingSync.activeCount,
        unmatchedCount: plan.linkCoverage.unmatched,
        eligibleRules: Object.entries(plan.eligibility)
          .filter(([, state]) => state.eligible)
          .map(([rule]) => rule),
      };
    } catch (error) {
      if (!capacitySettled && !canonicalCommitted) await releaseQuoteRecoveryAnalysisRunCapacity(reservation);
      throw error;
    }
  } catch (error) {
    console.error("Canonical REVORY import failed.", error);
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "REVORY could not commit this import. No partial batch was kept.",
    };
  }
}
