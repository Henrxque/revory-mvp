import { NextResponse } from "next/server";
import { getAppContext } from "@/services/app/get-app-context";
import { getAiSourceArtifact, isAiSourceRehearsalEnabled } from "@/services/ai-integrity/connected-sources";

export async function GET(_request: Request, context: { params: Promise<{ syncId: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isAiSourceRehearsalEnabled()) return NextResponse.json({ error: "Unavailable." }, { status: 404, headers });
  const app = await getAppContext(); if (!app) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
  const { syncId } = await context.params;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(syncId)) return NextResponse.json({ error: "Read unavailable." }, { status: 404, headers });
  const artifact = await getAiSourceArtifact(app.workspace.id, syncId);
  if (!artifact) return NextResponse.json({ error: "Read unavailable." }, { status: 404, headers });
  return NextResponse.json({ format: "revory-connected-source-rehearsal/v1", artifact }, { headers: { ...headers, "Content-Disposition": `attachment; filename="revory-source-rehearsal-${syncId}.json"` } });
}
