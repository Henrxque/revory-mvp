"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { resetPasswordAction } from "@/src/app/auth/password-actions";

type PasswordResetConfirmFormProps = Readonly<{
  token: string;
}>;

export function PasswordResetConfirmForm({ token }: PasswordResetConfirmFormProps) {
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (completed) {
    return (
      <div
        aria-live="polite"
        className="rounded-[24px] border border-[color:var(--border-accent)] bg-[rgba(67,179,155,.08)] p-5"
        data-testid="password-reset-success"
        role="status"
      >
        <p className="rev-kicker">Access restored</p>
        <h3 className="mt-2 text-xl font-bold text-[color:var(--foreground)]">Password updated</h3>
        <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
          Your new password is ready. Sign in again to open your REVORY workspace.
        </p>
        <Link className="rev-action-button-primary mt-5 inline-flex px-4 py-3 text-sm" href="/sign-in">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);

        if (password !== passwordConfirmation) {
          setMessage("Passwords do not match.");
          return;
        }

        startTransition(async () => {
          const result = await resetPasswordAction({
            password,
            passwordConfirmation,
            token,
          });
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
          required
          type="password"
          value={password}
        />
      </label>

      <label className="block">
        <span className="rev-label">Confirm new password</span>
        <input
          autoComplete="new-password"
          className="rev-input-field mt-1.5 px-3.5 py-3 text-sm"
          minLength={10}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          placeholder="Enter the same password again"
          required
          type="password"
          value={passwordConfirmation}
        />
      </label>

      {message ? (
        <p
          aria-live="assertive"
          className="text-[11px] leading-[1.45] text-[color:var(--warning)]"
          role="alert"
        >
          {message}
        </p>
      ) : null}

      <button
        className="rev-action-button-primary min-h-11 w-full justify-center px-4 py-3 text-sm"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}
