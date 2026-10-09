import type { AiIntegritySourceKind } from "@/domain/ai-integrity/contracts";
import { AI_INTAKE_MAX_FILE_BYTES, type AiIntakeFile, type AiIntakeMetadata } from "@/services/ai-integrity/intake";
import { readBoundedMultipartFormData } from "@/services/security/bounded-form-data";
import { assertAiSyntheticPreviewSample } from "@/services/ai-integrity/synthetic-sample-policy";

export function validOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

export async function readAiIntakeRequest(request: Request) {
  const form = await readBoundedMultipartFormData(request, AI_INTAKE_MAX_FILE_BYTES + 256 * 1024);
  const fileValue = form.get("file");
  if (!fileValue || typeof fileValue === "string" || typeof fileValue.arrayBuffer !== "function") throw new Error("Choose one CSV or XLSX file.");
  if (!fileValue.size || fileValue.size > AI_INTAKE_MAX_FILE_BYTES) throw new Error("File exceeds the 8 MB intake limit.");
  const file: AiIntakeFile = { bytes: new Uint8Array(await fileValue.arrayBuffer()), fileName: fileValue.name, mimeType: fileValue.type };
  const sourceKind = String(form.get("sourceKind") ?? "") as AiIntegritySourceKind;
  if (!["STRIPE_REVENUE", "INTERNAL_LEDGER", "PROVIDER_REPORT"].includes(sourceKind)) throw new Error("Choose a supported source type.");
  assertAiSyntheticPreviewSample(file, sourceKind);
  const metadata = {
    sourceKind,
    sourceSystem: String(form.get("sourceSystem") ?? "").trim().slice(0, 80),
    windowStart: String(form.get("windowStart") ?? ""),
    windowEnd: String(form.get("windowEnd") ?? ""),
    sourceTimezone: String(form.get("sourceTimezone") ?? "UTC").trim().slice(0, 80),
  } satisfies Omit<AiIntakeMetadata, "workspaceId">;
  if (!metadata.sourceSystem) throw new Error("Source system is required for provenance.");
  return { file, form, metadata };
}

export function readMapping(form: FormData) {
  const raw = form.get("mapping");
  if (typeof raw !== "string" || raw.length > 20_000) throw new Error("Reviewed column mapping is required.");
  const value = JSON.parse(raw) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Column mapping must be an object.");
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.some(([, target]) => typeof target !== "string")) throw new Error("Column mapping values must be field names.");
  return Object.fromEntries(entries) as Record<string, string>;
}
