"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { resetPasswordAction } from "@/src/app/auth/password-actions";

type PasswordResetConfirmFormProps = Readonly<{
  token: string;
}>;

export function PasswordResetConfirmForm({ token }: PasswordResetConfirmFormProps) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);

        startTransition(async () => {
          const result = await resetPasswordAction({ password, token });
          setMessage(result.message);
          setCompleted(result.ok);
        });
      }}
    >
      <label className="block">
        <span className="rev-label">New password</span>
        <input
          autoComplete="new-password"
          className="rev-input-field mt-1.5 px-3.5 py-3 text-sm"
          minLength={10}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 10 characters"
          type="password"
          value={password}
        />
      </label>

      {message ? (
        <p className="text-[11px] leading-[1.45] text-[color:var(--text-muted)]">
          {message}
        </p>
      ) : null}

      {completed ? (
        <Link
          className="rev-action-button-primary min-h-11 w-full justify-center px-4 py-3 text-sm"
          href="/sign-in"
        >
          Return to sign in
        </Link>
      ) : (
        <button
          className="rev-action-button-primary min-h-11 w-full justify-center px-4 py-3 text-sm"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Updating..." : "Update password"}
        </button>
      )}
    </form>
  );
}
