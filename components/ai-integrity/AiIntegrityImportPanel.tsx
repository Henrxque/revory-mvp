"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type SourceKind = "STRIPE_REVENUE" | "INTERNAL_LEDGER" | "PROVIDER_REPORT";
type Review = { headers: string[]; sampleRows: string[][]; suggestedMapping: Record<string, string>; fields: Array<{ name: string; label: string; required: boolean }>; requiredFields: string[]; rowCount: number };
type Plan = { acceptedCount: number; rejectedCount: number; issueCount: number; issues: Array<{ code: string; rowNumber: number | null; message: string; severity: "EXCLUDED" | "WARNING" }>; reviewToken: string | null };
type ImportResult = { batchId: string; replayed: boolean; acceptedCount: number; rejectedCount: number; insertedCount: number; duplicateCount: number; issueCount: number; issues: Plan["issues"]; message: string };

const sourceLabels: Record<SourceKind, string> = {
  STRIPE_REVENUE: "Stripe payments",
  INTERNAL_LEDGER: "Your product's usage",
  PROVIDER_REPORT: "AI provider usage & cost",
};
const sourceHelp: Record<SourceKind, string> = {
  STRIPE_REVENUE: "Payments recorded in Stripe. This scan keeps revenue as context; it does not calculate margin.",
  INTERNAL_LEDGER: "A file from your SaaS showing customer IDs, dates and recorded usage or credits. This is also called your internal ledger.",
  PROVIDER_REPORT: "Usage and cost reported by your AI provider, such as OpenAI. Estimates remain separate from reported costs.",
};
const sampleFiles: Record<SourceKind, string> = { STRIPE_REVENUE: "stripe-revenue.csv", INTERNAL_LEDGER: "internal-ledger.csv", PROVIDER_REPORT: "provider-report.csv" };

export function AiIntegrityImportPanel({ syntheticSamples = false }: { syntheticSamples?: boolean }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [sourceKind, setSourceKind] = useState<SourceKind>("STRIPE_REVENUE");
  const [file, setFile] = useState<File | null>(null);
  const [sourceSystem, setSourceSystem] = useState("stripe-export");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sourceTimezone, setSourceTimezone] = useState("UTC");
  const [review, setReview] = useState<Review | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [plan, setPlan] = useState<Plan | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function resetReview() { setReview(null); setMapping({}); setPlan(null); setConfirmed(false); setResult(null); setError(""); }
  function formData(includeMapping: boolean) {
    if (!file || !sourceSystem.trim() || !startDate || !endDate || startDate >= endDate) throw new Error("Choose a file, source system and a valid closed UTC date range.");
    const body = new FormData();
    body.set("file", file);
    body.set("sourceKind", sourceKind);
    body.set("sourceSystem", sourceSystem.trim());
    body.set("windowStart", `${startDate}T00:00:00Z`);
    body.set("windowEnd", `${endDate}T00:00:00Z`);
    body.set("sourceTimezone", sourceTimezone.trim() || "UTC");
    if (includeMapping) body.set("mapping", JSON.stringify(mapping));
    return body;
  }
  async function request(path: string, body: FormData) {
    const response = await fetch(path, { method: "POST", body, cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }
  async function firstReview() {
    setBusy(true); setError(""); setPlan(null); setResult(null);
    try {
      const data = await request("/api/ai-integrity/review", formData(false));
      setReview(data.review); setMapping(data.review.suggestedMapping); setConfirmed(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Review failed."); }
    finally { setBusy(false); }
  }
  async function validateRows() {
    setBusy(true); setError(""); setResult(null);
    try {
      const data = await request("/api/ai-integrity/review", formData(true));
      setPlan(data.plan); setConfirmed(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Validation failed."); }
    finally { setBusy(false); }
  }
  async function importRows() {
    if (!confirmed || !plan?.reviewToken) return;
    setBusy(true); setError("");
    try {
      const body = formData(true);
      body.set("mappingConfirmed", "yes");
      body.set("reviewToken", plan.reviewToken);
      const data = await request("/api/ai-integrity/import", body);
      setResult(data); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Import failed."); }
    finally { setBusy(false); }
  }
  async function loadSample() {
    resetReview(); setBusy(true);
    try {
      const response = await fetch(`/samples/ai-integrity/${sampleFiles[sourceKind]}`);
      if (!response.ok) throw new Error("The example file could not be loaded. Try again or download it below.");
      setFile(new File([await response.blob()], sampleFiles[sourceKind], { type: "text/csv" }));
      if (fileInput.current) fileInput.current.value = "";
      setStartDate("2026-08-01"); setEndDate("2026-09-01"); setSourceTimezone("UTC");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load the example."); }
    finally { setBusy(false); }
  }

  const inputClass = "min-h-11 w-full rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--background-card)] px-3 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--accent)]";
  return <section className="rev-shell-panel rounded-[28px] p-5 md:p-7">
    <h2 className="text-lg font-semibold">Which data are you adding?</h2>
    <p className="mt-2 mb-5 text-sm leading-7 text-[color:var(--text-muted)]">Choose one source, then review the file before saving it. Repeat for each of the three sources.</p>
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2 text-sm font-semibold text-[color:var(--text-muted)]">Data source
        <select className={inputClass} disabled={busy} value={sourceKind} onChange={(event) => { const kind = event.target.value as SourceKind; setSourceKind(kind); setFile(null); if (fileInput.current) fileInput.current.value = ""; setSourceSystem(kind === "STRIPE_REVENUE" ? "stripe-export" : kind === "INTERNAL_LEDGER" ? "internal-ledger" : "provider-report"); resetReview(); }}>
          {Object.entries(sourceLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <label className="space-y-2 text-xs font-semibold text-[color:var(--text-muted)]">CSV or XLSX file · 8 MB max
        <input ref={fileInput} disabled={busy} className={`${inputClass} py-2.5`} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { setFile(event.target.files?.[0] ?? null); resetReview(); }} />
      </label>
      <p className="text-sm leading-7 text-[color:var(--text-muted)] md:col-span-2">{sourceHelp[sourceKind]}</p>
      {syntheticSamples ? <div className="rounded-2xl border border-[color:var(--border-accent)] p-4 md:col-span-2"><p className="text-sm font-semibold">Trying the app? Start with an example.</p><p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">Load the fictional August file for this source. Its period will be filled in for you. Customer files are not accepted in this preview.</p><button type="button" disabled={busy} onClick={() => void loadSample()} className="rev-action-button mt-4 px-4 py-3 text-sm">Use example: {sourceLabels[sourceKind]} →</button></div> : null}
      {file ? <p role="status" className="break-all text-sm font-semibold text-[color:var(--accent)] md:col-span-2">Selected file: {file.name}</p> : null}
      <label className="space-y-2 text-sm font-semibold text-[color:var(--text-muted)]">Period starts · UTC
        <input className={inputClass} type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); resetReview(); }} />
      </label>
      <label className="space-y-2 text-sm font-semibold text-[color:var(--text-muted)]">Period ends · UTC, this day excluded
        <input className={inputClass} type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); resetReview(); }} />
      </label>
    </div>
    <p className="mt-4 text-sm leading-6 text-[color:var(--text-muted)]">Use the same period for all three files. For August, choose August 1 to September 1; September 1 is outside the analysis.</p>
    <details className="mt-4 rounded-xl border border-[color:var(--border)] p-4"><summary className="cursor-pointer text-sm text-[color:var(--text-muted)]">File settings & format requirements</summary><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="space-y-2 text-xs font-semibold text-[color:var(--text-muted)]">Source system<input className={inputClass} value={sourceSystem} onChange={(event) => { setSourceSystem(event.target.value); resetReview(); }} /></label><label className="space-y-2 text-xs font-semibold text-[color:var(--text-muted)]">Source timezone label<input className={inputClass} value={sourceTimezone} onChange={(event) => { setSourceTimezone(event.target.value); resetReview(); }} /></label></div><p className="mt-4 text-xs leading-6 text-[color:var(--text-muted)]">Dates inside the file need their own timezone offset. Stripe amounts use minor units, such as cents; provider costs use decimal currency units. Import one source per file.</p></details>
    <div className="mt-3 flex flex-wrap gap-4 text-xs text-[color:var(--accent)]"><a href="/templates/ai-integrity-stripe-revenue.csv" download>Stripe template</a><a href="/templates/ai-integrity-internal-ledger.csv" download>Ledger template</a><a href="/templates/ai-integrity-provider-report.csv" download>Provider template</a></div>
    {syntheticSamples ? <div className="mt-4 rounded-xl border border-[color:var(--border)] p-4"><p className="text-xs leading-6 text-[color:var(--text-muted)]">Test with the synthetic August dataset: use August 1–September 1, 2026 (UTC). Never upload customer data into this preview.</p><div className="mt-2 flex flex-wrap gap-4 text-xs text-[color:var(--accent)]"><a href="/samples/ai-integrity/stripe-revenue.csv" download>Synthetic Stripe</a><a href="/samples/ai-integrity/internal-ledger.csv" download>Synthetic ledger</a><a href="/samples/ai-integrity/provider-report.csv" download>Synthetic provider</a></div></div> : null}
    <button className="rev-action-button mt-5 px-5 py-3 text-sm" type="button" disabled={busy || !file || !startDate || !endDate} onClick={firstReview}>{busy ? "Working…" : "Next: review this file →"}</button>
    {error ? <p role="alert" className="mt-4 rounded-xl border border-[color:var(--danger)] px-4 py-3 text-sm text-[color:var(--danger)]">{error}</p> : null}
    {review ? <div className="mt-7 space-y-5 border-t border-[color:var(--border)] pt-6">
      <div><h2 className="[font-family:var(--font-app)] text-lg font-semibold">Column review</h2><p className="mt-1 text-xs text-[color:var(--text-muted)]">{review.rowCount} rows · Confirm every required field. Suggestions are deterministic and never create customer links.</p></div>
      <div className="grid gap-3 md:grid-cols-2">{review.headers.map((header) => <label key={header} className="space-y-2 text-xs text-[color:var(--text-muted)]"><span className="font-semibold text-[color:var(--foreground)]">{header}</span><select className={inputClass} value={mapping[header] ?? ""} onChange={(event) => { setMapping({ ...mapping, [header]: event.target.value }); setPlan(null); setConfirmed(false); }}><option value="">Ignore this column</option>{review.fields.map((field) => <option key={field.name} value={field.name}>{field.label}{field.required ? " · required" : ""}</option>)}</select></label>)}</div>
      <div className="overflow-x-auto rounded-xl border border-[color:var(--border)]"><table className="w-full min-w-[640px] text-left text-xs"><thead className="bg-[color:var(--background-card)]"><tr>{review.headers.map((header) => <th key={header} className="px-3 py-2 font-semibold">{header}</th>)}</tr></thead><tbody>{review.sampleRows.map((row, index) => <tr key={index} className="border-t border-[color:var(--border)]">{row.map((cell, column) => <td key={column} className="max-w-48 truncate px-3 py-2 text-[color:var(--text-muted)]" title={cell}>{cell || "—"}</td>)}</tr>)}</tbody></table></div>
      <button className="rev-action-button px-5 py-3 text-sm" type="button" disabled={busy} onClick={validateRows}>{busy ? "Working…" : "2 · Validate rows and Data Quality"}</button>
    </div> : null}
    {plan ? <div className="mt-6 space-y-4 rounded-2xl border border-[color:var(--border-accent)] bg-[color:var(--background-card)] p-5">
      <h2 className="[font-family:var(--font-app)] text-lg font-semibold">Data Quality preview</h2>
      <p className="text-sm text-[color:var(--text-muted)]">{plan.acceptedCount} accepted rows · {plan.rejectedCount} excluded rows · {plan.issueCount} quality notes. Excluded rows will not be stored as financial records. Warnings remain attached to accepted evidence.</p>
      {plan.issues.length ? <div className="max-h-56 space-y-2 overflow-y-auto text-xs">{plan.issues.map((issue, index) => <p key={index} className="rounded-lg border border-[color:var(--border)] px-3 py-2 text-[color:var(--text-muted)]">Row {issue.rowNumber ?? "—"} · {issue.severity === "EXCLUDED" ? "Excluded" : "Warning"} · {issue.code}: {issue.message}</p>)}</div> : <p className="text-xs text-[color:var(--accent)]">No row-level issues detected.</p>}
      {plan.issueCount > plan.issues.length ? <p className="text-xs text-[color:var(--text-subtle)]">Showing the first {plan.issues.length} issues; the full list is retained with the batch.</p> : null}
      <label className="flex items-start gap-3 text-xs leading-5 text-[color:var(--text-muted)]"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I checked the mapping, date range and excluded rows. Store only the valid evidence; this does not run a scan or produce financial claims.</label>
      <button className="rev-action-button px-5 py-3 text-sm" type="button" disabled={busy || !confirmed || !plan.reviewToken || plan.acceptedCount === 0} onClick={importRows}>{busy ? "Working…" : "3 · Store reviewed evidence"}</button>
    </div> : null}
    {result ? <div role="status" className="mt-6 rounded-2xl border border-[color:var(--border-accent)] p-5 text-sm"><p className="font-semibold text-[color:var(--foreground)]">{result.replayed ? "Existing batch returned" : "Evidence stored"}</p><p className="mt-2 text-[color:var(--text-muted)]">{result.insertedCount} new · {result.duplicateCount} repeated · {result.rejectedCount} excluded. {result.message}</p><p className="mt-2 break-all text-xs text-[color:var(--text-subtle)]">Batch {result.batchId}</p></div> : null}
  </section>;
}
