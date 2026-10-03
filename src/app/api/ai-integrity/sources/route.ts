import { NextResponse } from "next/server";
import { getAppContext } from "@/services/app/get-app-context";
import { isAiSourceRehearsalEnabled, consentAiSourceRehearsal, revokeAiSourceRehearsal, syncAiSourceRehearsal } from "@/services/ai-integrity/connected-sources";
import { readAiBoundedText } from "@/services/ai-integrity/request-text";
import { checkRateLimit } from "@/services/security/rate-limit";
import { validOrigin } from "@/src/app/api/ai-integrity/_shared";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isAiSourceRehearsalEnabled()) return NextResponse.json({ error: "Unavailable." }, { status: 404, headers });
  const context = await getAppContext(); if (!context) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
  if (!validOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403, headers });
  if ((await checkRateLimit({ key: `ai-source:${context.workspace.id}`, limit: 20, windowMs: 600000 })).limited) return NextResponse.json({ error: "Too many source attempts." }, { status: 429, headers });
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("JSON required.");
    const raw = JSON.parse(await readAiBoundedText(request, 8192));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid source request.");
    const { action, ...input } = raw;
    if (action === "CONSENT") { const connection = await consentAiSourceRehearsal(context.workspace.id, context.user.id, input); return NextResponse.json({ id: connection.id, status: connection.status, mode: connection.mode }, { headers }); }
    if (action === "REVOKE") { const connection = await revokeAiSourceRehearsal(context.workspace.id, context.user.id, input); return NextResponse.json({ id: connection.id, status: connection.status, mode: connection.mode }, { headers }); }
    if (action === "SYNC") { const result = await syncAiSourceRehearsal(context.workspace.id, context.user.id, input); return NextResponse.json({ syncId: result.sync.id, status: result.sync.status, replayed: result.replayed, mode: "SYNTHETIC_REHEARSAL" }, { headers }); }
    throw new Error("Unsupported source action.");
  } catch { return NextResponse.json({ error: "Source rehearsal was not changed. Check synthetic consent and a contiguous closed window; retry with the same request." }, { status: 400, headers }); }
}
