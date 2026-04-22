"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import { recordLeadBookingHandoff } from "@/src/app/(app)/app/imports/lead-booking-actions";

const QUICK_ADD_FOCUS_EVENT = "revory:manual-lead-quick-add-focused";

type LeadBookingOpportunityItem = {
  blockedReason: string | null;
  clientId: string;
  clientName: string;
  handoffHref: string | null;
  handoffLabel: string | null;
  handoffNote: string | null;
  handoffOpenedAt: string | null;
  id: string;
  intakeLabel: string;
  leadState: "BOOKED" | "CLOSED" | "HANDOFF_OPENED" | "NEW";
  leadStateLabel: string;
  nextAction: string | null;
  readinessLabel: string;
  readinessNote: string;
  status: "BLOCKED" | "BOOKED" | "CLOSED" | "OPEN" | "READY";
  suggestedMessage: string | null;
  suggestedMessageLabel: string | null;
  suggestedMessageSource: "fallback" | "llm" | null;
};

function getNextStepRead(
  opportunity: LeadBookingOpportunityItem,
  handoffAvailable: boolean,
) {
  if (opportunity.status === "READY" && handoffAvailable) {
    return {
      note: "The opportunity is ready. Use the suggested message if needed, then open the current booking path.",
      title: "Open the current booking path now",
      tone: "real" as const,
    };
  }

  if (opportunity.status === "BLOCKED" && opportunity.nextAction === "Add contact identity") {
    return {
      note: "This path is still blocked because the lead does not have the contact detail the workspace needs next.",
      title: "Capture the contact detail that unlocks this path",
      tone: "future" as const,
    };
  }

  if (
    opportunity.status === "BLOCKED" &&
    opportunity.nextAction === "Align contact to booking path"
  ) {
    return {
      note: "This lead has contact identity, but not in the channel the current booking path needs.",
      title: "Align contact to the current booking path",
      tone: "future" as const,
    };
  }

  if (opportunity.status === "BLOCKED") {
    return {
      note: "This opportunity cannot move until the current blocker is corrected.",
      title: "Fix the blocker before booking can move",
      tone: "future" as const,
    };
  }

  if (opportunity.status === "BOOKED") {
    return {
      note: "A future booking is already visible, so this opportunity is no longer part of the active booking-assist layer.",
      title: "Booking is already visible",
      tone: "neutral" as const,
    };
  }

  if (opportunity.status === "CLOSED") {
    return {
      note: "This opportunity is no longer active inside the current booking read.",
      title: "Opportunity is already closed",
      tone: "neutral" as const,
    };
  }

  return {
    note: "The opportunity still needs a clearer booking read before the next step can open.",
    title: "Review the current booking read",
    tone: "neutral" as const,
  };
}

function getOpportunityCardClassName(status: LeadBookingOpportunityItem["status"]) {
  switch (status) {
    case "READY":
      return "rounded-[22px] border border-[rgba(194,9,90,0.28)] bg-[linear-gradient(180deg,rgba(194,9,90,0.1),rgba(255,255,255,0.022))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]";
    case "BLOCKED":
      return "rounded-[22px] border border-[rgba(255,184,77,0.2)] bg-[linear-gradient(180deg,rgba(255,184,77,0.055),rgba(255,255,255,0.018))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]";
    default:
      return "rounded-[22px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.016)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]";
  }
}

function formatLeadOpportunityTone(value: LeadBookingOpportunityItem["status"]) {
  switch (value) {
    case "READY":
    case "BOOKED":
      return "real" as const;
    case "BLOCKED":
      return "future" as const;
    default:
      return "neutral" as const;
  }
}

function formatPreparedAt(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getOpportunityAnchorId(opportunityId: string) {
  return `booking-opportunity-${opportunityId}`;
}

type LeadBookingOpportunityListProps = Readonly<{
  opportunities: LeadBookingOpportunityItem[];
}>;

export function LeadBookingOpportunityList({
  opportunities,
}: LeadBookingOpportunityListProps) {
  const [isPending, startTransition] = useTransition();
  const [errorByOpportunity, setErrorByOpportunity] = useState<Record<string, string | null>>({});
  const [copiedStateByOpportunity, setCopiedStateByOpportunity] = useState<
    Record<string, string | null>
  >({});
  const [preparedAtByOpportunity, setPreparedAtByOpportunity] = useState<Record<string, string>>(
    {},
  );
  const [activeOpportunityId, setActiveOpportunityId] = useState<string | null>(null);
  const [focusedOpportunityId, setFocusedOpportunityId] = useState<string | null>(null);

  const preparedLookup = useMemo(
    () =>
      new Map(
        opportunities.map((opportunity) => [
          opportunity.id,
          preparedAtByOpportunity[opportunity.id] ?? opportunity.handoffOpenedAt,
        ]),
      ),
    [opportunities, preparedAtByOpportunity],
  );

  useEffect(() => {
    if (opportunities.length === 0) {
      return;
    }

    function focusOpportunity(opportunityId: string | null) {
      if (!opportunityId || !opportunities.some((opportunity) => opportunity.id === opportunityId)) {
        return;
      }

      setFocusedOpportunityId(opportunityId);

      window.requestAnimationFrame(() => {
        document
          .getElementById(getOpportunityAnchorId(opportunityId))
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }

    const hashOpportunityId = window.location.hash.startsWith("#booking-opportunity-")
      ? window.location.hash.replace("#booking-opportunity-", "")
      : null;

    focusOpportunity(hashOpportunityId);

    const handleFocusEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ opportunityId?: string }>).detail;
      focusOpportunity(detail?.opportunityId ?? null);
    };

    window.addEventListener(QUICK_ADD_FOCUS_EVENT, handleFocusEvent);

    return () => {
      window.removeEventListener(QUICK_ADD_FOCUS_EVENT, handleFocusEvent);
    };
  }, [opportunities]);

  if (opportunities.length === 0) {
    return (
      <div className="rounded-[16px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.016)] px-3 py-3">
        <p className="text-sm font-semibold text-[color:var(--foreground)]">
          No active booking read is visible yet.
        </p>
        <p className="mt-1.5 text-[11px] leading-[1.45] text-[color:var(--text-muted)]">
          Bring in the client lane, or use Quick add when today needs one short booking read without opening a bigger workflow.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {opportunities.map((opportunity) => {
        const preparedAt = preparedLookup.get(opportunity.id) ?? null;
        const handoffAvailable =
          opportunity.status === "READY" &&
          Boolean(opportunity.handoffHref && opportunity.handoffLabel);
        const isCurrentPending = isPending && activeOpportunityId === opportunity.id;
        const nextStep = getNextStepRead(opportunity, handoffAvailable);
        const copyActionLabel = opportunity.suggestedMessageLabel?.includes("ask")
          ? "Copy ask"
          : "Copy message";
        const copiedState = copiedStateByOpportunity[opportunity.id];
        const isFocused = focusedOpportunityId === opportunity.id;

        return (
          <div
            key={opportunity.id}
            id={getOpportunityAnchorId(opportunity.id)}
            className={`${getOpportunityCardClassName(opportunity.status)} ${
              isFocused
                ? "ring-1 ring-[rgba(255,110,170,0.28)] shadow-[0_0_0_1px_rgba(255,110,170,0.08)]"
                : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">
                    {opportunity.clientName}
                  </p>
                  {isFocused ? <RevoryStatusBadge tone="accent">Current focus</RevoryStatusBadge> : null}
                </div>
                <p className="mt-1 text-[11px] leading-[1.45] text-[color:var(--text-muted)]">
                  {opportunity.intakeLabel}
                </p>
              </div>
              <RevoryStatusBadge tone={formatLeadOpportunityTone(opportunity.status)}>
                {opportunity.status}
              </RevoryStatusBadge>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-[color:var(--foreground)]">
                {opportunity.readinessLabel}
              </span>
              {opportunity.blockedReason ? (
                <RevoryStatusBadge tone="future">{opportunity.blockedReason}</RevoryStatusBadge>
              ) : null}
            </div>

            <p className="mt-2 text-[11px] leading-[1.45] text-[color:var(--text-muted)]">
              {opportunity.readinessNote}
            </p>

            {preparedAt ? (
              <p className="mt-2 text-[11px] leading-[1.45] text-[color:var(--text-muted)]">
                Seller signal: current path opened on {formatPreparedAt(preparedAt)}.
              </p>
            ) : null}

            <div className="mt-3 rounded-[18px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.024)] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                  Next step
                </p>
                <RevoryStatusBadge tone={nextStep.tone}>
                  {opportunity.status === "READY"
                    ? "Action ready"
                    : opportunity.status === "BLOCKED"
                      ? "Needs unlock"
                      : "Read only"}
                </RevoryStatusBadge>
              </div>

              <p className="mt-2 text-[12px] font-semibold text-[color:var(--foreground)]">
                {nextStep.title}
              </p>
              <p className="mt-1 text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
                {nextStep.note}
              </p>

              {opportunity.nextAction ? (
                <p className="mt-2 text-[11px] font-medium text-[color:var(--foreground)]">
                  Seller move now: {opportunity.nextAction}
                </p>
              ) : null}

              {opportunity.suggestedMessage || handoffAvailable ? (
                <p className="mt-1.5 text-[11px] leading-[1.45] text-[color:var(--text-muted)]">
                  Use the Action Pack below to take this step inside the current booking read.
                </p>
              ) : null}

              {opportunity.suggestedMessage ? (
                <div className="mt-3 rounded-[14px] border border-[rgba(255,255,255,0.055)] bg-[rgba(255,255,255,0.016)] px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-semibold text-[color:var(--foreground)]">
                        {opportunity.suggestedMessageLabel ?? "Suggested message"}
                      </p>
                    </div>
                    <button
                      className="rev-action-button min-h-8 px-3 py-1 text-[10px]"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(opportunity.suggestedMessage!);
                          setCopiedStateByOpportunity((current) => ({
                            ...current,
                            [opportunity.id]:
                              copyActionLabel === "Copy ask" ? "Ask copied" : "Message copied",
                          }));
                        } catch {
                          setErrorByOpportunity((current) => ({
                            ...current,
                            [opportunity.id]:
                              "REVORY could not copy this suggested message right now.",
                          }));
                        }
                      }}
                      type="button"
                    >
                      {copyActionLabel}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-semibold text-[color:var(--foreground)]">
                      Action pack
                    </p>
                    {handoffAvailable ? (
                      <button
                        className="rev-action-button-primary min-h-8 px-3 py-1 text-[10px]"
                        disabled={isCurrentPending}
                        onClick={() => {
                          if (!opportunity.handoffHref) {
                            return;
                          }

                          setActiveOpportunityId(opportunity.id);
                          setErrorByOpportunity((current) => ({
                            ...current,
                            [opportunity.id]: null,
                          }));

                          startTransition(async () => {
                            try {
                              const result = await recordLeadBookingHandoff(opportunity.id);

                              setPreparedAtByOpportunity((current) => ({
                                ...current,
                                [opportunity.id]: result.handoffOpenedAt,
                              }));

                              window.location.href = opportunity.handoffHref!;
                            } catch (error) {
                              setErrorByOpportunity((current) => ({
                                ...current,
                                [opportunity.id]:
                                  error instanceof Error && error.message
                                    ? error.message
                                    : "REVORY could not open this booking handoff right now.",
                              }));
                            } finally {
                              setActiveOpportunityId(null);
                            }
                          });
                        }}
                        type="button"
                      >
                        {isCurrentPending ? "Opening..." : opportunity.handoffLabel}
                      </button>
                    ) : null}
                    {copiedState ? (
                      <RevoryStatusBadge tone="real">{copiedState}</RevoryStatusBadge>
                    ) : null}
                  </div>
                  <p className="mt-2.5 text-[11px] leading-[1.55] text-[color:var(--text-muted)]">
                    {opportunity.suggestedMessage}
                  </p>

                  {handoffAvailable ? (
                    <p className="mt-2 text-[11px] leading-[1.45] text-[color:var(--text-muted)]">
                      {opportunity.handoffNote}. This opens the current booking path on this device and records the assist without implying thread or follow-up.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {!opportunity.suggestedMessage && handoffAvailable ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                    Action pack
                  </p>
                  <button
                    className="rev-action-button-primary min-h-8 px-3 py-1 text-[10px]"
                    disabled={isCurrentPending}
                    onClick={() => {
                      if (!opportunity.handoffHref) {
                        return;
                      }

                      setActiveOpportunityId(opportunity.id);
                      setErrorByOpportunity((current) => ({
                        ...current,
                        [opportunity.id]: null,
                      }));

                      startTransition(async () => {
                        try {
                          const result = await recordLeadBookingHandoff(opportunity.id);

                          setPreparedAtByOpportunity((current) => ({
                            ...current,
                            [opportunity.id]: result.handoffOpenedAt,
                          }));

                          window.location.href = opportunity.handoffHref!;
                        } catch (error) {
                          setErrorByOpportunity((current) => ({
                            ...current,
                            [opportunity.id]:
                              error instanceof Error && error.message
                                ? error.message
                                : "REVORY could not open this booking handoff right now.",
                          }));
                        } finally {
                          setActiveOpportunityId(null);
                        }
                      });
                    }}
                    type="button"
                  >
                    {isCurrentPending ? "Opening..." : opportunity.handoffLabel}
                  </button>
                </div>
              ) : null}
            </div>

            {errorByOpportunity[opportunity.id] ? (
              <p className="mt-2 text-[11px] leading-[1.45] text-[color:var(--warning)]">
                {errorByOpportunity[opportunity.id]}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
