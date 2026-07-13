import { NextResponse } from "next/server";

import { reviewCanonicalFiles } from "@/src/app/(app)/app/imports/canonical-actions";
import { getAppContext } from "@/services/app/get-app-context";
import { getCanonicalVolumePolicy } from "@/services/billing/growth-access";
import { readBoundedMultipartFormData } from "@/services/security/bounded-form-data";

export async function POST(request: Request) {
  try {
    const context = await getAppContext();
    if (!context) return NextResponse.json({ files: [], message: "Unauthorized", status: "error" }, { status: 401 });
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== new URL(request.url).host) return NextResponse.json({ files: [], message: "Invalid request origin", status: "error" }, { status: 403 });
    const policy = await getCanonicalVolumePolicy(context.workspace.id);
    const formData = await readBoundedMultipartFormData(request, policy.maxTotalBytes + 1024 * 1024);
    const result = await reviewCanonicalFiles(formData);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "CONTENT_LENGTH_REQUIRED" ? 411 : code === "UPLOAD_BODY_TOO_LARGE" ? 413 : 400;
    console.warn(JSON.stringify({ level: "warn", message: "canonical_review_rejected", code }));
    return NextResponse.json({ files: [], message: status === 413 ? "Upload body exceeds the current plan limit." : "Unable to read the uploaded files safely.", status: "error" }, { status });
  }
}
