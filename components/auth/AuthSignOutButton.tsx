"use client";

import { signOut } from "next-auth/react";
import { useTransition } from "react";

type AuthSignOutButtonProps = Readonly<{
  callbackUrl?: string;
  className?: string;
  compact?: boolean;
}>;

export function AuthSignOutButton({
  callbackUrl = "/",
  className,
  compact = false,
}: AuthSignOutButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className={`inline-flex items-center justify-center rounded-full border font-semibold transition disabled:cursor-not-allowed disabled:opacity-75 ${
        compact
          ? "min-h-8 border-[color:var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[12px] text-[color:var(--foreground)] hover:border-[color:var(--border-accent)] hover:bg-[rgba(255,255,255,0.06)]"
          : "rev-button-secondary px-3 py-2 text-xs"
      } ${className ?? ""}`}
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await signOut({
            callbackUrl,
          });
        });
      }}
      type="button"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
