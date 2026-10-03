import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { canUseAiIntegrityIntakePreview } from "@/services/ai-integrity/internal-access";
import { runAiIntegrityScan } from "@/services/ai-integrity/scan";
import { getAppContext } from "@/services/app/get-app-context";
import { checkRateLimit } from "@/services/security/rate-limit";
import { validOrigin } from "@/src/app/api/ai-integrity/_shared";
import { readScanRequest } from "@/services/ai-integrity/scan-request";

export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await canUseAiIntegrityIntakePreview(context.workspace.id))) return NextResponse.json({ error: "Unavailable." }, { status: 404 });
  if (!validOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if ((await checkRateLimit({ key: `ai-integrity-scan:${context.workspace.id}`, limit: 10, windowMs: 600000 })).limited) return NextResponse.json({ error: "Too many scans. Try again later." }, { status: 429 });
  try {
    const body = await readScanRequest(request);
    const result = await runAiIntegrityScan({ ...body, workspaceId: context.workspace.id, actorUserId: context.user.id });
    return NextResponse.json({ snapshotId: result.snapshotId, replayed: result.replayed }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientUnknownRequestError
      ? "Unable to persist the scan. Retry with the same reviewed inputs." : error instanceof Error ? error.message : "Unable to run scan.";
    return NextResponse.json({ error: message }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
}
