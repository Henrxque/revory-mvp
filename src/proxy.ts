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

function isCommercialHomologation() {
  let database = "";
  try { database = new URL(process.env.DATABASE_URL ?? "").pathname.slice(1); }
  catch { return false; }
  return process.env.VERCEL_ENV === "preview" && process.env.REVORY_AI_COMMERCIAL_ENABLED === "true"
    && process.env.REVORY_AI_MONITOR_BILLING_MODE === "test" && process.env.REVORY_AI_CUSTOMER_STRIPE_MODE === "test"
    && /^revory_monitor_hml_[a-f0-9]{12}$/.test(database) && database === process.env.REVORY_AI_COMMERCIAL_DATABASE
    && !!process.env.REVORY_AI_COMMERCIAL_BRANCH && process.env.REVORY_AI_COMMERCIAL_BRANCH === process.env.VERCEL_GIT_COMMIT_REF;
}

export function proxy(request: NextRequest) {
  const commercialHomologation = isCommercialHomologation();
  if (!isSyntheticPreview() && !commercialHomologation) return NextResponse.next();
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/app/") && !pathname.startsWith("/app/ai-integrity/")) {
    return NextResponse.redirect(new URL("/app/ai-integrity/dashboard", request.url), 303);
  }
  if (pathname.startsWith("/api/")
    && !pathname.startsWith("/api/auth/")
    && !pathname.startsWith("/api/ai-integrity/")
    && !(commercialHomologation && pathname === "/api/jobs/ai-integrity-monitor")
    && pathname !== "/api/health") {
    return NextResponse.json({ error: "Unavailable in this isolated preview." }, { status: 404 });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/api/:path*"] };
