import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { buildSignInRedirectPath } from "@/services/auth/redirects";

const isProtectedRoute = createRouteMatcher(["/app(.*)"]);
const SERVER_ACTION_HEADER = "next-action";

function isServerActionRequest(req: Request) {
  return req.method === "POST" && req.headers.has(SERVER_ACTION_HEADER);
}

export default clerkMiddleware(async (auth, req) => {
  if (!isProtectedRoute(req) || isServerActionRequest(req)) {
    return;
  }

  const { userId } = await auth();

  if (userId) {
    return;
  }

  const signInUrl = new URL(buildSignInRedirectPath(req.url), req.url);

  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|png|jpg|jpeg|gif|svg|ico|ttf|woff2?|map)).*)",
    "/(api|trpc)(.*)",
  ],
};
