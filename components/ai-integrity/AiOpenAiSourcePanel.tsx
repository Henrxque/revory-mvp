"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SourceView = { id: string; status: string; generation: number; consentStart: string | null; consentEnd: string | null; completeThrough: string | null; syncs: { id: string; status: string; effectiveStart: string | null; windowStart: string; windowEnd: string; activity: string | null }[] };

export function AiOpenAiSourcePanel({ organizationId, connection }: { organizationId: string; connection: SourceView | null }) {
  const router = useRouter();
  const key = useRef<string | null>(null);
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const [start, setStart] = useState(connection?.consentStart?.slice(0, 10) ?? twoDaysAgo);
  const [end, setEnd] = useState(connection?.consentEnd?.slice(0, 10) ?? yesterday);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const active = connection?.status === "ACTIVE";
  async function submit(action: "CONSENT" | "REVOKE" | "SYNC") {
    setBusy(true); setMessage("");
    if (!key.current) key.current = crypto.randomUUID();
    const windowStart = `${start}T00:00:00.000Z`, windowEnd = `${end}T00:00:00.000Z`;
    const payload = action === "CONSENT" ? { action, organizationId, windowStart, windowEnd, consentConfirmed: confirmed } : action === "REVOKE" ? { action, connectionId: connection?.id } : { action, connectionId: connection?.id, requestKey: key.current, windowStart, windowEnd };
    try {
      const response = await fetch("/api/ai-integrity/openai-source", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "OpenAI source unavailable.");
      key.current = null;
      setMessage(action === "CONSENT" ? "Consent saved for this organization and period." : action === "REVOKE" ? "Consent revoked. Existing source evidence remains subject to retention." : "Read completed. Inspect the activity label and evidence export below.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "OpenAI source unavailable."); }
    finally { setBusy(false); }
  }
  return <section className="rev-shell-panel rounded-[28px] p-5 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="[font-family:var(--font-app)] text-xl font-semibold">OpenAI organization</h2><span className="rounded-full border border-[color:var(--border-accent)] px-3 py-1 text-[10px] text-[color:var(--accent)]">{active ? "Read consent active" : "No active consent"}</span></div>
    <p className="mt-3 text-sm text-[color:var(--text-muted)]">{organizationId} · all projects · completions usage and reported costs · read only</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs text-[color:var(--text-muted)]">UTC start (inclusive)<input className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-3 text-sm text-white" type="date" value={start} disabled={busy || active} onChange={(event) => { setStart(event.target.value); key.current = null; }} /></label><label className="text-xs text-[color:var(--text-muted)]">{active ? "Read through UTC date (exclusive)" : "Consent end UTC (exclusive)"}<input className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-3 text-sm text-white" type="date" value={end} disabled={busy} onChange={(event) => { setEnd(event.target.value); key.current = null; }} /></label></div>
    {!active ? <div className="mt-5 space-y-4"><label className="flex items-start gap-3 text-xs leading-6"><input type="checkbox" className="mt-1 accent-[color:var(--accent)]" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I authorize REVORY to read this organization’s completions usage and costs, across all projects, only for the selected closed UTC period, to review source integrity. This does not authorize a customer scan or billing action.</label><button className="rev-button-primary px-4 py-3 text-xs disabled:opacity-40" disabled={!confirmed || busy || !start || !end} onClick={() => submit("CONSENT")}>Save read consent</button></div> : <div className="mt-5 space-y-4"><p className="text-xs text-[color:var(--text-muted)]">Consented period: {connection?.consentStart?.slice(0, 10)} to {connection?.consentEnd?.slice(0, 10)} UTC · read through: {connection?.completeThrough?.slice(0, 10) ?? "none"}. Choose an earlier read end to test incremental reads.</p><div className="flex flex-wrap gap-3"><button className="rev-button-primary px-4 py-3 text-xs disabled:opacity-40" disabled={busy} onClick={() => submit("SYNC")}>Read through selected date</button><button className="rev-button-secondary px-4 py-3 text-xs disabled:opacity-40" disabled={busy} onClick={() => submit("REVOKE")}>Revoke consent</button></div></div>}
    <div className="mt-6 space-y-2">{connection?.syncs.map((sync) => <div key={sync.id} className="rounded-2xl border border-[color:var(--border)] p-3 text-xs"><p>{sync.status === "COMPLETED" ? sync.activity === "NO_REPORTED_ROWS" ? "No activity reported in these API channels" : "Source read completed" : sync.status === "SKIPPED" ? "Already covered · no repeat read" : sync.status === "FAILED" ? "Read failed · checkpoint unchanged" : "Read in progress"}</p><p className="mt-1 text-[color:var(--text-subtle)]">{(sync.effectiveStart ?? sync.windowStart).slice(0, 10)} to {sync.windowEnd.slice(0, 10)} UTC</p>{sync.status === "COMPLETED" ? <a className="mt-2 inline-block text-[color:var(--accent)]" href={`/api/ai-integrity/openai-source/${sync.id}/export`}>Download source evidence JSON</a> : null}</div>)}</div>
    {message ? <p role="status" className="mt-5 rounded-2xl border border-[color:var(--border)] p-4 text-sm">{message}</p> : null}
  </section>;
}
