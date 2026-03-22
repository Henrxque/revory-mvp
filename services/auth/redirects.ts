const DEFAULT_AUTH_REDIRECT_TARGET = "/app";

export function normalizeAuthRedirectTarget(
  value: string | string[] | undefined,
  fallback = DEFAULT_AUTH_REDIRECT_TARGET,
) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate) {
    return fallback;
  }

  if (candidate.startsWith("/")) {
    return candidate;
  }

  try {
    const url = new URL(candidate);
    const normalizedPath = `${url.pathname}${url.search}${url.hash}`;

    return normalizedPath.startsWith("/") ? normalizedPath : fallback;
  } catch {
    return fallback;
  }
}

export function buildSignInRedirectPath(redirectTarget: string) {
  const normalizedTarget = normalizeAuthRedirectTarget(redirectTarget);

  return `/sign-in?redirect_url=${encodeURIComponent(normalizedTarget)}`;
}
