"use client";

import { useEffect, useRef } from "react";

type PrivateAppSessionResyncProps = Readonly<{
  idleThresholdMs?: number;
}>;

const DEFAULT_IDLE_THRESHOLD_MS = 45_000;
const MIN_RESYNC_INTERVAL_MS = 15_000;

export function PrivateAppSessionResync({
  idleThresholdMs = DEFAULT_IDLE_THRESHOLD_MS,
}: PrivateAppSessionResyncProps) {
  const hiddenAtRef = useRef<number | null>(null);
  const lastResyncAtRef = useRef(0);

  useEffect(() => {
    const maybeResync = () => {
      const hiddenAt = hiddenAtRef.current;

      if (hiddenAt === null) {
        return;
      }

      const now = Date.now();
      const hiddenDurationMs = now - hiddenAt;

      hiddenAtRef.current = null;

      if (hiddenDurationMs < idleThresholdMs) {
        return;
      }

      if (now - lastResyncAtRef.current < MIN_RESYNC_INTERVAL_MS) {
        return;
      }

      lastResyncAtRef.current = now;
      window.location.replace(
        `${window.location.pathname}${window.location.search}${window.location.hash}`,
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }

      if (document.visibilityState === "visible") {
        maybeResync();
      }
    };

    const handleBlur = () => {
      hiddenAtRef.current = Date.now();
    };

    const handleFocus = () => {
      maybeResync();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [idleThresholdMs]);

  return null;
}
