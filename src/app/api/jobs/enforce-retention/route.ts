import { createHash, timingSafeEqual } from "node:crypto";
import { runRetentionJob } from "@/services/data-portability/retention-job";

export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
async function runRetentionEnforcement(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return Response.json({ error: "Retention job is not configured." }, { status: 503, headers });
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(digest(request.headers.get("authorization") ?? ""), digest(`Bearer ${secret}`))) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  }
  const startedAt = Date.now();
  try {
    const result = await runRetentionJob();
    const code = result.status === "SUCCEEDED" ? 200 : result.status === "BUSY" ? 409 : 503;
    console.info(JSON.stringify({ message: "retention_job_complete", level: code === 200 ? "info" : "error", durationMs: Date.now() - startedAt, ...result }));
    return Response.json(result, { status: code, headers });
  } catch {
    console.error(JSON.stringify({ message: "retention_job_failed", code: "RETENTION_PROCESSING_FAILED" }));
    return Response.json({ error: "Retention processing failed." }, { status: 503, headers });
  }
}
export function GET(request: Request) { return runRetentionEnforcement(request); }
export function POST(request: Request) { return runRetentionEnforcement(request); }
