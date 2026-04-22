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
          className="rev-action-button-primary min-h-9 px-3.5 py-1.5 text-[11px]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,7,14,0.78)] px-4 py-6 backdrop-blur-[4px]">
          <div className="rev-card-premium w-full max-w-[27rem] rounded-[30px] p-5">
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
                className="rev-action-button min-h-8 px-3 py-1 text-[10px] text-[color:var(--text-muted)]"
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
              {mainOfferLabel} / {bookingPathLabel}
            </p>

            <div className="mt-4 space-y-2.5">
              <label className="block">
                <span className="rev-label">Lead name</span>
                <input
                  autoFocus
                  className="rev-input-field mt-1.5 px-3.5 py-3 text-sm"
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Full name"
                  value={fullName}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="rev-label">Email</span>
                  <input
                    className="rev-input-field mt-1.5 px-3.5 py-3 text-sm"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@clinic.com"
                    type="email"
                    value={email}
                  />
                </label>

                <label className="block">
                  <span className="rev-label">Phone</span>
                  <input
                    className="rev-input-field mt-1.5 px-3.5 py-3 text-sm"
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="Mobile number"
                    value={phone}
                  />
                </label>
              </div>

              <label className="block">
                <span className="rev-label">Source</span>
                <input
                  className="rev-input-field mt-1.5 px-3.5 py-3 text-sm"
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
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                <button
                  className="rev-action-button min-h-9 flex-1 px-3.5 py-1.5 text-[11px] text-[color:var(--text-muted)] sm:flex-none"
                  onClick={() => {
                    setIsOpen(false);
                    setErrorMessage(null);
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rev-action-button-primary min-h-9 flex-1 px-3.5 py-1.5 text-[11px] sm:flex-none"
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
