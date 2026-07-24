"use client";

import { useFormStatus } from "react-dom";

export function LegalAcceptanceSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      aria-live="polite"
      className="rev-button-primary mt-4 w-full justify-center disabled:cursor-wait disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "Saving acceptance…" : "Accept and continue to REVORY"}
    </button>
  );
}
