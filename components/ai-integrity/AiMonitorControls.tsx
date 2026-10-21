"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function AiMonitorControls({ reports }: { reports: { id: string; label: string }[] }) {
  const router = useRouter(), requestKeys = useRef(new Map<string, string>());
  const [baseline, setBaseline] = useState(""), [current, setCurrent] = useState(""), [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function compare() {
    setBusy(true); setMessage("");
    const signature = `${baseline}:${current}`;
    if (!requestKeys.current.has(signature)) requestKeys.current.set(signature, crypto.randomUUID());
    try {
      const response = await fetch("/api/ai-integrity/monitoring", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "COMPARE", baselineSnapshotId: baseline, currentSnapshotId: current, requestKey: requestKeys.current.get(signature), syntheticDataConfirmed: confirmed }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Comparison unavailable.");
      requestKeys.current.delete(signature);
      setMessage(result.replayed ? "Existing comparison opened. No duplicate alerts created." : "Synthetic comparison saved. Local review alerts are ready.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Comparison unavailable."); }
    finally { setBusy(false); }
  }
  return <section className="rev-shell-panel rounded-[26px] p-5 md:p-6">
    <h2 className="text-lg font-semibold">Compare two reports</h2>
    <p className="mt-3 text-xs leading-6 text-[color:var(--text-muted)]">Choose adjacent periods of equal duration. Matching source and bucket scopes are required; missing evidence limits the comparison.</p>
    {reports.length < 2 ? <p className="mt-4 text-sm text-[color:var(--text-muted)]">Two synthetic reports are needed before comparison.</p> : <>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{[{ label: "Baseline report", value: baseline, change: setBaseline }, { label: "Later report", value: current, change: setCurrent }].map(({ label, value, change }) => <label key={label} className="min-w-0 text-xs"><span>{label}</span><select className="mt-2 w-full min-w-0 rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] p-3 text-xs" value={value} disabled={busy} onChange={(event) => change(event.target.value)}><option value="">Select a report</option>{reports.map((report) => <option key={report.id} value={report.id}>{report.label}</option>)}</select></label>)}</div>
      <label className="mt-5 flex items-start gap-3 text-xs leading-6"><input type="checkbox" checked={confirmed} disabled={busy} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 accent-[color:var(--accent)]" />These reports contain synthetic data. Create a comparison and local alerts only; no scheduled reads, emails or subscription.</label>
      <button type="button" className="rev-button-primary mt-4 px-4 py-3 text-xs disabled:opacity-40" disabled={busy || !confirmed || !baseline || !current || baseline === current} onClick={compare}>{busy ? "Comparing…" : "Compare synthetic reports"}</button>
    </>}
    {message ? <p role="status" className="mt-4 text-xs leading-6 text-[color:var(--text-muted)]">{message}</p> : null}
  </section>;
}

export function AiMonitorAcknowledge({ alertId }: { alertId: string }) {
  const router = useRouter(), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function acknowledge() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/ai-integrity/monitoring", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ACKNOWLEDGE", alertId }) });
      if (!response.ok) throw new Error("Alert acknowledgment unavailable.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unavailable."); }
    finally { setBusy(false); }
  }
  return <div><button type="button" disabled={busy} onClick={acknowledge} className="text-xs text-[color:var(--accent)] disabled:opacity-40">{busy ? "Saving…" : "Acknowledge alert"}</button>{message ? <p role="status" className="mt-2 text-xs">{message}</p> : null}</div>;
}
