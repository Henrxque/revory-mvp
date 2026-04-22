"use client";

import { useEffect, useState } from "react";

import { ExecutiveProofSummaryCard } from "@/components/proof/ExecutiveProofSummaryCard";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import type { ExecutiveProofSummaryRead } from "@/services/proof/get-executive-proof-summary-read";

type ExecutiveProofSummarySheetProps = Readonly<{
  read: ExecutiveProofSummaryRead;
}>;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function ExecutiveProofSummarySheet({
  read,
}: ExecutiveProofSummarySheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyState, setCopyState] = useState<"copied" | "copy-error" | "print-error" | null>(null);

  useEffect(() => {
    if (!copyState) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCopyState(null);
    }, 2800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [copyState]);

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(read.copyText);
      setCopyState("copied");
    } catch {
      setCopyState("copy-error");
    }
  }

  async function shareSummary() {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      await copySummary();
      return;
    }

    try {
      await navigator.share({
        text: read.copyText,
        title: `${read.workspaceName} executive proof summary`,
      });
    } catch {
      // User cancel should stay silent.
    }
  }

  function openPrintView() {
    const [primarySignal, ...secondarySignals] = read.signals;
    const secondarySignalsHtml = secondarySignals
      .map(
        (signal) => `
          <div class="signal-card">
            <p class="signal-label">${escapeHtml(signal.label)}</p>
            <p class="signal-value">${escapeHtml(signal.value)}</p>
            <p class="signal-note">${escapeHtml(signal.note)}</p>
          </div>
        `,
      )
      .join("");

    const printViewHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(read.workspaceName)} executive proof</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0c0b0f;
        --panel: #121019;
        --panel-soft: rgba(255,255,255,0.04);
        --border: rgba(255,255,255,0.08);
        --text: #f5f4f8;
        --muted: #87849a;
        --subtle: #5f5c71;
        --accent: #c2095a;
        --accent-soft: rgba(194,9,90,0.1);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(194,9,90,0.18), transparent 28%),
          linear-gradient(180deg, #121019 0%, #0c0b0f 100%);
        color: var(--text);
        font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif;
      }
      .toolbar {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 20px 24px 0;
      }
      .toolbar button {
        border: 1px solid var(--border);
        background: rgba(255,255,255,0.03);
        color: var(--text);
        border-radius: 999px;
        padding: 10px 14px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .shell {
        max-width: 980px;
        margin: 0 auto;
        padding: 18px 24px 32px;
      }
      .card {
        border: 1px solid var(--border);
        background: linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018));
        border-radius: 28px;
        padding: 28px;
        box-shadow: 0 24px 80px rgba(0,0,0,0.24);
      }
      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        flex-wrap: wrap;
      }
      .kicker {
        text-transform: uppercase;
        letter-spacing: 0.24em;
        font-size: 11px;
        font-weight: 700;
        color: var(--accent);
      }
      .workspace {
        margin-top: 6px;
        font-size: 12px;
        color: var(--muted);
      }
      .pills {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .pill {
        border: 1px solid var(--border);
        background: rgba(255,255,255,0.03);
        border-radius: 999px;
        padding: 8px 10px;
        font-size: 10px;
        font-weight: 700;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      .headline {
        margin: 22px 0 0;
        max-width: 720px;
        font-size: 31px;
        font-weight: 600;
        line-height: 1.02;
        letter-spacing: -0.04em;
      }
      .summary {
        margin: 14px 0 0;
        max-width: 720px;
        font-size: 14px;
        line-height: 1.65;
        color: var(--muted);
      }
      .signals {
        display: grid;
        grid-template-columns: 1.22fr 0.9fr 0.9fr;
        gap: 14px;
        margin-top: 26px;
      }
      .signal-primary,
      .signal-card,
      .safeguard {
        border-radius: 22px;
        border: 1px solid var(--border);
      }
      .signal-primary {
        background: linear-gradient(180deg, rgba(194,9,90,0.1), rgba(255,255,255,0.03));
        padding: 20px;
      }
      .signal-card {
        background: rgba(255,255,255,0.02);
        padding: 18px;
      }
      .signal-label {
        margin: 0;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-weight: 700;
        color: var(--subtle);
      }
      .signal-value {
        margin: 16px 0 0;
        font-size: 22px;
        line-height: 1;
        letter-spacing: -0.04em;
        font-weight: 600;
      }
      .signal-primary .signal-value {
        font-size: 44px;
      }
      .signal-note {
        margin: 14px 0 0;
        font-size: 12px;
        line-height: 1.55;
        color: var(--muted);
      }
      .safeguard {
        background: linear-gradient(180deg, rgba(255,255,255,0.028), rgba(255,255,255,0.016));
        padding: 20px;
        margin-top: 16px;
      }
      .safeguard-grid {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        flex-wrap: wrap;
      }
      .safeguard-headline {
        margin: 14px 0 0;
        font-size: 16px;
        line-height: 1.35;
        font-weight: 600;
      }
      .safeguard-note {
        margin: 10px 0 0;
        max-width: 720px;
        font-size: 12px;
        line-height: 1.6;
        color: var(--muted);
      }
      .meta {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 16px;
      }
      .meta .pill {
        background: rgba(255,255,255,0.02);
      }
      .freshness-note {
        margin: 12px 0 0;
        font-size: 11px;
        line-height: 1.5;
        color: var(--muted);
      }
      @media (max-width: 860px) {
        .signals {
          grid-template-columns: 1fr;
        }
      }
      @media print {
        :root {
          color-scheme: light;
          --bg: #ffffff;
          --panel: #ffffff;
          --panel-soft: #ffffff;
          --border: rgba(17,16,24,0.12);
          --text: #14121a;
          --muted: #5d586a;
          --subtle: #6c6677;
          --accent: #b30653;
          --accent-soft: rgba(179,6,83,0.06);
        }
        body {
          background: #ffffff;
          color: var(--text);
        }
        .toolbar {
          display: none;
        }
        .shell {
          max-width: 100%;
          padding: 0;
        }
        .card,
        .signal-primary,
        .signal-card,
        .safeguard {
          box-shadow: none;
          background: #ffffff;
        }
      }
    </style>
  </head>
  <body>
    <div class="toolbar">
      <button onclick="window.print()">Print or save PDF</button>
      <button onclick="window.close()">Close</button>
    </div>
    <main class="shell">
      <section class="card">
        <div class="topbar">
          <div>
            <p class="kicker">Executive proof</p>
            <p class="workspace">${escapeHtml(read.workspaceName)}</p>
          </div>
          <div class="pills">
            <span class="pill">${escapeHtml(read.periodLabel)}</span>
            <span class="pill">${escapeHtml(read.freshness.label)}</span>
          </div>
        </div>

        <h1 class="headline">${escapeHtml(read.headline)}</h1>
        <p class="summary">${escapeHtml(read.summary)}</p>

        <div class="signals">
          ${
            primarySignal
              ? `<div class="signal-primary">
                  <p class="signal-label">${escapeHtml(primarySignal.label)}</p>
                  <p class="signal-value">${escapeHtml(primarySignal.value)}</p>
                  <p class="signal-note">${escapeHtml(primarySignal.note)}</p>
                </div>`
              : ""
          }
          ${secondarySignalsHtml}
        </div>

        <div class="safeguard">
          <div class="safeguard-grid">
            <div>
              <p class="signal-label">Proof position</p>
              <p class="safeguard-headline">${escapeHtml(read.safeguard.headline)}</p>
              <p class="safeguard-note">${escapeHtml(read.safeguard.note)}</p>
            </div>
            <span class="pill">${escapeHtml(
              read.safeguard.tone === "real" ? "Stable" : "Watch",
            )}</span>
          </div>
          <div class="meta">
            <span class="pill">${escapeHtml(read.safeguard.coreReadLabel)}</span>
            <span class="pill">${escapeHtml(read.safeguard.supportLabel)}</span>
            <span class="pill">${escapeHtml(read.freshness.label)}</span>
          </div>
          <p class="freshness-note">${escapeHtml(read.freshness.note)}</p>
        </div>
      </section>
    </main>
  </body>
</html>`;
    const blob = new Blob([printViewHtml], {
      type: "text/html;charset=utf-8",
    });
    const printUrl = URL.createObjectURL(blob);
    const popup = window.open(
      printUrl,
      "_blank",
      "width=1180,height=860",
    );

    if (!popup) {
      URL.revokeObjectURL(printUrl);
      setCopyState("print-error");
      return;
    }

    setCopyState(null);
    window.setTimeout(() => URL.revokeObjectURL(printUrl), 60_000);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="rev-action-button min-h-9 px-3.5 py-1.5 text-[11px]"
          onClick={() => {
            setIsOpen(true);
            setCopyState(null);
          }}
          type="button"
        >
          Share proof
        </button>

        {copyState === "copied" ? <RevoryStatusBadge tone="real">Summary copied</RevoryStatusBadge> : null}
        {copyState === "copy-error" ? <RevoryStatusBadge tone="future">Copy failed</RevoryStatusBadge> : null}
        {copyState === "print-error" ? <RevoryStatusBadge tone="future">Print unavailable</RevoryStatusBadge> : null}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,7,14,0.78)] px-4 py-6 backdrop-blur-[4px]">
          <div className="rev-card-premium w-full max-w-[64rem] rounded-[30px] p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-[34rem]">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="rev-kicker">Executive proof share</p>
                </div>
                <h3 className="mt-2 text-[1.55rem] font-semibold leading-[1.02] tracking-[-0.04em] text-[color:var(--foreground)]">
                  Use one short proof read for internal or commercial review.
                </h3>
                <p className="mt-2 text-[12px] leading-[1.55] text-[color:var(--text-muted)]">
                  This summary stays narrow on purpose: booked revenue first, then only the shortest proof signals the current read already sustains.
                </p>
              </div>

              <button
                className="rev-action-button min-h-8 px-3 py-1 text-[10px] text-[color:var(--text-muted)]"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="mt-5">
              <ExecutiveProofSummaryCard read={read} />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-[34rem] text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
                Copy keeps the short text version. Print creates a clean shareable view. Share uses the system sheet when the device supports it.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="rev-action-button min-h-9 px-3.5 py-1.5 text-[11px]"
                  onClick={copySummary}
                  type="button"
                >
                  Copy summary
                </button>
                <button
                  className="rev-action-button min-h-9 px-3.5 py-1.5 text-[11px]"
                  onClick={openPrintView}
                  type="button"
                >
                  Print or save PDF
                </button>
                <button
                  className="rev-action-button-primary min-h-9 px-3.5 py-1.5 text-[11px]"
                  onClick={shareSummary}
                  type="button"
                >
                  Share summary
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
