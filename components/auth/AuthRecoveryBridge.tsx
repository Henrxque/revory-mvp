"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useRef } from "react";

type AuthRecoveryBridgeProps = Readonly<{
  redirectTarget: string;
}>;

const RETRY_TTL_MS = 15_000;

function shouldBypassBrowserHandling(event: MouseEvent | FocusEvent) {
  return event.defaultPrevented;
}

export function AuthRecoveryBridge({ redirectTarget }: AuthRecoveryBridgeProps) {
  const { isLoaded, userId } = useAuth();
  const hasRedirectedRef = useRef(false);
  const retryStorageKey = useMemo(
    () => `revory-auth-retry:${redirectTarget}`,
    [redirectTarget],
  );

  useEffect(() => {
    if (!isLoaded || !userId || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    window.location.replace(redirectTarget);
  }, [isLoaded, redirectTarget, userId]);

  useEffect(() => {
    if (!isLoaded || userId || hasRedirectedRef.current || !redirectTarget.startsWith("/app")) {
      return;
    }

    const now = Date.now();
    const lastRetryAt = Number(window.sessionStorage.getItem(retryStorageKey) ?? "0");

    if (Number.isFinite(lastRetryAt) && now - lastRetryAt < RETRY_TTL_MS) {
      return;
    }

    window.sessionStorage.setItem(retryStorageKey, String(now));

    const timeoutId = window.setTimeout(() => {
      if (hasRedirectedRef.current) {
        return;
      }

      hasRedirectedRef.current = true;
      window.location.replace(redirectTarget);
    }, 900);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isLoaded, redirectTarget, retryStorageKey, userId]);

  useEffect(() => {
    const handleFocus = (event: FocusEvent) => {
      if (shouldBypassBrowserHandling(event)) {
        return;
      }

      if (!hasRedirectedRef.current && userId) {
        hasRedirectedRef.current = true;
        window.location.replace(redirectTarget);
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [redirectTarget, userId]);

  return null;
}
