import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import { enforceWorkspaceRetention } from "@/services/data-portability/enforce-retention";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Retention job is not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.workspaceDataSettings.findMany({
    select: { workspaceId: true },
  });
  const results = [];
  for (const setting of settings) {
    results.push(await enforceWorkspaceRetention(setting.workspaceId));
  }
  const totals = results.reduce(
    (sum, result) => ({
      deletedFindings: sum.deletedFindings + result.deletedFindings,
      deletedImportSessions: sum.deletedImportSessions + result.deletedImportSessions,
      deletedRuns: sum.deletedRuns + result.deletedRuns,
    }),
    { deletedFindings: 0, deletedImportSessions: 0, deletedRuns: 0 },
  );
  console.info(
    JSON.stringify({
      durationMs: Date.now() - startedAt,
      level: "info",
      message: "retention_job_complete",
      totals,
      workspaces: settings.length,
    }),
  );
  return NextResponse.json({ totals, workspaces: settings.length });
}
