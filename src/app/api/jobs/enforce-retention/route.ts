import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import { enforceWorkspaceRetention } from "@/services/data-portability/enforce-retention";

async function runRetentionEnforcement(request: Request) {
  const startedAt = Date.now();
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Retention job is not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.workspace.findMany({ select: { id: true } });
  const results = [];
  let failedWorkspaces = 0;
  for (const workspace of settings) {
    try {
      results.push(await enforceWorkspaceRetention(workspace.id));
    } catch (error) {
      failedWorkspaces += 1;
      console.error(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown retention error",
          level: "error",
          message: "retention_workspace_failed",
          workspaceId: workspace.id,
        }),
      );
    }
  }
  const totals = results.reduce(
    (sum, result) => ({
      deletedFindings: sum.deletedFindings + result.deletedFindings,
      deletedImportSessions: sum.deletedImportSessions + result.deletedImportSessions,
      deletedRuns: sum.deletedRuns + result.deletedRuns,
    }),
    { deletedFindings: 0, deletedImportSessions: 0, deletedRuns: 0 },
  );
  const staleRateLimitBuckets = await prisma.authRateLimitBucket.deleteMany({
    where: {
      updatedAt: {
        lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
  });
  console.info(
    JSON.stringify({
      durationMs: Date.now() - startedAt,
      level: "info",
      message: "retention_job_complete",
      totals,
      failedWorkspaces,
      deletedRateLimitBuckets: staleRateLimitBuckets.count,
      workspaces: settings.length,
    }),
  );
  return NextResponse.json({
    deletedRateLimitBuckets: staleRateLimitBuckets.count,
    failedWorkspaces,
    totals,
    workspaces: settings.length,
  });
}

export function GET(request: Request) {
  return runRetentionEnforcement(request);
}

export function POST(request: Request) {
  return runRetentionEnforcement(request);
}
