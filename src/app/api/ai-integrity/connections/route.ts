import { NextResponse } from "next/server";
import { getAppContext } from "@/services/app/get-app-context";
import { isAiCustomerSourcesEnabled, listAiCustomerSources, registerAiCustomerSource, revokeAiCustomerSource, syncAiCustomerSource } from "@/services/ai-integrity/customer-sources";
import { readAiBoundedText } from "@/services/ai-integrity/request-text";
import { checkRateLimit } from "@/services/security/rate-limit";
import { validOrigin } from "@/src/app/api/ai-integrity/_shared";
import { hasCurrentAccountLegalAcceptance } from "@/services/legal/acceptance";

export const maxDuration = 90;
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  if (!isAiCustomerSourcesEnabled()) return NextResponse.json({ error: "Unavailable." }, { status: 404, headers });
  const context = await getAppContext();
  if (!context) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
  try { return NextResponse.json({ connections: await listAiCustomerSources(context.workspace.id, context.user.id) }, { headers }); }
  catch { return NextResponse.json({ error: "Connections are unavailable for this account." }, { status: 403, headers }); }
}

export async function POST(request: Request) {
  if (!isAiCustomerSourcesEnabled()) return NextResponse.json({ error: "Unavailable." }, { status: 404, headers });
  const context = await getAppContext();
  if (!context) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
  if (!request.headers.get("origin") || !validOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403, headers });
  if ((await checkRateLimit({ key: `ai-customer-source:${context.workspace.id}:${context.user.id}`, limit: 8, windowMs: 600000 })).limited) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429, headers });
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error();
    const raw: unknown = JSON.parse(await readAiBoundedText(request, 8192));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error();
    const { action, ...input } = raw as Record<string, unknown>;
    if ((action === "REGISTER" || action === "SYNC") && !(await hasCurrentAccountLegalAcceptance(context.user.id))) return NextResponse.json({ error: "Review the current account terms before connecting a source." }, { status: 403, headers });
    if (action === "REGISTER") return NextResponse.json({ connection: await registerAiCustomerSource(context.workspace.id, context.user.id, input) }, { headers });
    if (action === "REVOKE") return NextResponse.json(await revokeAiCustomerSource(context.workspace.id, context.user.id, input), { headers });
    if (action === "SYNC") return NextResponse.json(await syncAiCustomerSource(context.workspace.id, context.user.id, input), { headers });
    throw new Error();
  } catch {
    return NextResponse.json({ error: "The connection action could not be completed. Check the credential type, consent period and confirmed test purchase. A read retry can use the same request key; interrupted reads become retryable after 15 minutes." }, { status: 400, headers });
  }
}
