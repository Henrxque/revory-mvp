import { NextRequest, NextResponse } from "next/server";

function isSyntheticPreview() {
  let database = "";
  try { database = new URL(process.env.DATABASE_URL ?? "").pathname.slice(1); }
  catch { return false; }
  const expected = process.env.REVORY_AI_SAAS_SYNTHETIC_DATABASE ?? "";
  return process.env.VERCEL_ENV === "preview"
    && process.env.REVORY_AI_SAAS_PREVIEW === "true"
    && process.env.REVORY_AI_SAAS_SYNTHETIC_ONLY === "true"
    && /^revory_ai_(sandbox|homolog)_[a-f0-9]{12}$/.test(expected)
    && database === expected;
}

export function proxy(request: NextRequest) {
  if (!isSyntheticPreview()) return NextResponse.next();
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/app/") && !pathname.startsWith("/app/ai-integrity/")) {
    return NextResponse.redirect(new URL("/app/ai-integrity/dashboard", request.url), 303);
  }
  if (pathname.startsWith("/api/")
    && !pathname.startsWith("/api/auth/")
    && !pathname.startsWith("/api/ai-integrity/")
    && pathname !== "/api/health") {
    return NextResponse.json({ error: "Unavailable in the synthetic preview." }, { status: 404 });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/api/:path*"] };
