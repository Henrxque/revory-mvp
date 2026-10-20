import { monitorLiveMode } from "@/services/ai-integrity/commercial-runtime";
import { NextResponse } from "next/server";
import { getAppContext } from "@/services/app/get-app-context";
import { prisma } from "@/db/prisma";
import { recurringEnabled } from "@/services/ai-integrity/recurring-access";
import { configureMonitor, skipMonitorPeriod, changeMonitorStatus, rotateLedgerToken, submitMonitorLedger, investigateMonitorSignal } from "@/services/ai-integrity/recurring-monitor";
import { createMonitorCheckout, monitorPortal } from "@/services/ai-integrity/monitor-billing";
import { readAiBoundedText } from "@/services/ai-integrity/request-text";
import { checkRateLimit } from "@/services/security/rate-limit";
import { validOrigin } from "../_shared";
import { hasCurrentAccountLegalAcceptance } from "@/services/legal/acceptance";

const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: Request) {
  if (!recurringEnabled()) return NextResponse.json({ error: "Unavailable." }, { status: 404, headers });
  const context = await getAppContext();
  if (!context) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
  if (!request.headers.get("origin") || !validOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403, headers });
  if (context.workspace.ownerUserId !== context.user.id) return NextResponse.json({ error: "Workspace owner access required." }, { status: 403, headers });
  if ((await checkRateLimit({ key: "ai-recurring:" + context.workspace.id, limit: 20, windowMs: 600000 })).limited) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429, headers });
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error();
    const body = JSON.parse(await readAiBoundedText(request, 12000));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    const { action, ...input } = body;
    const workspaceId = context.workspace.id, actor = context.user.id;
    if (!["PAUSE", "REVOKE_TOKEN", "REVIEW", "PORTAL"].includes(action) && !await hasCurrentAccountLegalAcceptance(actor)) return NextResponse.json({ error: "Review the current account terms first." }, { status: 403, headers });
    if (action === "CONFIGURE") return NextResponse.json(await configureMonitor(workspaceId, actor, input), { headers });
    if (action === "PAUSE") await changeMonitorStatus(workspaceId, actor, "PAUSED");
    else if (action === "RESUME") {
      if (input.consentConfirmed !== true || input.scopeReviewed !== true) throw new Error();
      await changeMonitorStatus(workspaceId, actor, "ACTIVE", input.consentUntil, input.emailEnabled);
    } else if (action === "TOKEN") return NextResponse.json({ token: await rotateLedgerToken(workspaceId, actor) }, { headers });
    else if (action === "REVOKE_TOKEN") await rotateLedgerToken(workspaceId, actor, true);
    else if (action === "LEDGER") return NextResponse.json(await submitMonitorLedger(workspaceId, actor, input), { headers });
    else if (action === "SKIP") await skipMonitorPeriod(workspaceId, actor, input);
    else if (action === "REVIEW") await investigateMonitorSignal(workspaceId, actor, input);
    else if (action === "CHECKOUT") {
      if (input.termsAccepted !== true || input.recurringAccepted !== true || input.testModeConfirmed !== !monitorLiveMode()) throw new Error();
      return NextResponse.json(await createMonitorCheckout(workspaceId, actor, context.user.email, input.requestKey), { headers });
    } else if (action === "PORTAL") return NextResponse.json(await monitorPortal(workspaceId, actor), { headers });
    else throw new Error();
    return NextResponse.json({ saved: true }, { headers });
  } catch {
    // Do not return provider errors, credential material or raw state.
    console.error(JSON.stringify({ message: "ai_recurring_action_failed", workspaceId: context.workspace.id }));
    return NextResponse.json({ error: "Unable to save. Check your paid subscription, source connections, next period and reviewed consent. Refresh if another tab changed this setup." }, { status: 400, headers });
  }
}

export async function GET() {
  if (!recurringEnabled()) return NextResponse.json({ error: "Unavailable." }, { status: 404, headers });
  const context = await getAppContext();
  if (!context || context.workspace.ownerUserId !== context.user.id) return NextResponse.json({ error: "Owner access required." }, { status: 403, headers });
  const rows = await prisma.aiIntegrityMonitorState.findMany({ where: { workspaceId: context.workspace.id, kind: { in: ["RUN", "INVESTIGATION", "SCHEDULE", "SUBSCRIPTION", "NOTICE"] } }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, kind: true, key: true, status: true, revision: true, dataJson: true, updatedAt: true } });
  return NextResponse.json({ rows: rows.map(row => { if (row.kind !== "SUBSCRIPTION") return row; const data = row.dataJson as { paidThrough?: string; cancelAt?: string | null }; return { ...row, dataJson: { paidThrough: data.paidThrough, cancelAt: data.cancelAt } }; }) }, { headers });
}
