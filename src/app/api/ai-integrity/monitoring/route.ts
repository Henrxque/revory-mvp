import { NextResponse } from "next/server";
import { getAppContext } from "@/services/app/get-app-context";
import { isAiMonitorRehearsalEnabled, compareAiMonitorReports, acknowledgeAiMonitorAlert } from "@/services/ai-integrity/monitoring";
import { readAiBoundedText } from "@/services/ai-integrity/request-text";
import { checkRateLimit } from "@/services/security/rate-limit";
import { validOrigin } from "@/src/app/api/ai-integrity/_shared";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isAiMonitorRehearsalEnabled()) return NextResponse.json({ error: "Unavailable." }, { status: 404, headers });
  const context = await getAppContext();
  if (!context) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
  if (!validOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403, headers });
  if ((await checkRateLimit({ key: `ai-monitor:${context.workspace.id}`, limit: 30, windowMs: 600000 })).limited) return NextResponse.json({ error: "Too many monitoring attempts." }, { status: 429, headers });
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("JSON required.");
    const raw = JSON.parse(await readAiBoundedText(request, 8192));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid monitoring request.");
    const { action, ...input } = raw;
    if (action === "COMPARE") {
      const result = await compareAiMonitorReports(context.workspace.id, context.user.id, input);
      return NextResponse.json({ comparisonId: result.comparison.id, replayed: result.replayed, mode: "SYNTHETIC_REHEARSAL" }, { headers });
    }
    if (action === "ACKNOWLEDGE") {
      const alert = await acknowledgeAiMonitorAlert(context.workspace.id, context.user.id, input);
      return NextResponse.json({ alertId: alert.id, status: alert.status }, { headers });
    }
    throw new Error("Unsupported action.");
  } catch {
    return NextResponse.json({ error: "Monitoring rehearsal was not changed. Check synthetic confirmation and reports in this workspace." }, { status: 400, headers });
  }
}
