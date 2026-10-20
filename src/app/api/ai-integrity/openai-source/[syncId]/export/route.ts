import { NextResponse } from "next/server";
import { getAppContext } from "@/services/app/get-app-context";
import { getOpenAiSourceArtifact, isOpenAiControlledSourceEnabled } from "@/services/ai-integrity/openai-source";

export async function GET(_request: Request, { params }: { params: Promise<{ syncId: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  const context = await getAppContext();
  if (!context) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
  if (!isOpenAiControlledSourceEnabled(context.workspace.id)) return NextResponse.json({ error: "Unavailable." }, { status: 404, headers });
  const { syncId } = await params;
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(syncId)) return NextResponse.json({ error: "Unavailable." }, { status: 404, headers });
  try {
    const artifact = await getOpenAiSourceArtifact(context.workspace.id, syncId);
    if (!artifact) return NextResponse.json({ error: "Unavailable." }, { status: 404, headers });
    return NextResponse.json({ format: "revory-openai-source/v1", artifact }, { headers: { ...headers, "Content-Disposition": `attachment; filename="revory-openai-source-${syncId}.json"` } });
  } catch { return NextResponse.json({ error: "Source evidence is unavailable." }, { status: 409, headers }); }
}
