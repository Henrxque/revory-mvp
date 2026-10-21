import { NextResponse } from "next/server";
import { getAppContext } from "@/services/app/get-app-context";
import { isAiIntegrityExperienceEnabled } from "@/services/ai-integrity/experience";
import { recordAiValidationReview } from "@/services/ai-integrity/validation-review";
import { readAiBoundedText } from "@/services/ai-integrity/request-text";
import { checkRateLimit } from "@/services/security/rate-limit";
import { validOrigin } from "@/src/app/api/ai-integrity/_shared";

export async function POST(request: Request) {
  if (!isAiIntegrityExperienceEnabled()) return NextResponse.json({ error: "Unavailable." }, { status: 404 });
  const context = await getAppContext(); if (!context) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!validOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if ((await checkRateLimit({ key: `ai-review:${context.workspace.id}`, limit: 20, windowMs: 600000 })).limited) return NextResponse.json({ error: "Too many review attempts." }, { status: 429 });
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("JSON required.");
    const saved = await recordAiValidationReview(context.workspace.id, context.user.id, JSON.parse(await readAiBoundedText(request, 8192)));
    return NextResponse.json({ id: saved.event.id, revision: saved.event.revision, mode: saved.event.mode, replayed: saved.replayed }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "No review was saved. Check the report, conclusion, evidence confirmation and explanation, then retry." }, { status: 400 }); }
}
