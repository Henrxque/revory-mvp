import { NextResponse } from "next/server";

import { getAppContext } from "@/services/app/get-app-context";
import { canUseAiIntegrityIntakePreview } from "@/services/ai-integrity/internal-access";
import { buildAiIntakePlan } from "@/services/ai-integrity/intake";
import { persistAiIntegrityBatch } from "@/services/ai-integrity/persist-batch";
import { requireAiScanPreparationAccess } from "@/services/ai-integrity/purchase";
import { checkRateLimit } from "@/services/security/rate-limit";
import { readAiIntakeRequest, readMapping, validOrigin } from "@/src/app/api/ai-integrity/_shared";

export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await canUseAiIntegrityIntakePreview(context.workspace.id))) return NextResponse.json({ error: "Unavailable." }, { status: 404 });
  if (!validOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if ((await checkRateLimit({ key: `ai-integrity-import:${context.workspace.id}`, limit: 8, windowMs: 10 * 60 * 1000 })).limited) return NextResponse.json({ error: "Too many import attempts." }, { status: 429 });
  try {
    await requireAiScanPreparationAccess(context.workspace.id);
    const { file, form, metadata } = await readAiIntakeRequest(request);
    if (form.get("mappingConfirmed") !== "yes") throw new Error("Confirm the reviewed column mapping before import.");
    const plan = await buildAiIntakePlan(file, { ...metadata, workspaceId: context.workspace.id }, readMapping(form));
    if (!plan.batch || !plan.reviewToken) throw new Error("No valid rows remain; review the Data Quality issues.");
    if (form.get("reviewToken") !== plan.reviewToken) throw new Error("File, mapping or window changed after review. Review again before importing.");
    const result = await persistAiIntegrityBatch(plan.batch, context.user.id);
    return NextResponse.json({ batchId: result.batch.id, replayed: result.replayed, acceptedCount: plan.acceptedCount, rejectedCount: plan.rejectedCount, insertedCount: result.batch.insertedCount, duplicateCount: result.batch.duplicateCount, issueCount: plan.issues.length, issues: plan.issues.slice(0, 50), message: "Rows stored for later reconciliation. No financial finding was generated." }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to import file safely." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
}

export async function GET() { return NextResponse.json({ error: "Use POST." }, { status: 405, headers: { Allow: "POST" } }); }
