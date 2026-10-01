import { NextResponse } from "next/server";
import { getAppContext } from "@/services/app/get-app-context";
import { isAiIntegrityExperienceEnabled } from "@/services/ai-integrity/experience";
import { getAiValidationReview } from "@/services/ai-integrity/validation-review";

export async function GET(_request: Request, { params }: { params: Promise<{ snapshotId: string }> }) {
  if (!isAiIntegrityExperienceEnabled()) return NextResponse.json({ error: "Unavailable." }, { status: 404 });
  const context = await getAppContext(); if (!context) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { snapshotId } = await params;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(snapshotId)) return NextResponse.json({ error: "Report unavailable." }, { status: 404 });
  const review = await getAiValidationReview(context.workspace.id, snapshotId);
  if (!review) return NextResponse.json({ error: "Report unavailable." }, { status: 404 });
  return NextResponse.json({ format: "revory-validation-rehearsal/v1", ...review }, { headers: { "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="revory-review-${snapshotId}.json"` } });
}
