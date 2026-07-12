"use server";

import { revalidatePath } from "next/cache";

import type { CanonicalEntityType } from "@/domain/revory/contracts";
import { canonicalEntityTypes } from "@/domain/revory/contracts";
import { getAppContext } from "@/services/app/get-app-context";
import { canonicalFields } from "@/services/canonical-intake/definitions";
import { persistSecureIntakePlan } from "@/services/canonical-intake/persist-intake";
import { buildSecureIntakePlan } from "@/services/canonical-intake/secure-intake";
import { checkRateLimit } from "@/services/security/rate-limit";
import { syncQuoteRecoveryFindingsForWorkspace } from "@/services/quote-recovery/sync-findings";
import { createQuoteRecoveryAnalysisRun } from "@/services/quote-recovery/analysis-runs";

export type CanonicalImportActionState = { status: "idle" | "error" | "committed"; message: string; acceptedCount?: number; findingCount?: number; unmatchedCount?: number; eligibleRules?: string[]; issues?: string[] };
export const initialCanonicalImportActionState: CanonicalImportActionState = { status: "idle", message: "" };

export async function importCanonicalFiles(_state: CanonicalImportActionState, formData: FormData): Promise<CanonicalImportActionState> {
  const context = await getAppContext();
  if (!context) return { status: "error", message: "Sign in again before importing data." };
  if (formData.get("mappingConfirmed") !== "yes") return { status: "error", message: "Confirm the canonical template mapping before import." };
  if (checkRateLimit({ key: `canonical-import:${context.workspace.id}`, limit: 8, windowMs: 10 * 60 * 1000 }).limited) return { status: "error", message: "Too many import attempts. Wait a few minutes and retry." };
  const sourceSystem = String(formData.get("sourceSystem") ?? "manual-export").trim().slice(0, 80) || "manual-export";
  const files = [];
  for (const entityType of canonicalEntityTypes) {
    const value = formData.get(`file_${entityType}`);
    if (!(value instanceof File) || value.size === 0) continue;
    const mapping = Object.fromEntries(Object.keys(canonicalFields[entityType]).map((field) => [field, field]));
    files.push({ bytes: new Uint8Array(await value.arrayBuffer()), entityType: entityType as CanonicalEntityType, fileName: value.name, mimeType: value.type, sourceSystem, mapping });
  }
  if (!files.length) return { status: "error", message: "Choose at least one canonical CSV or XLSX file." };
  try {
    const plan = await buildSecureIntakePlan({ workspaceId: context.workspace.id, files });
    if (!plan.accepted) return { status: "error", message: "Data Quality blocked this import. Correct the files and retry.", issues: plan.issues.slice(0, 6).map((issue) => `${issue.fileName}${issue.rowNumber ? ` row ${issue.rowNumber}` : ""}: ${issue.message}`) };
    const result = await persistSecureIntakePlan({ workspaceId: context.workspace.id, plan });
    const findingSync = await syncQuoteRecoveryFindingsForWorkspace(context.workspace.id);
    if (result.created) await createQuoteRecoveryAnalysisRun(context.workspace.id);
    revalidatePath("/app/imports");
    return { status: "committed", message: result.created ? "Canonical import committed atomically." : "This unchanged import was already committed; no records were duplicated.", acceptedCount: result.session.acceptedCount, findingCount: findingSync.activeCount, unmatchedCount: plan.linkCoverage.unmatched, eligibleRules: Object.entries(plan.eligibility).filter(([, state]) => state.eligible).map(([rule]) => rule) };
  } catch (error) {
    console.error("Canonical REVORY import failed.", error);
    return { status: "error", message: "REVORY could not commit this import. No partial batch was kept." };
  }
}
