"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

type AuthRecoveryBridgeProps = Readonly<{
  redirectTarget: string;
}>;

function shouldBypassBrowserHandling(event: MouseEvent | FocusEvent) {
  return event.defaultPrevented;
}

export function AuthRecoveryBridge({ redirectTarget }: AuthRecoveryBridgeProps) {
  const { isLoaded, userId } = useAuth();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !userId || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    window.location.replace(redirectTarget);
  }, [isLoaded, redirectTarget, userId]);

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
