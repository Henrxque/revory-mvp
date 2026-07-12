"use client";

import { useActionState } from "react";

import { importCanonicalFiles, initialCanonicalImportActionState } from "@/src/app/(app)/app/imports/canonical-actions";

const datasets = [
  ["CUSTOMER", "Customers"], ["LEAD", "Leads"], ["ESTIMATE", "Estimates"], ["ACTIVITY", "Activities"],
  ["JOB", "Jobs"], ["INVOICE", "Invoices"], ["CHANGE_ORDER", "Change orders"], ["COST", "Costs"],
] as const;

export function CanonicalImportPanel() {
  const [state, action, pending] = useActionState(importCanonicalFiles, initialCanonicalImportActionState);
  return (
    <section className="rev-shell-panel rounded-[28px] p-6 md:p-7">
      <div className="max-w-3xl space-y-3">
        <p className="rev-kicker">Canonical secure intake</p>
        <h2 className="rev-display-section">Upload the exports that support this read.</h2>
        <p className="text-sm leading-6 text-[color:var(--text-muted)]">Use canonical REVORY CSV/XLSX headers. Mapping is explicit, formulas are rejected, unmatched links remain visible, and the whole batch commits atomically.</p>
      </div>
      <form action={action} className="mt-6 space-y-5">
        <div className="flex flex-wrap gap-2 text-xs">{datasets.map(([key, label]) => <a className="rev-button-secondary !min-h-0 !px-3 !py-2" download href={`/templates/revory-${key.toLowerCase().replace("change_order", "change-orders").replace("customer", "customers").replace("lead", "leads").replace("estimate", "estimates").replace("activity", "activities").replace("job", "jobs").replace("invoice", "invoices").replace("cost", "costs")}.csv`} key={key}>{label} template</a>)}</div>
        <label className="block max-w-md text-sm font-semibold">Source system<input className="rev-field mt-2 w-full" name="sourceSystem" defaultValue="manual-export" maxLength={80} /></label>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {datasets.map(([key, label]) => <label className="rounded-2xl border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-4 text-sm font-bold" key={key}>{label}<input accept=".csv,.xlsx" className="mt-3 block w-full text-xs font-normal text-[color:var(--text-muted)]" name={`file_${key}`} type="file" /></label>)}
        </div>
        <label className="flex items-start gap-3 text-sm text-[color:var(--text-muted)]"><input className="mt-1" name="mappingConfirmed" type="checkbox" value="yes" /><span>I confirm these files use the canonical REVORY template headers and that displayed values are source-system exports, not formulas.</span></label>
        <button className="rev-button-primary" disabled={pending} type="submit">{pending ? "Validating and committing…" : "Run Data Quality and import"}</button>
      </form>
      {state.status !== "idle" ? <div className={`mt-5 rounded-2xl border p-4 text-sm ${state.status === "error" ? "border-[rgba(255,114,141,.3)]" : "border-[color:var(--border-accent)]"}`}><p className="font-bold">{state.message}</p>{state.acceptedCount !== undefined ? <p className="mt-2 text-[color:var(--text-muted)]">{state.acceptedCount} records · {state.unmatchedCount} unmatched links · {state.eligibleRules?.length ?? 0} eligible rules · {state.findingCount ?? 0} active Quote Recovery findings</p> : null}{state.issues?.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-[color:var(--text-muted)]">{state.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}</div> : null}
    </section>
  );
}
