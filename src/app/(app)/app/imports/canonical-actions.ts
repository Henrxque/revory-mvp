"use server";

import { revalidatePath } from "next/cache";

import type { CanonicalEntityType } from "@/domain/revory/contracts";
import { canonicalEntityTypes } from "@/domain/revory/contracts";
import { getAppContext } from "@/services/app/get-app-context";
import {
  buildCanonicalMappingReview,
  calculateReviewedMappingConfidence,
  type CanonicalMappingReview,
  validateReviewedCanonicalMapping,
} from "@/services/canonical-intake/assisted-mapping";
import { requestCanonicalMappingAssistance } from "@/services/canonical-intake/ai-assisted-mapping";
import { persistSecureIntakePlan } from "@/services/canonical-intake/persist-intake";
import { buildSecureIntakePlan, type IntakeFile } from "@/services/canonical-intake/secure-intake";
import { createQuoteRecoveryAnalysisRun } from "@/services/quote-recovery/analysis-runs";
import { syncQuoteRecoveryFindingsForWorkspace } from "@/services/quote-recovery/sync-findings";
import { syncRevenueRealizationFindingsForWorkspace } from "@/services/revenue-realization/sync-findings";
import { checkRateLimit } from "@/services/security/rate-limit";

export type CanonicalReviewFile = CanonicalMappingReview & {
  aiProviderUsed: boolean;
  aiWarnings: string[];
};

export type CanonicalReviewActionState = {
  files: CanonicalReviewFile[];
  message: string;
  status: "error" | "ready";
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

async function readSubmittedFiles(formData: FormData) {
  const files: Array<{
    bytes: Uint8Array;
    entityType: CanonicalEntityType;
    fileName: string;
    mimeType: string;
  }> = [];
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
    files.push({
      bytes: new Uint8Array(await value.arrayBuffer()),
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
  if (!context) return { files: [], message: "Sign in again before reviewing data.", status: "error" };
  if (
    checkRateLimit({
      key: `canonical-review:${context.workspace.id}`,
      limit: 12,
      windowMs: 10 * 60 * 1000,
    }).limited
  ) {
    return { files: [], message: "Too many review attempts. Wait a few minutes and retry.", status: "error" };
  }

  const submitted = await readSubmittedFiles(formData);
  if (!submitted.length) return { files: [], message: "Choose at least one CSV or XLSX file.", status: "error" };

  try {
    const files: CanonicalReviewFile[] = [];
    for (const file of submitted) {
      const deterministic = await buildCanonicalMappingReview(file);
      const needsAssistance =
        deterministic.confidence < 0.95 ||
        deterministic.headers.some((header) => !deterministic.mapping[header]);
      const assistance = needsAssistance
        ? await requestCanonicalMappingAssistance(deterministic)
        : { mapping: deterministic.mapping, providerUsed: false, warnings: [] };
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
      });
    }
    return {
      files,
      message: files.every((file) => file.acceptedForReview)
        ? "Review every suggested mapping, then explicitly confirm the import."
        : "Data Quality blocked one or more files. Resolve the listed issues before import.",
      status: files.every((file) => file.acceptedForReview) ? "ready" : "error",
    };
  } catch (error) {
    return {
      files: [],
      message: error instanceof Error ? error.message : "REVORY could not profile these files safely.",
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
  if (formData.get("mappingConfirmed") !== "yes") {
    return { status: "error", message: "Explicitly confirm the reviewed mapping before import." };
  }
  if (
    checkRateLimit({
      key: `canonical-import:${context.workspace.id}`,
      limit: 8,
      windowMs: 10 * 60 * 1000,
    }).limited
  ) {
    return { status: "error", message: "Too many import attempts. Wait a few minutes and retry." };
  }

  const sourceSystem =
    String(formData.get("sourceSystem") ?? "manual-export").trim().slice(0, 80) ||
    "manual-export";
  const submitted = await readSubmittedFiles(formData);
  if (!submitted.length) return { status: "error", message: "Choose at least one reviewed file." };

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

    const plan = await buildSecureIntakePlan({ workspaceId: context.workspace.id, files });
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
    const result = await persistSecureIntakePlan({ workspaceId: context.workspace.id, plan });
    const findingSync = await syncQuoteRecoveryFindingsForWorkspace(context.workspace.id);
    await syncRevenueRealizationFindingsForWorkspace(context.workspace.id);
    if (result.created) await createQuoteRecoveryAnalysisRun(context.workspace.id);
    revalidatePath("/app/imports");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/revenue-realization");
    revalidatePath("/app/revenue-realization/report");
    return {
      status: "committed",
      message: result.created
        ? "Canonical import committed atomically."
        : "This unchanged import was already committed; no records were duplicated.",
      acceptedCount: result.session.acceptedCount,
      findingCount: findingSync.activeCount,
      unmatchedCount: plan.linkCoverage.unmatched,
      eligibleRules: Object.entries(plan.eligibility)
        .filter(([, state]) => state.eligible)
        .map(([rule]) => rule),
    };
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
