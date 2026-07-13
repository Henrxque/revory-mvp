import { NextResponse } from "next/server";

import { reviewCanonicalFiles } from "@/src/app/(app)/app/imports/canonical-actions";

export async function POST(request: Request) {
  try {
    const result = await reviewCanonicalFiles(await request.formData());
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ files: [], message: error instanceof Error ? error.message : "Unable to read the uploaded files.", status: "error" }, { status: 400 });
  }
}
