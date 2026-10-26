"use client";

import type { ConnectedReportSetup } from "@/services/ai-integrity/report-draft";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { initialScanSelection, scanSources, scanUtcTimestamp, type ScanSetupBatch, type ScanSource } from "./scan-setup";

const labels = { STRIPE_REVENUE: "Stripe payments", INTERNAL_LEDGER: "Your product's usage", PROVIDER_REPORT: "AI provider usage & cost" };
type Timing = { exportedAt: string; completeThrough: string };

export function AiIntegrityScanPanel({ batches, initialAsOf, grants, remoteSyntheticPreview = false, connectedReports = false, savedSetup, requestedSelection, multiProvider = false }: {
  batches: ScanSetupBatch[]; initialAsOf: string; grants?: Array<{ id: string; label: string }>;
  remoteSyntheticPreview?: boolean; connectedReports?: boolean; savedSetup?: { revision: number; setup: ConnectedReportSetup }; requestedSelection?: Partial<Record<ScanSource, string>>; multiProvider?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(() => initialScanSelection(batches, { ...savedSetup?.setup.selected, ...Object.fromEntries(Object.entries(requestedSelection ?? {}).filter(([, value]) => value !== undefined)) }));
  const [timing, setTiming] = useState<Partial<Record<ScanSource, Timing>>>(() => Object.fromEntries(scanSources.filter((source) => selected[source] === savedSetup?.setup.selected[source] && savedSetup?.setup.timing[source]).map((source) => [source, savedSetup!.setup.timing[source]])));
  const [extraProviderIds,setExtraProviderIds] = useState<string[]>(() => multiProvider ? (savedSetup?.setup.providerBatchIds ?? []).filter(id => id !== selected.PROVIDER_REPORT) : []);
  const [providerTiming,setProviderTiming] = useState<Record<string,Timing>>(savedSetup?.setup.providerTiming ?? {});
  const [grantId, setGrantId] = useState(grants?.length === 1 ? grants[0].id : "");
  const [asOf, setAsOf] = useState(savedSetup?.setup.asOf ?? initialAsOf.slice(0, 19));
  const [lag, setLag] = useState(savedSetup?.setup.lag ?? "");
  const [revision, setRevision] = useState(savedSetup?.revision ?? 0);
  const [saveNotice, setSaveNotice] = useState("");
  const [closure, setClosure] = useState(false);
  const [synthetic, setSynthetic] = useState(false);
  const chosen = scanSources.map((source) => batches.find((batch) => batch.id === selected[source] && batch.sourceKind === source && !batch.duplicateCount));
  const extraChosen = extraProviderIds.map(id => batches.find(batch => batch.id === id && batch.sourceKind === "PROVIDER_REPORT" && !batch.duplicateCount));
  const allChosen = [...chosen,...extraChosen];
  const samePeriod = allChosen.every(Boolean) && allChosen.every((batch) => batch?.windowStart === chosen[0]?.windowStart && batch?.windowEnd === chosen[0]?.windowEnd);
  const timesComplete = scanSources.every((source) => (chosen[scanSources.indexOf(source)]?.apiFetchedAt || timing[source]?.exportedAt) && timing[source]?.completeThrough) && extraChosen.every(batch => batch && (batch.apiFetchedAt || providerTiming[batch.id]?.exportedAt) && providerTiming[batch.id]?.completeThrough);
  const lagValid = lag !== "" && Number.isInteger(Number(lag)) && Number(lag) >= 0 && Number(lag) <= 720;
  const ready = samePeriod && timesComplete && lagValid && closure && synthetic && (!grants || Boolean(grantId));
  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--background-card)] px-3 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--accent)]";
  const missing = !samePeriod ? "Choose one file from each source for the same period." : !timesComplete ? "Add export and completeness dates for each file below." : !lagValid ? "Choose a settling delay from 0 to 720 whole hours." : !closure || !synthetic ? "Confirm the two review statements below." : grants && !grantId ? "Select an available report." : "Your setup is complete. You can create the report.";

  async function saveSetup() {
    setBusy(true); setError(""); setSaveNotice("");
    try {
      const response = await fetch("/api/ai-integrity/report-setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision, setup: { selected, timing, lag, asOf, ...(multiProvider && selected.PROVIDER_REPORT ? {providerBatchIds:[selected.PROVIDER_REPORT,...extraProviderIds],providerTiming} : {}) } }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRevision(data.revision); setSaveNotice("Setup saved in this workspace. Recheck consent and completeness before creating the report.");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save setup."); }
    finally { setBusy(false); }
  }
  function updateTiming(source: ScanSource, field: keyof Timing, value: string) {
    setTiming((previous) => ({ ...previous, [source]: { exportedAt: previous[source]?.exportedAt ?? "", completeThrough: previous[source]?.completeThrough ?? "", [field]: value } }));
    setClosure(false); setSaveNotice("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/ai-integrity/scans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        batchIds: [...scanSources.map((source) => selected[source]),...extraProviderIds], asOf: scanUtcTimestamp(asOf), lagHours: Number(lag),
        sourceReviews: [...scanSources.map((source) => ({ batchId: selected[source], exportedAt: chosen[scanSources.indexOf(source)]?.apiFetchedAt ?? scanUtcTimestamp(timing[source]!.exportedAt), completeThrough: scanUtcTimestamp(timing[source]!.completeThrough) })),...extraChosen.map(batch => ({batchId:batch!.id,exportedAt:batch!.apiFetchedAt ?? scanUtcTimestamp(providerTiming[batch!.id].exportedAt),completeThrough:scanUtcTimestamp(providerTiming[batch!.id].completeThrough)}))],
        syntheticDataConfirmed: connectedReports ? false : synthetic, ...(connectedReports ? { connectedReportAuthorized: synthetic } : {}), closureReviewed: closure, ...(grants ? { grantId } : {}),
      }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to create the report. Check the selected files and dates.");
      router.push(grants ? `/app/ai-integrity/reports/${encodeURIComponent(result.snapshotId)}` : `/app/ai-integrity/scans?snapshot=${encodeURIComponent(result.snapshotId)}`);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create the report."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="rev-shell-panel space-y-6 rounded-[26px] p-5 md:p-7">
    <div><p className="rev-kicker">{connectedReports ? "Report setup · Connected sources" : "Report setup · Synthetic data only"}</p><h2 className="mt-3 text-xl font-semibold">Check your sources, then create your report.</h2><p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">Sources with a single matching period are selected for you. Check them below. Source completeness needs your review; it is not inferred from upload time or API pagination.</p></div>
    {grants ? grants.length === 1 ? <p className="rounded-xl border border-[color:var(--border-accent)] px-4 py-3 text-sm text-[color:var(--accent)]">{remoteSyntheticPreview ? "1 synthetic test report available · no payment" : "1 report available"}</p> : <label className="block text-sm text-[color:var(--text-muted)]">Available test report<select required className={inputClass} value={grantId} onChange={(event) => setGrantId(event.target.value)}><option value="">Choose test access</option>{grants.map((grant) => <option key={grant.id} value={grant.id}>{grant.label}</option>)}</select></label> : null}
    <fieldset className="space-y-4"><legend className="text-base font-semibold">{multiProvider ? "1. Choose Stripe, your ledger and provider evidence" : "1. Check the three files"}</legend><div className="grid gap-4 lg:grid-cols-3">{scanSources.map((source) => <label key={source} className="min-w-0 text-sm text-[color:var(--text-muted)]">{labels[source]}<select required className={inputClass} value={selected[source] ?? ""} onChange={(event) => { setSelected((previous) => ({ ...previous, [source]: event.target.value })); if (source === "PROVIDER_REPORT") {setExtraProviderIds([]);setProviderTiming({});setSynthetic(false);} setTiming((previous) => ({ ...previous, [source]: undefined })); setClosure(false); setSaveNotice(""); }}><option value="">Choose a file</option>{batches.filter((batch) => batch.sourceKind === source).map((batch) => <option key={batch.id} value={batch.id} disabled={batch.duplicateCount > 0}>{batch.fileName}{batch.duplicateCount ? " · repeated import" : ` · ${batch.windowStart.slice(0, 10)}`}</option>)}</select></label>)}</div>
      {multiProvider ? <div className="rounded-2xl border border-[color:var(--border)] p-4"><h3 className="text-sm font-semibold">Include other AI providers in this report</h3><p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">Choose up to two additional providers for the same period. Select one complete read per provider. Unselected sources are outside this report; their activity is unknown.</p><div className="mt-3 space-y-3">{batches.filter(batch => batch.sourceKind === "PROVIDER_REPORT" && batch.id !== selected.PROVIDER_REPORT).map(batch => {
        const sameProvider = Boolean(batch.sourceProvider && chosen[2]?.sourceProvider === batch.sourceProvider) || extraChosen.some(other => other?.id !== batch.id && other?.sourceProvider && other.sourceProvider === batch.sourceProvider);
        return <label key={batch.id} className="flex items-start gap-3 text-sm leading-6 text-[color:var(--text-muted)]"><input type="checkbox" className="mt-1" checked={extraProviderIds.includes(batch.id)} disabled={busy || !chosen[2] || batch.duplicateCount > 0 || sameProvider || (!extraProviderIds.includes(batch.id) && extraProviderIds.length >= 2)} onChange={event => {setExtraProviderIds(previous => event.target.checked ? [...previous,batch.id] : previous.filter(id => id !== batch.id));setClosure(false);setSynthetic(false);setSaveNotice("");}}/><span>{batch.sourceProvider ?? "Provider evidence"} · {batch.windowStart.slice(0,10)} · {batch.fileName}{sameProvider ? " · already represented" : ""}</span></label>;
      })}</div></div> : null}
      {samePeriod ? <p className="text-sm text-[color:var(--accent)]">Analysis period: {chosen[0]!.windowStart.slice(0, 10)} to {chosen[0]!.windowEnd.slice(0, 10)} · UTC, end excluded</p> : <p className="text-sm leading-6 text-[color:var(--text-muted)]">{multiProvider ? "All selected sources must cover the same period. " : "All three files must cover the same period. "} <Link className="font-semibold text-[color:var(--accent)]" href="/app/ai-integrity/imports">Add missing data</Link></p>}
    </fieldset>
    <fieldset className="space-y-4 border-t border-[color:var(--border)] pt-5"><legend className="text-base font-semibold">2. Confirm when the data were complete</legend><p className="text-sm leading-7 text-[color:var(--text-muted)]">For each source, review its collection date and the date through which it contains complete data. API collection dates are taken from the saved evidence and cannot be changed here. Every time below is in UTC. Uploading a file does not prove it is complete.</p>
      {scanSources.map((source, index) => <div key={source} className="rounded-2xl border border-[color:var(--border)] p-4"><h3 className="text-sm font-semibold">{labels[source]}</h3><div className="mt-3 grid gap-4 md:grid-cols-2"><label className="text-sm text-[color:var(--text-muted)]">When was it exported? · UTC<input required type="datetime-local" step="1" className={inputClass} disabled={Boolean(chosen[index]?.apiFetchedAt)} value={chosen[index]?.apiFetchedAt?.slice(0, 19) ?? timing[source]?.exportedAt ?? ""} onChange={(event) => updateTiming(source, "exportedAt", event.target.value)} /></label><label className="text-sm text-[color:var(--text-muted)]">Includes complete data up to · UTC<input required type="datetime-local" step="1" className={inputClass} value={timing[source]?.completeThrough ?? ""} onChange={(event) => updateTiming(source, "completeThrough", event.target.value)} /></label></div><p className="mt-3 text-xs leading-6 text-[color:var(--text-muted)]">{chosen[index] ? `To cover this period, complete data must reach ${chosen[index]!.windowEnd.slice(0, 10)} at ${chosen[index]!.windowEnd.slice(11, 16)} UTC.` : "Choose a file above to see the date its complete data must reach."}</p></div>)}
      {extraChosen.map(batch => batch ? <div key={batch.id} className="rounded-2xl border border-[color:var(--border)] p-4"><h3 className="text-sm font-semibold">{batch.sourceProvider ?? "Additional AI provider"} · {batch.fileName}</h3><div className="mt-3 grid gap-4 md:grid-cols-2">{(["exportedAt","completeThrough"] as const).map(field => <label key={field} className="text-sm text-[color:var(--text-muted)]">{field === "exportedAt" ? "Collected or exported at · UTC" : "Includes complete data up to · UTC"}<input required type="datetime-local" step="1" className={inputClass} disabled={field === "exportedAt" && Boolean(batch.apiFetchedAt)} value={field === "exportedAt" && batch.apiFetchedAt ? batch.apiFetchedAt.slice(0,19) : providerTiming[batch.id]?.[field] ?? ""} onChange={event => {setProviderTiming(previous => ({...previous,[batch.id]:{exportedAt:previous[batch.id]?.exportedAt ?? "",completeThrough:previous[batch.id]?.completeThrough ?? "",[field]:event.target.value}}));setClosure(false);setSaveNotice("");}}/></label>)}</div></div> : null)}
      <label className="block max-w-xl text-sm text-[color:var(--text-muted)]">How many hours do the sources need to settle?<input required type="number" min="0" max="720" step="1" value={lag} onChange={(event) => { setLag(event.target.value); setClosure(false); setSaveNotice(""); }} className={inputClass} placeholder="Enter the delay you reviewed, in hours" /><span className="mt-2 block text-xs leading-6">Use a delay supported by the source reports. Choose 0 only when no further delay is needed. Incomplete or unsettled data limit the comparison.</span></label>
      <details className="rounded-xl border border-[color:var(--border)] p-4"><summary className="cursor-pointer text-sm text-[color:var(--text-muted)]">Advanced: analysis timestamp</summary><label className="mt-4 block text-sm text-[color:var(--text-muted)]">Analysis time · UTC<input required type="datetime-local" step="1" className={inputClass} value={asOf} onChange={(event) => { setAsOf(event.target.value); setClosure(false); setSaveNotice(""); }} /></label></details>
    </fieldset>
    <fieldset className="space-y-4 border-t border-[color:var(--border)] pt-5"><legend className="text-base font-semibold">3. Confirm and create</legend><label className="flex items-start gap-3 text-sm leading-7 text-[color:var(--text-muted)]"><input required type="checkbox" className="mt-2" checked={closure} onChange={(event) => setClosure(event.target.checked)} />I checked that the files cover the chosen period and reviewed their export dates and settling delay.</label><label className="flex items-start gap-3 text-sm leading-7 text-[color:var(--text-muted)]"><input required type="checkbox" className="mt-2" checked={synthetic} onChange={(event) => setSynthetic(event.target.checked)} />{connectedReports ? "I am authorized to analyze these sources for this workspace and reviewed the API coverage, internal file and customer links. Source differences do not prove financial loss." : "These files contain fictional test data only."}</label></fieldset>
    {connectedReports ? <div className="space-y-3"><button className="rev-button-secondary" disabled={busy} type="button" onClick={() => void saveSetup()}>Save setup for later</button>{saveNotice ? <p role="status" className="text-sm text-[color:var(--accent)]">{saveNotice}</p> : null}</div> : null}
    {error ? <p role="alert" className="rounded-xl border border-[color:var(--danger)] p-4 text-sm text-[color:var(--danger)]">{error}</p> : null}
    <div className="rounded-2xl border border-[color:var(--border-accent)] p-5"><p role="status" className="mb-4 text-sm leading-6 text-[color:var(--text-muted)]">{missing}</p><button className="rev-action-button px-5 py-3 text-sm" disabled={busy || !ready} type="submit">{busy ? "Comparing your data…" : connectedReports ? "Create my connected report" : "Create my test report"}</button><p className="mt-3 text-xs leading-6 text-[color:var(--text-muted)]">The report checks usage differences and spend without customer links. It does not calculate margin or credit balances.</p></div>
  </form>;
}
