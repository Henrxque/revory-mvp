import { NextResponse } from "next/server";
import { getAppContext } from "@/services/app/get-app-context";
import { isAiIntegrityExperienceEnabled } from "@/services/ai-integrity/experience";
import { createAiScanCheckout } from "@/services/ai-integrity/purchase";
import { readAiBoundedText } from "@/services/ai-integrity/request-text";
import { checkRateLimit } from "@/services/security/rate-limit";
import { validOrigin } from "@/src/app/api/ai-integrity/_shared";

export async function POST(request: Request) {
  if (!isAiIntegrityExperienceEnabled()) return NextResponse.json({ error: "Unavailable." }, { status: 404 });
  const context = await getAppContext();
  if (!context) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!validOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if ((await checkRateLimit({ key: `ai-scan-checkout:${context.workspace.id}`, limit: 8, windowMs: 600000 })).limited) return NextResponse.json({ error: "Too many checkout attempts." }, { status: 429 });
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("JSON required.");
    const body = JSON.parse(await readAiBoundedText(request, 8192));
    if (body?.termsAccepted !== true || body?.testModeConfirmed !== true || typeof body?.requestKey !== "string") throw new Error("Review the one-time test purchase and terms before continuing.");
    const result = await createAiScanCheckout({ workspaceId: context.workspace.id, actorUserId: context.user.id, email: context.user.email, requestKey: body.requestKey });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Test checkout is unavailable or no longer open. Review configuration or refresh purchase status." }, { status: 400 }); }
}
