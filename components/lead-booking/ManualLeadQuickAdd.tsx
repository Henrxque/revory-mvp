"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createManualLeadQuickAdd } from "@/src/app/(app)/app/imports/manual-lead-actions";

type ManualLeadQuickAddProps = Readonly<{
  bookingPathLabel: string;
  mainOfferLabel: string;
}>;

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

const QUICK_ADD_FOCUS_EVENT = "revory:manual-lead-quick-add-focused";

export function ManualLeadQuickAdd({
  bookingPathLabel,
  mainOfferLabel,
}: ManualLeadQuickAddProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3600);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [successMessage]);

  const canSubmit = useMemo(() => {
    return (
      normalizeText(fullName).length > 0 &&
      (normalizeText(email).length > 0 || normalizeText(phone).length > 0)
    );
  }, [email, fullName, phone]);

  function resetForm() {
    setFullName("");
    setEmail("");
    setPhone("");
    setSourceLabel("");
    setErrorMessage(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="inline-flex min-h-9 items-center justify-center rounded-full border border-[rgba(194,9,90,0.22)] bg-[rgba(194,9,90,0.08)] px-3.5 py-1.5 text-[11px] font-semibold text-[color:var(--foreground)] transition hover:border-[rgba(255,110,170,0.42)] hover:bg-[rgba(194,9,90,0.16)]"
          onClick={() => {
            setIsOpen(true);
            setErrorMessage(null);
          }}
          type="button"
        >
          Quick add
        </button>
        {successMessage ? (
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--success)]">
            Read updated
          </span>
        ) : null}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,7,14,0.72)] px-4 py-6 backdrop-blur-[2px]">
          <div className="w-full max-w-[28rem] rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(16,14,22,0.985),rgba(11,10,18,0.985))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.44)] md:p-5.5">
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-[22rem]">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="rev-kicker">Quick add</p>
                </div>
                <h3 className="mt-2 text-[1.28rem] font-semibold leading-[1.02] tracking-[-0.04em] text-[color:var(--foreground)]">
                  Add one lead to today&apos;s booking read.
                </h3>
                <p className="mt-1.5 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
                  Inherits the current offer and booking path automatically.
                </p>
              </div>

              <button
                className="inline-flex min-h-8 items-center justify-center rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-1 text-[10px] font-semibold text-[color:var(--text-muted)] transition hover:text-[color:var(--foreground)]"
                onClick={() => {
                  setIsOpen(false);
                  setErrorMessage(null);
                }}
                type="button"
              >
                Close
              </button>
            </div>

            <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
              {mainOfferLabel} • {bookingPathLabel}
            </p>

            <div className="mt-4 space-y-2.5">
              <label className="block">
                <span className="rev-label">Lead name</span>
                <input
                  autoFocus
                  className="mt-1.5 w-full rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3 text-sm text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[rgba(194,9,90,0.34)]"
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Full name"
                  value={fullName}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="rev-label">Email</span>
                  <input
                    className="mt-1.5 w-full rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3 text-sm text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[rgba(194,9,90,0.34)]"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@clinic.com"
                    type="email"
                    value={email}
                  />
                </label>

                <label className="block">
                  <span className="rev-label">Phone</span>
                  <input
                    className="mt-1.5 w-full rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3 text-sm text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[rgba(194,9,90,0.34)]"
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="Mobile number"
                    value={phone}
                  />
                </label>
              </div>

              <label className="block">
                <span className="rev-label">Source</span>
                <input
                  className="mt-1.5 w-full rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3 text-sm text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[rgba(194,9,90,0.34)]"
                  maxLength={48}
                  onChange={(event) => setSourceLabel(event.target.value)}
                  placeholder="Optional"
                  value={sourceLabel}
                />
              </label>
            </div>

            {errorMessage ? (
              <p className="mt-3 text-[11px] leading-[1.45] text-[color:var(--warning)]">
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                Name + email or phone
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="inline-flex min-h-9 items-center justify-center rounded-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-1.5 text-[11px] font-semibold text-[color:var(--text-muted)] transition hover:text-[color:var(--foreground)]"
                  onClick={() => {
                    setIsOpen(false);
                    setErrorMessage(null);
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex min-h-9 items-center justify-center rounded-full border border-[rgba(194,9,90,0.28)] bg-[rgba(194,9,90,0.14)] px-3.5 py-1.5 text-[11px] font-semibold text-[color:var(--foreground)] transition hover:border-[rgba(255,110,170,0.5)] hover:bg-[rgba(194,9,90,0.22)] disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-[rgba(255,255,255,0.06)] disabled:text-[color:var(--text-muted)]"
                  disabled={!canSubmit || isPending}
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);

                    if (!canSubmit) {
                      setErrorMessage(
                        "REVORY needs the lead name plus email or phone before this quick add can open a booking read.",
                      );
                      return;
                    }

                    startTransition(async () => {
                      const result = await createManualLeadQuickAdd({
                        email,
                        fullName,
                        phone,
                        sourceLabel,
                      });

                      if (!result.ok) {
                        setErrorMessage(result.message);
                        return;
                      }

                      resetForm();
                      setIsOpen(false);
                      setSuccessMessage(result.message);
                      window.location.hash = `booking-opportunity-${result.opportunityId}`;
                      window.dispatchEvent(
                        new CustomEvent(QUICK_ADD_FOCUS_EVENT, {
                          detail: { opportunityId: result.opportunityId },
                        }),
                      );
                      router.refresh();
                    });
                  }}
                  type="button"
                >
                  {isPending ? "Adding..." : "Add lead"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
