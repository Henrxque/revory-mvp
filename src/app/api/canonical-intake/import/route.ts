import { NextResponse } from "next/server";

import { importCanonicalFiles } from "@/src/app/(app)/app/imports/canonical-actions";

export async function POST(request: Request) {
  try {
    const result = await importCanonicalFiles({ message: "", status: "idle" }, await request.formData());
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to import the uploaded files.", status: "error" }, { status: 400 });
  }
}
