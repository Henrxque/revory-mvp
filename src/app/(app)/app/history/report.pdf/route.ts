import { NextResponse } from "next/server";

import { getAppContext } from "@/services/app/get-app-context";
import { getGrowthAccess } from "@/services/billing/growth-access";
import { getGrowthIntelligenceHistory } from "@/services/growth-intelligence/snapshots";
import { generateGrowthExecutivePdf } from "@/services/reports/growth-executive-pdf";
import { prisma } from "@/db/prisma";

export async function GET() {
  const context = await getAppContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await getGrowthAccess(context.workspace.id);
  if (!access.enabled) return NextResponse.json({ error: "Growth access is required." }, { status: 403 });
  const history = await getGrowthIntelligenceHistory(context.workspace.id);
  const pdf = await generateGrowthExecutivePdf({
    decision: history.current.decision,
    generatedAt: new Date(),
    segmentation: history.current.segmentation,
    snapshots: history.snapshots,
    workspaceName: context.workspace.name,
  });
  await prisma.workspaceAuditEvent.create({ data: { workspaceId: context.workspace.id, actorUserId: context.user.id, action: "GROWTH_PDF_EXPORTED", metadataJson: { snapshotCount: history.snapshots.length, decisionAvailable: history.current.decision.available } } });
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": 'attachment; filename="revory-growth-executive-read.pdf"',
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
