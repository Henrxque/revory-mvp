"use client";

import { useState, useTransition } from "react";

import { requestPasswordResetAction } from "@/src/app/auth/password-actions";

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);

        startTransition(async () => {
          const result = await requestPasswordResetAction({ email });
          setMessage(result.message);
        });
      }}
    >
      <label className="block">
        <span className="rev-label">Work email</span>
        <input
          autoComplete="email"
          className="rev-input-field mt-1.5 px-3.5 py-3 text-sm"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@clinic.com"
          type="email"
          value={email}
        />
      </label>

      {message ? (
        <p className="text-[11px] leading-[1.45] text-[color:var(--text-muted)]">
          {message}
        </p>
      ) : null}

      <button
        className="rev-action-button-primary min-h-11 w-full justify-center px-4 py-3 text-sm"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Checking..." : "Send reset link"}
      </button>
    </form>
  );
}
