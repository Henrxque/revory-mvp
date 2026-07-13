import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { RevenueRealizationFindingIcon } from "@/components/revenue-realization/RevenueRealizationFindingIcon";
import type { RevenueRealizationEvidence, RevenueRealizationFindingType } from "@/domain/revory/revenue-realization";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getCapabilityAccess } from "@/services/billing/capabilities";
import { getRevenueRealizationFindingDetail } from "@/services/revenue-realization/get-revenue-realization-read";

function money(valueCents: number | null, currency: string) {
  if (valueCents === null) return "No financial value";
  return new Intl.NumberFormat("en-US", { currency, style: "currency" }).format(valueCents / 100);
}

function evidenceRows(value: unknown): RevenueRealizationEvidence[] {
  return Array.isArray(value) ? value.filter((item): item is RevenueRealizationEvidence => Boolean(item && typeof item === "object")) : [];
}

function evidenceValue(row: RevenueRealizationEvidence, currency: string) {
  if (typeof row.value === "number" && row.field.endsWith("Cents")) return money(row.value, currency);
  if (typeof row.value === "number" && row.field.endsWith("Bps")) return `${(row.value / 100).toFixed(2)}%`;
  return String(row.value ?? "—");
}

export default async function RevenueRealizationFindingPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/app/revenue-realization"));
  if (!(await getCapabilityAccess(context.workspace.id, "REVENUE_REALIZATION")).allowed) redirect("/app/dashboard");
  const { id } = await params;
  const finding = await getRevenueRealizationFindingDetail(context.workspace.id, id);
  if (!finding) notFound();
  const rows = evidenceRows(finding.evidenceJson);
  const inputs = finding.calculationInputsJson && typeof finding.calculationInputsJson === "object" && !Array.isArray(finding.calculationInputsJson)
    ? Object.entries(finding.calculationInputsJson)
    : [];

  return (
    <div className="space-y-6">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-7">
        <Link className="text-xs font-bold text-[color:var(--accent-light)]" href="/app/revenue-realization">← Revenue Realization</Link>
        <div className="mt-5 flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--border-accent)] bg-[rgba(67,179,155,0.1)] text-[color:var(--accent-light)]">
            <RevenueRealizationFindingIcon type={finding.findingType as RevenueRealizationFindingType} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="rev-kicker">Job {finding.jobExternalId} · evidence view</p>
            <h1 className="rev-display-hero mt-3">{finding.findingType.replaceAll("_", " ")}</h1>
            <p className="mt-4 max-w-[52rem] text-sm leading-7 text-[color:var(--text-muted)]">{finding.reason}</p>
          </div>
          <strong className="text-xl">{money(finding.valueCents, finding.currency)}</strong>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[['Basis', finding.valueBasis], ['Category', finding.category], ['Confidence', finding.confidence], ['Urgency', finding.urgency], ['Priority', `P${finding.priority}`]].map(([label, value]) => (
            <div className="rev-card rounded-2xl p-3" key={label}><p className="rev-label">{label}</p><p className="mt-2 text-sm font-bold">{value}</p></div>
          ))}
        </div>
      </section>

      <section className="rev-shell-panel rounded-[28px] p-6">
        <p className="rev-kicker">Decision boundary</p>
        <h2 className="rev-display-section mt-2">What this finding supports—and what it does not.</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <article className="rev-card rounded-[20px] p-5">
            <p className="rev-label">Review next</p>
            <p className="mt-3 text-sm leading-6">{finding.recommendedAction}</p>
          </article>
          <article className="rev-card rounded-[20px] p-5">
            <p className="rev-label">Truth label</p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
              {finding.additiveToExecutiveGap
                ? "This calculated gap contributes to the executive billing-gap total. It is still not confirmed accounting loss."
                : "This value is shown separately and is not added to the executive billing-gap total."}
            </p>
          </article>
        </div>
      </section>

      <section className="rev-shell-panel rounded-[28px] p-6">
        <p className="rev-kicker">Deterministic calculation</p>
        <h2 className="rev-display-section mt-2">Formula and inputs</h2>
        <p className="mt-4 text-sm leading-6 text-[color:var(--text-muted)]">{finding.formula ?? "No financial formula. This is a human-review candidate."}</p>
        {inputs.length ? <div className="mt-5 grid gap-3 md:grid-cols-3">{inputs.map(([key, value]) => (
          <article className="rev-card rounded-[18px] p-4" key={key}><p className="rev-label">{key.replaceAll(/([A-Z])/g, " $1")}</p><p className="mt-2 font-bold">{typeof value === "number" && key.toLowerCase().includes("cents") ? money(value, finding.currency) : String(value)}</p></article>
        ))}</div> : null}
      </section>

      <section className="rev-shell-panel rounded-[28px] p-6">
        <p className="rev-kicker">Source lineage</p>
        <h2 className="rev-display-section mt-2">Evidence rows</h2>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-[color:var(--border)]">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="text-[color:var(--text-subtle)]"><tr><th className="px-4 py-3">Record</th><th className="px-4 py-3">Field</th><th className="px-4 py-3">Observed value</th><th className="px-4 py-3">Lineage</th></tr></thead>
            <tbody>{rows.map((row, index) => <tr className="border-t border-[color:var(--border)]" key={`${row.entityType}:${row.externalId}:${row.field}:${index}`}><td className="px-4 py-3 font-bold">{row.entityType} {row.externalId}</td><td className="px-4 py-3">{row.field}</td><td className="max-w-[280px] truncate px-4 py-3 text-[color:var(--text-muted)]">{evidenceValue(row, finding.currency)}</td><td className="px-4 py-3 text-[color:var(--text-muted)]">{row.provenance.fileName} · row {row.provenance.rowNumber}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
