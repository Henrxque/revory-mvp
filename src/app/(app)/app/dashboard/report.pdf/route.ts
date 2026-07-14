import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import { getAppContext } from "@/services/app/get-app-context";
import { getCapabilityAccess } from "@/services/billing/capabilities";
import { getQuoteRecoveryRead } from "@/services/quote-recovery/read-model";
import { generateQuoteRecoveryExecutivePdf } from "@/services/reports/quote-recovery-executive-pdf";

export async function GET() {
  const context = await getAppContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await getCapabilityAccess(context.workspace.id, "QUOTE_RECOVERY")).allowed) {
    return NextResponse.json({ error: "Quote Recovery access is required." }, { status: 403 });
  }
  const read = await getQuoteRecoveryRead(context.workspace.id);
  if (!read.dataQuality.hasImport) {
    return NextResponse.json({ error: "A committed import is required." }, { status: 409 });
  }
  const pdf = await generateQuoteRecoveryExecutivePdf({
    generatedAt: new Date(),
    read,
    workspaceName: context.workspace.name,
  });
  await prisma.workspaceAuditEvent.create({
    data: {
      action: "QUOTE_RECOVERY_PDF_EXPORTED",
      actorUserId: context.user.id,
      metadataJson: { findingCount: read.findings.length },
      workspaceId: context.workspace.id,
    },
  });
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": 'attachment; filename="revory-quote-recovery-executive-read.pdf"',
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
