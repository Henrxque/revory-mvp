import { NextResponse } from "next/server";
import { getAppContext } from "@/services/app/get-app-context";
import { getAiCustomerSourceArtifact, isAiCustomerSourcesEnabled } from "@/services/ai-integrity/customer-sources";

export async function GET(_request: Request, { params }: { params: Promise<{ syncId: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isAiCustomerSourcesEnabled()) return NextResponse.json({ error: "Unavailable." }, { status: 404, headers });
  const context = await getAppContext();
  if (!context) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
  try {
    const artifact = await getAiCustomerSourceArtifact(context.workspace.id, context.user.id, (await params).syncId);
    if (!artifact) return NextResponse.json({ error: "Source read not found." }, { status: 404, headers });
    return NextResponse.json(artifact, { headers: { ...headers, "Content-Disposition": 'attachment; filename="revory-source-evidence.json"' } });
  } catch { return NextResponse.json({ error: "Source evidence is unavailable." }, { status: 403, headers }); }
}
