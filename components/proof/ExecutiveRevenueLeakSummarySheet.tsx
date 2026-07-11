"use client";

import { useEffect, useState } from "react";

import { ExecutiveRevenueLeakSummaryCard } from "@/components/proof/ExecutiveRevenueLeakSummaryCard";
import { RevoryStatusBadge } from "@/components/ui/RevoryStatusBadge";
import type { ExecutiveRevenueLeakSummaryRead } from "@/services/revenue-leaks/get-executive-revenue-leak-summary-read";

type ExecutiveRevenueLeakSummarySheetProps = Readonly<{
  read: ExecutiveRevenueLeakSummaryRead;
  workspaceName: string;
}>;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildPrintSectionsHtml(read: ExecutiveRevenueLeakSummaryRead) {
  return read.printSections
    .map((section) => {
      const rows = section.rows
        .map(
          (row) => `
            <div class="row">
              <div>
                <p class="row-label">${escapeHtml(row.label)}</p>
                ${row.note ? `<p class="row-note">${escapeHtml(row.note)}</p>` : ""}
              </div>
              <p class="row-value">${escapeHtml(row.value)}</p>
            </div>
          `,
        )
        .join("");

      return `
        <section class="section">
          <div class="section-head">
            <p class="section-title">${escapeHtml(section.title)}</p>
            <p class="section-note">${escapeHtml(section.note)}</p>
          </div>
          <div class="rows">${rows}</div>
        </section>
      `;
    })
    .join("");
}

export function ExecutiveRevenueLeakSummarySheet({
  read,
  workspaceName,
}: ExecutiveRevenueLeakSummarySheetProps) {
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
      await navigator.clipboard.writeText(read.copyableSummary);
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
        text: read.copyableSummary,
        title: `${workspaceName} executive revenue leak summary`,
      });
    } catch {
      // User cancel should stay silent.
    }
  }

  function openPrintView() {
    const printViewHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(workspaceName)} executive revenue leak summary</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0c0b0f;
        --border: rgba(255,255,255,0.08);
        --text: #f5f4f8;
        --muted: #87849a;
        --subtle: #5f5c71;
        --accent: #43b39b;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(67,179,155,0.18), transparent 28%),
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
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.24em;
        font-size: 11px;
        font-weight: 700;
        color: var(--accent);
      }
      .workspace,
      .section-note,
      .row-note,
      .honesty {
        color: var(--muted);
      }
      .workspace {
        margin: 6px 0 0;
        font-size: 12px;
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
        max-width: 760px;
        font-size: 31px;
        font-weight: 600;
        line-height: 1.02;
        letter-spacing: -0.04em;
      }
      .summary {
        margin: 14px 0 0;
        max-width: 760px;
        font-size: 14px;
        line-height: 1.65;
        color: var(--muted);
      }
      .hero {
        display: grid;
        grid-template-columns: 1.18fr 0.82fr;
        gap: 14px;
        margin-top: 26px;
      }
      .metric,
      .section {
        border: 1px solid var(--border);
        border-radius: 22px;
      }
      .metric {
        background: linear-gradient(180deg, rgba(67,179,155,0.1), rgba(255,255,255,0.03));
        padding: 20px;
      }
      .metric-label,
      .section-title,
      .row-label {
        margin: 0;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-weight: 700;
        color: var(--subtle);
      }
      .metric-value {
        margin: 16px 0 0;
        font-size: 44px;
        line-height: 1;
        letter-spacing: -0.04em;
        font-weight: 600;
      }
      .metric-note {
        margin: 14px 0 0;
        font-size: 12px;
        line-height: 1.55;
        color: var(--muted);
      }
      .section {
        background: rgba(255,255,255,0.02);
        padding: 18px;
        margin-top: 14px;
      }
      .section-note {
        margin: 8px 0 0;
        font-size: 12px;
        line-height: 1.5;
      }
      .rows {
        margin-top: 14px;
        display: grid;
        gap: 10px;
      }
      .row {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        border-top: 1px solid var(--border);
        padding-top: 10px;
      }
      .row-value {
        margin: 0;
        max-width: 44%;
        text-align: right;
        font-size: 13px;
        font-weight: 700;
      }
      .row-note {
        margin: 6px 0 0;
        font-size: 11px;
        line-height: 1.45;
      }
      .honesty {
        margin: 18px 0 0;
        font-size: 11px;
        line-height: 1.5;
      }
      @media (max-width: 860px) {
        .hero {
          grid-template-columns: 1fr;
        }
        .row {
          display: block;
        }
        .row-value {
          max-width: 100%;
          margin-top: 8px;
          text-align: left;
        }
      }
      @media print {
        :root {
          color-scheme: light;
          --border: rgba(17,16,24,0.12);
          --text: #14121a;
          --muted: #5d586a;
          --subtle: #6c6677;
          --accent: #b30653;
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
        .metric,
        .section {
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
            <p class="kicker">${escapeHtml(read.title)}</p>
            <p class="workspace">${escapeHtml(workspaceName)}</p>
          </div>
          <span class="pill">${escapeHtml(read.state)}</span>
        </div>
        <h1 class="headline">${escapeHtml(read.headline)}</h1>
        <p class="summary">${escapeHtml(read.summary)}</p>
        <div class="hero">
          <div class="metric">
            <p class="metric-label">Estimated revenue at risk</p>
            <p class="metric-value">${escapeHtml(read.estimatedRevenueAtRiskLabel)}</p>
            <p class="metric-note">Financial leak evidence only. Operational and data-quality risks are kept separate.</p>
          </div>
          <div class="metric">
            <p class="metric-label">Active signals</p>
            <p class="metric-value">${escapeHtml(
              `${read.activeFinancialLeakCount} / ${read.activeOperationalRiskCount} / ${read.activeDataQualityRiskCount}`,
            )}</p>
            <p class="metric-note">Financial / operational / data-quality.</p>
          </div>
        </div>
        ${buildPrintSectionsHtml(read)}
        <p class="honesty">${escapeHtml(read.honestyNote)}</p>
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
          Share leak summary
        </button>

        {copyState === "copied" ? <RevoryStatusBadge tone="real">Summary copied</RevoryStatusBadge> : null}
        {copyState === "copy-error" ? <RevoryStatusBadge tone="future">Copy failed</RevoryStatusBadge> : null}
        {copyState === "print-error" ? <RevoryStatusBadge tone="future">Print unavailable</RevoryStatusBadge> : null}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,7,14,0.78)] px-4 py-6 backdrop-blur-[4px]">
          <div className="rev-card-premium max-h-[92vh] w-full max-w-[68rem] overflow-y-auto rounded-[30px] p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-[35rem]">
                <p className="rev-kicker">Executive Revenue Leak Summary</p>
                <h3 className="mt-2 text-[1.55rem] font-semibold leading-[1.02] tracking-[-0.04em] text-[color:var(--foreground)]">
                  Use one short leak-risk read for internal or commercial review.
                </h3>
                <p className="mt-2 text-[12px] leading-[1.55] text-[color:var(--text-muted)]">
                  This stays narrow: estimated revenue at risk, active leak evidence, data freshness and the next executive action.
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
              <ExecutiveRevenueLeakSummaryCard
                read={read}
                workspaceName={workspaceName}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-[34rem] text-[11px] leading-[1.5] text-[color:var(--text-muted)]">
                Copy keeps the short text version. Print creates a clean browser print view. Share uses the system sheet when supported.
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
