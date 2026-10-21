import { NextResponse } from "next/server";
import { canUseAiIntegrityIntakePreview } from "@/services/ai-integrity/internal-access";
import { exportAiIntegrityScan, getAiIntegrityScan } from "@/services/ai-integrity/scan";
import { getAppContext } from "@/services/app/get-app-context";

export async function GET(request: Request, { params }: { params: Promise<{ snapshotId: string }> }) {
  const context = await getAppContext();
  if (!context) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await canUseAiIntegrityIntakePreview(context.workspace.id))) return NextResponse.json({ error: "Unavailable." }, { status: 404 });
  const { snapshotId } = await params;
  const format = new URL(request.url).searchParams.get("format") ?? "json";
  if (format !== "json" && format !== "csv") return NextResponse.json({ error: "Choose JSON or CSV." }, { status: 400 });
  const scan = await getAiIntegrityScan(context.workspace.id, snapshotId);
  if (!scan) return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
  return new Response(exportAiIntegrityScan(scan, format), { headers: {
    "Content-Type": format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="revory-integrity-${scan.snapshot.id}.${format}"`,
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
  } });
}
