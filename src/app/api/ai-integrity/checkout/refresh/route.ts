import { NextResponse } from "next/server";
import { getAppContext } from "@/services/app/get-app-context";
import { isAiIntegrityExperienceEnabled } from "@/services/ai-integrity/experience";
import { refreshAiScanOrder } from "@/services/ai-integrity/purchase";
import { readAiBoundedText } from "@/services/ai-integrity/request-text";
import { validOrigin } from "@/src/app/api/ai-integrity/_shared";
import { checkRateLimit } from "@/services/security/rate-limit";

export async function POST(request: Request) {
  if (!isAiIntegrityExperienceEnabled()) return NextResponse.json({ error: "Unavailable." }, { status: 404 });
  const context = await getAppContext();
  if (!context) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!validOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if ((await checkRateLimit({ key: `ai-scan-refresh:${context.workspace.id}`, limit: 20, windowMs: 600000 })).limited) return NextResponse.json({ error: "Too many status checks." }, { status: 429 });
  try {
    const body = JSON.parse(await readAiBoundedText(request, 8192));
    if (typeof body?.orderId !== "string") throw new Error("Order ID required.");
    const order = await refreshAiScanOrder(context.workspace.id, body.orderId);
    return NextResponse.json({ status: order.status, grantId: order.grant?.status === "ACTIVE" ? order.grant.id : null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Unable to verify this test purchase." }, { status: 400 }); }
}
