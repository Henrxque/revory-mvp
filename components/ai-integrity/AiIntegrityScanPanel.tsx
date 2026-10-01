"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Batch = { id: string; sourceKind: string; fileName: string; windowStart: string; windowEnd: string; duplicateCount: number };
const sources = ["STRIPE_REVENUE", "INTERNAL_LEDGER", "PROVIDER_REPORT"] as const;
const labels = { STRIPE_REVENUE: "Stripe revenue", INTERNAL_LEDGER: "Internal ledger", PROVIDER_REPORT: "Provider report" };

export function AiIntegrityScanPanel({ batches, initialAsOf, grants }: { batches: Batch[]; initialAsOf: string; grants?: Array<{ id: string; label: string }> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Record<string, string>>({});
  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--background-card)] px-3 text-sm text-[color:var(--foreground)]";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/ai-integrity/scans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        batchIds: sources.map((s) => selected[s]), asOf: data.get("asOf"), lagHours: Number(data.get("lagHours")),
        sourceReviews: sources.map((s) => ({ batchId: selected[s], exportedAt: data.get(`${s}-exportedAt`), completeThrough: data.get(`${s}-completeThrough`) })),
        syntheticDataConfirmed: data.get("synthetic") === "on", closureReviewed: data.get("closure") === "on",
        ...(grants ? { grantId: data.get("grantId") } : {}),
      }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to run scan.");
      router.push(grants ? `/app/ai-integrity/reports/${encodeURIComponent(result.snapshotId)}` : `/app/ai-integrity/scans?snapshot=${encodeURIComponent(result.snapshotId)}`); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to run scan."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="rev-shell-panel space-y-5 rounded-[26px] p-5 md:p-6">
    <h2 className="[font-family:var(--font-app)] text-lg font-semibold">Review a closed period</h2>
    {grants ? <label className="block text-xs text-[color:var(--text-muted)]">Confirmed test purchase<select required className={inputClass} name="grantId"><option value="">Choose an available scan</option>{grants.map((grant) => <option key={grant.id} value={grant.id}>{grant.label}</option>)}</select></label> : null}
    <p className="text-sm leading-6 text-[color:var(--text-muted)]">Use synthetic fixtures for this internal scan. Select one complete batch per source covering the same period. Timestamps require an explicit timezone, such as 2026-09-03T00:00:00Z.</p>
    {sources.map((source) => {
      const batch = batches.find((b) => b.id === selected[source]);
      return <fieldset key={source} className="grid min-w-0 gap-3 rounded-2xl border border-[color:var(--border)] p-4 md:grid-cols-2">
        <legend className="px-2 text-sm font-semibold">{labels[source]}</legend>
        <label className="text-xs text-[color:var(--text-muted)] md:col-span-2">Imported evidence<select required className={inputClass} value={selected[source] ?? ""} onChange={(e) => setSelected((previous) => ({ ...previous, [source]: e.target.value }))}>
          <option value="">Select a batch</option>{batches.filter((b) => b.sourceKind === source).map((b) => <option key={b.id} value={b.id} disabled={b.duplicateCount > 0}>{b.fileName} · {b.windowStart.slice(0, 10)} → {b.windowEnd.slice(0, 10)}{b.duplicateCount ? " · select original import" : ""}</option>)}
        </select></label>
        {batch ? <p className="break-all text-xs text-[color:var(--text-subtle)] md:col-span-2">Window: {batch.windowStart} to {batch.windowEnd} (end excluded).</p> : null}
        <label className="text-xs text-[color:var(--text-muted)]">Exported / refreshed at<input required className={inputClass} name={`${source}-exportedAt`} placeholder="2026-09-03T00:00:00Z" /></label>
        <label className="text-xs text-[color:var(--text-muted)]">Complete through<input required className={inputClass} name={`${source}-completeThrough`} placeholder="2026-09-01T00:00:00Z" /></label>
      </fieldset>;
    })}
    <div className="grid gap-4 md:grid-cols-2"><label className="text-xs text-[color:var(--text-muted)]">Analysis time<input required name="asOf" defaultValue={initialAsOf} className={inputClass} /></label><label className="text-xs text-[color:var(--text-muted)]">Consolidation lag · hours<input required type="number" min="0" max="720" step="1" name="lagHours" className={inputClass} placeholder="Choose based on the source reports" /></label></div>
    <p className="text-xs leading-6 text-[color:var(--text-subtle)]">Lag is an explicit review choice, not a provider guarantee. Incomplete periods and reports that have not passed this lag produce suppressions. Revenue, margin and credit-balance rules are outside this scan.</p>
    <label className="flex items-start gap-3 text-xs leading-6 text-[color:var(--text-muted)]"><input required type="checkbox" name="closure" className="mt-1" />I reviewed source completeness, export times and the consolidation lag for the selected scope.</label>
    <label className="flex items-start gap-3 text-xs leading-6 text-[color:var(--text-muted)]"><input required type="checkbox" name="synthetic" className="mt-1" />These imports contain only synthetic test data.</label>
    {error ? <p role="alert" className="text-sm text-[color:var(--danger)]">{error}</p> : null}
    <button className="rev-action-button px-5 py-3 text-sm" disabled={busy || (grants !== undefined && !grants.length)} type="submit">{busy ? "Reconciling evidence…" : grants ? "Create my test report" : "Run internal scan"}</button>
  </form>;
}
