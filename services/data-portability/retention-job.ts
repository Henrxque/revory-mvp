import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/db/prisma";
import { enforceWorkspaceRetention } from "./enforce-retention";

const KEY = "RETENTION";
const LEASE_MS = 15 * 60_000;
type Progress = {
  cursor: string | null; complete: boolean; processed: number; failed: number;
  deleted: Record<string, number>; cycleStartedAt: string;
};
function previousProgress(value: unknown): Progress | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Progress;
  return p.complete === false && typeof p.processed === "number" && typeof p.failed === "number"
    && typeof p.cycleStartedAt === "string" && p.deleted && (p.cursor === null || typeof p.cursor === "string") ? p : null;
}

// Persist success even when no rows expire. Logs alone cannot prove a daily job
// after the hosting plan's short log-retention window has elapsed.
export async function runRetentionJob(options: {
  maxWorkspaces?: number; budgetMs?: number;
  enforce?: typeof enforceWorkspaceRetention;
} = {}) {
  const now = new Date(), token = randomUUID();
  const maxWorkspaces = Math.max(1, Math.min(100, options.maxWorkspaces ?? 100));
  const budgetMs = Math.max(1000, Math.min(45_000, options.budgetMs ?? 40_000));
  await prisma.operationalJobState.upsert({ where: { key: KEY }, create: { key: KEY }, update: {} });
  const claimed = await prisma.operationalJobState.updateMany({
    where: { key: KEY, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
    data: { status: "RUNNING", leaseToken: token, leaseUntil: new Date(now.valueOf() + LEASE_MS), startedAt: now, completedAt: null },
  });
  if (!claimed.count) return { status: "BUSY", complete: false, failedWorkspaces: 0, workspaces: 0, totals: {} };
  const checkpoint = await prisma.operationalJobState.findUniqueOrThrow({ where: { key: KEY } });
  const progress = previousProgress(checkpoint.resultJson) ?? {
    cursor: null, complete: false, processed: 0, failed: 0, deleted: {}, cycleStartedAt: now.toISOString(),
  };
  let status = "PARTIAL";
  try {
    const workspaces = await prisma.workspace.findMany({
      where: progress.cursor ? { id: { gt: progress.cursor } } : {},
      select: { id: true }, orderBy: { id: "asc" }, take: maxWorkspaces + 1,
    });
    let handled = 0;
    for (const workspace of workspaces.slice(0, maxWorkspaces)) {
      if (Date.now() - now.valueOf() >= budgetMs) break;
      try {
        const result = await (options.enforce ?? enforceWorkspaceRetention)(workspace.id, now);
        for (const [key, value] of Object.entries(result)) {
          if (typeof value === "number") progress.deleted[key] = (progress.deleted[key] ?? 0) + value;
        }
      } catch {
        progress.failed++;
        // Do not log database errors, connection strings, source payloads or notes.
        console.error(JSON.stringify({ message: "retention_workspace_failed", code: "RETENTION_WORKSPACE_FAILED" }));
      }
      progress.processed++; handled++; progress.cursor = workspace.id;
      await prisma.operationalJobState.updateMany({ where: { key: KEY, leaseToken: token }, data: { resultJson: progress } });
    }
    progress.complete = handled === workspaces.length;
    if (progress.complete) {
      const stale = await prisma.authRateLimitBucket.deleteMany({ where: { updatedAt: { lt: new Date(now.valueOf() - 7 * 86400_000) } } });
      progress.deleted.deletedRateLimitBuckets = stale.count;
      status = progress.failed ? "FAILED" : "SUCCEEDED";
    }
    await prisma.operationalJobState.updateMany({ where: { key: KEY, leaseToken: token }, data: {
      status, resultJson: progress, completedAt: new Date(), leaseToken: null, leaseUntil: null,
      ...(status === "SUCCEEDED" ? { lastSucceededAt: new Date() } : {}),
    } });
    return { status, complete: progress.complete, failedWorkspaces: progress.failed, workspaces: progress.processed, totals: progress.deleted };
  } catch {
    await prisma.operationalJobState.updateMany({ where: { key: KEY, leaseToken: token }, data: {
      status: "FAILED", resultJson: progress, completedAt: new Date(), leaseToken: null, leaseUntil: null,
    } }).catch(() => undefined);
    throw new Error("Retention processing failed. Check the operational checkpoint.");
  }
}
