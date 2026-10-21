import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dispatchMonitorJobs, deliverMonitorNotices } from "@/services/ai-integrity/recurring-monitor";
import { refreshMonitorSubscriptions } from "@/services/ai-integrity/monitor-billing";
import { recurringEnabled } from "@/services/ai-integrity/recurring-access";
export const maxDuration = 300;
export async function GET(request: Request) {
  // A dedicated dispatcher secret avoids rotating auth for existing retention/digest jobs.
  const secret = process.env.REVORY_AI_MONITOR_DISPATCH_SECRET || process.env.CRON_SECRET, auth = request.headers.get("authorization") ?? "";
  if (!secret) return NextResponse.json({ error: "Job not configured." }, { status: 503 });
  const expected = Buffer.from("Bearer " + secret), supplied = Buffer.from(auth);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!recurringEnabled()) return NextResponse.json({ enabled: false, processed: 0 });
  try {
    await refreshMonitorSubscriptions();
    const result = await dispatchMonitorJobs();
    const delivery = await deliverMonitorNotices();
    console.info(JSON.stringify({ message: "ai_monitor_dispatch_complete", processed: result.processed, sent: delivery.sent }));
    return NextResponse.json({ ...result, ...delivery });
  } catch {
    console.error(JSON.stringify({ message: "ai_monitor_dispatch_failed" }));
    return NextResponse.json({ error: "Monitoring job did not complete." }, { status: 500 });
  }
}
