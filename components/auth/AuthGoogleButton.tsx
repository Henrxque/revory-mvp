"use client";

import { signIn } from "next-auth/react";
import { useTransition } from "react";

type AuthGoogleButtonProps = Readonly<{
  callbackUrl: string;
  label: string;
}>;

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
    >
      <path
        d="M21.805 12.23c0-.74-.067-1.45-.19-2.136H12v4.04h5.497a4.702 4.702 0 0 1-2.04 3.086v2.563h3.3c1.93-1.777 3.048-4.398 3.048-7.553Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.754 0 5.065-.913 6.753-2.468l-3.3-2.563c-.913.612-2.08.974-3.453.974-2.654 0-4.903-1.792-5.706-4.2H2.88v2.644A10.194 10.194 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.294 13.743A6.133 6.133 0 0 1 5.975 12c0-.605.11-1.19.319-1.743V7.613H2.88A10.2 10.2 0 0 0 1.81 12c0 1.63.39 3.174 1.07 4.387l3.414-2.644Z"
        fill="#FBBC04"
      />
      <path
        d="M12 6.057c1.497 0 2.841.515 3.9 1.525l2.924-2.923C17.06 3.022 14.748 2 12 2A10.194 10.194 0 0 0 2.88 7.613l3.414 2.644c.803-2.409 3.052-4.2 5.706-4.2Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function PendingSpinner() {
  return (
    <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.25)] border-t-white" />
  );
}

export function AuthGoogleButton({
  callbackUrl,
  label,
}: AuthGoogleButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="group relative flex w-full items-center gap-4 overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-4 py-4 text-left shadow-[0_22px_48px_rgba(0,0,0,0.18)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(224,16,106,0.22)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.04))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(224,16,106,0.34)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(18,16,24,1)] disabled:cursor-not-allowed disabled:opacity-80"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await signIn("google", {
            callbackUrl,
          });
        });
      }}
      type="button"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_10px_24px_rgba(0,0,0,0.14)]">
        <GoogleMark />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-[color:var(--foreground)]">
          {isPending ? "Redirecting to Google" : label}
        </span>
        <span className="mt-1 block text-xs text-[#b9b2c6]">
          {isPending
            ? "Completing the secure redirect to your workspace"
            : "Secure Google sign-in for REVORY"}
        </span>
      </span>

      <span className="inline-flex min-h-9 min-w-[4.75rem] items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(12,11,15,0.34)] px-3 text-xs font-semibold text-[color:var(--foreground)]">
        {isPending ? <PendingSpinner /> : "Google"}
      </span>
    </button>
  );
}
