const DEFAULT_AUTH_REDIRECT_TARGET = "/app";

function isSafeInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

export function normalizeAuthRedirectTarget(
  value: string | string[] | undefined,
  fallback = DEFAULT_AUTH_REDIRECT_TARGET,
) {
  const safeFallback = isSafeInternalPath(fallback)
    ? fallback
    : DEFAULT_AUTH_REDIRECT_TARGET;
  const candidate = (Array.isArray(value) ? value[0] : value)?.trim();

  if (!candidate) {
    return safeFallback;
  }

  const normalizedCandidate = candidate.replaceAll("\\", "/");

  if (normalizedCandidate.startsWith("//")) {
    return safeFallback;
  }

  if (isSafeInternalPath(normalizedCandidate)) {
    return normalizedCandidate;
  }

  try {
    const url = new URL(normalizedCandidate);
    const normalizedPath = `${url.pathname}${url.search}${url.hash}`;

    return isSafeInternalPath(normalizedPath) ? normalizedPath : safeFallback;
  } catch {
    return safeFallback;
  }
}

export function buildSignInRedirectPath(redirectTarget: string) {
  const normalizedTarget = normalizeAuthRedirectTarget(redirectTarget);

  return `/sign-in?redirect_url=${encodeURIComponent(normalizedTarget)}`;
}

export function buildSignUpRedirectPath(redirectTarget: string) {
  const normalizedTarget = normalizeAuthRedirectTarget(redirectTarget);

  return `/sign-up?redirect_url=${encodeURIComponent(normalizedTarget)}`;
}
