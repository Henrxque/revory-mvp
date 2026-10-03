import { NextResponse } from "next/server";
import { requireAiScanPreparationAccess } from "@/services/ai-integrity/purchase";

import { getAppContext } from "@/services/app/get-app-context";
import { canUseAiIntegrityIntakePreview } from "@/services/ai-integrity/internal-access";
import { buildAiIntakePlan, reviewAiIntakeFile } from "@/services/ai-integrity/intake";
import { checkRateLimit } from "@/services/security/rate-limit";
import { readAiIntakeRequest, readMapping, validOrigin } from "@/src/app/api/ai-integrity/_shared";

export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await canUseAiIntegrityIntakePreview(context.workspace.id))) return NextResponse.json({ error: "Unavailable." }, { status: 404 });
  if (!validOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if ((await checkRateLimit({ key: `ai-integrity-review:${context.workspace.id}`, limit: 15, windowMs: 10 * 60 * 1000 })).limited) return NextResponse.json({ error: "Too many review attempts." }, { status: 429 });
  try {
    await requireAiScanPreparationAccess(context.workspace.id);
    const { file, form, metadata } = await readAiIntakeRequest(request);
    const review = await reviewAiIntakeFile(file, metadata.sourceKind);
    if (form.get("mapping") === null) return NextResponse.json({ review }, { headers: { "Cache-Control": "private, no-store" } });
    const plan = await buildAiIntakePlan(file, { ...metadata, workspaceId: context.workspace.id }, readMapping(form));
    return NextResponse.json({ review, plan: { acceptedCount: plan.acceptedCount, rejectedCount: plan.rejectedCount, issueCount: plan.issues.length, issues: plan.issues.slice(0, 50), reviewToken: plan.reviewToken } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to review file safely." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
}

export async function GET() { return NextResponse.json({ error: "Use POST." }, { status: 405, headers: { Allow: "POST" } }); }
