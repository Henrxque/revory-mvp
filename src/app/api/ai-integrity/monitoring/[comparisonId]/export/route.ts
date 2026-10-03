import { NextResponse } from "next/server";
import { getAppContext } from "@/services/app/get-app-context";
import { getAiMonitorArtifact, isAiMonitorRehearsalEnabled } from "@/services/ai-integrity/monitoring";

export async function GET(_request: Request, { params }: { params: Promise<{ comparisonId: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isAiMonitorRehearsalEnabled()) return NextResponse.json({ error: "Unavailable." }, { status: 404, headers });
  const context = await getAppContext();
  if (!context) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
  const { comparisonId } = await params;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(comparisonId)) return NextResponse.json({ error: "Unavailable." }, { status: 404, headers });
  try {
    const saved = await getAiMonitorArtifact(context.workspace.id, comparisonId);
    if (!saved) return NextResponse.json({ error: "Unavailable." }, { status: 404, headers });
    return NextResponse.json({ format: "revory-ai-monitor-rehearsal/v1", comparisonId, baselineSnapshotId: saved.comparison.baselineSnapshotId,
      currentSnapshotId: saved.comparison.currentSnapshotId, artifactHash: saved.comparison.artifactHash, artifact: saved.artifact },
    { headers: { ...headers, "Content-Disposition": `attachment; filename="revory-monitor-${comparisonId}.json"` } });
  } catch { return NextResponse.json({ error: "Evidence unavailable." }, { status: 409, headers }); }
}
