import { NextResponse } from "next/server";
import { getAppContext } from "@/services/app/get-app-context";
import { isAiConnectedReportsEnabled } from "@/services/ai-integrity/connected-report-access";
import { saveConnectedReportDraft } from "@/services/ai-integrity/report-draft";
import { readAiBoundedText } from "@/services/ai-integrity/request-text";
import { checkRateLimit } from "@/services/security/rate-limit";
import { validOrigin } from "@/src/app/api/ai-integrity/_shared";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isAiConnectedReportsEnabled()) return NextResponse.json({ error: "Unavailable." }, { status: 404, headers });
  const context = await getAppContext();
  if (!context) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
  if (!request.headers.get("origin") || !validOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403, headers });
  if ((await checkRateLimit({ key: `connected-setup:${context.workspace.id}:${context.user.id}`, limit: 20, windowMs: 600000 })).limited) return NextResponse.json({ error: "Too many setup saves." }, { status: 429, headers });
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error();
    const draft = await saveConnectedReportDraft(context.workspace.id, context.user.id, JSON.parse(await readAiBoundedText(request, 8192)));
    return NextResponse.json({ revision: draft.revision }, { headers });
  } catch { return NextResponse.json({ error: "Setup could not be saved. Check the selected sources or reload if another tab changed it." }, { status: 400, headers }); }
}
