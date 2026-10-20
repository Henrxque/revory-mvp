import { NextResponse } from "next/server";
import { recurringEnabled } from "@/services/ai-integrity/recurring-access";
import { authenticateLedgerToken, ingestMonitorLedger } from "@/services/ai-integrity/recurring-monitor";
import { readAiBoundedText } from "@/services/ai-integrity/request-text";
import { checkRateLimit } from "@/services/security/rate-limit";
export async function POST(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!recurringEnabled()) return NextResponse.json({ error: "Unavailable." }, { status: 404, headers });
  const { workspaceId } = await context.params, token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  try { await authenticateLedgerToken(workspaceId, token); }
  catch { return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers }); }
  if ((await checkRateLimit({ key: "ai-ledger:" + workspaceId, limit: 30, windowMs: 3600000 })).limited) return NextResponse.json({ error: "Try again later." }, { status: 429, headers });
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error();
    const input = JSON.parse(await readAiBoundedText(request, 2 * 1024 * 1024));
    return NextResponse.json(await ingestMonitorLedger(workspaceId, token, input), { status: 202, headers });
  } catch {
    console.error(JSON.stringify({ message: "ai_monitor_ledger_rejected", workspaceId }));
    return NextResponse.json({ error: "Invalid or unauthorized ledger. Check the next UTC period, canonical schema, row limit, completeness and export lag." }, { status: 400, headers });
  }
}
