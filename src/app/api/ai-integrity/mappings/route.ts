import { NextResponse } from "next/server";
import { requireAiScanPreparationAccess } from "@/services/ai-integrity/purchase";

import { canUseAiIntegrityIntakePreview } from "@/services/ai-integrity/internal-access";
import { createAiIdentityMapping, revokeAiIdentityMapping } from "@/services/ai-integrity/identity";
import { getAppContext } from "@/services/app/get-app-context";
import { checkRateLimit } from "@/services/security/rate-limit";
import { validOrigin } from "@/src/app/api/ai-integrity/_shared";

async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Error("JSON body required.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Empty request body.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 8_192) { await reader.cancel(); throw new Error("Mapping request is too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid mapping request.");
  return parsed as Record<string, unknown>;
}

async function authorize(request: Request) {
  const context = await getAppContext();
  if (!context) return { response: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  if (!(await canUseAiIntegrityIntakePreview(context.workspace.id))) return { response: NextResponse.json({ error: "Unavailable." }, { status: 404 }) };
  if (!validOrigin(request)) return { response: NextResponse.json({ error: "Invalid origin." }, { status: 403 }) };
  if ((await checkRateLimit({ key: `ai-integrity-mapping:${context.workspace.id}`, limit: 20, windowMs: 10 * 60 * 1000 })).limited) return { response: NextResponse.json({ error: "Too many mapping changes." }, { status: 429 }) };
  return { context };
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;
  try {
    await requireAiScanPreparationAccess(auth.context.workspace.id);
    const body = await readJson(request);
    if (body.kind !== "STRIPE_CUSTOMER" && body.kind !== "PROVIDER_PROJECT") throw new Error("Choose a supported identity kind.");
    const required = ["externalId", "internalCustomerExternalId", "sourceBatchId", "ledgerBatchId", "validFrom", "validUntil"] as const;
    if (required.some((key) => typeof body[key] !== "string" || !(body[key] as string).trim())) throw new Error("Complete the exact IDs, batches and period.");
    const mapping = await createAiIdentityMapping({ workspaceId: auth.context.workspace.id, actorUserId: auth.context.user.id,
      kind: body.kind, externalId: body.externalId as string, internalCustomerExternalId: body.internalCustomerExternalId as string,
      sourceBatchId: body.sourceBatchId as string, ledgerBatchId: body.ledgerBatchId as string,
      validFrom: body.validFrom as string, validUntil: body.validUntil as string,
      provider: typeof body.provider === "string" ? body.provider : undefined,
      organizationId: typeof body.organizationId === "string" ? body.organizationId : null,
      exclusiveProjectConfirmed: body.exclusiveProjectConfirmed === true });
    return NextResponse.json({ id: mapping.id, status: mapping.status }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to review mapping." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
}

export async function PATCH(request: Request) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;
  try {
    await requireAiScanPreparationAccess(auth.context.workspace.id);
    const body = await readJson(request);
    if (typeof body.mappingId !== "string" || !body.mappingId) throw new Error("Mapping ID required.");
    const mapping = await revokeAiIdentityMapping(auth.context.workspace.id, auth.context.user.id, body.mappingId);
    return NextResponse.json({ id: mapping.id, status: mapping.status }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to revoke mapping." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
}

export async function GET() { return NextResponse.json({ error: "Use POST or PATCH." }, { status: 405, headers: { Allow: "POST, PATCH" } }); }
