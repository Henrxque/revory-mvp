import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import { sendWeeklyQuoteRecoveryDigest } from "@/services/email/weekly-quote-recovery-digest";

async function runWeeklyDigest(request: Request) {
  const startedAt = Date.now();
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return NextResponse.json({ error: "Digest job is not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preferences = await prisma.quoteRecoveryDigestPreference.findMany({
    where: { enabled: true },
    select: { workspaceId: true },
  });
  const results: Array<{ sent: boolean }> = [];

  for (const preference of preferences) {
    try {
      results.push(await sendWeeklyQuoteRecoveryDigest(preference.workspaceId));
    } catch (error) {
      results.push({ sent: false });
      console.error(JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown digest error",
        level: "error",
        message: "weekly_digest_workspace_failed",
        workspaceId: preference.workspaceId,
      }));
    }
  }

  const sent = results.filter((result) => result.sent).length;
  const failed = results.length - sent;
  console.info(JSON.stringify({
    durationMs: Date.now() - startedAt,
    failed,
    level: failed ? "warning" : "info",
    message: "weekly_digest_job_complete",
    sent,
    workspaces: preferences.length,
  }));

  return NextResponse.json({ failed, processed: preferences.length, sent });
}

export function GET(request: Request) {
  return runWeeklyDigest(request);
}

export function POST(request: Request) {
  return runWeeklyDigest(request);
}
