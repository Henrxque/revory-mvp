"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type AiSourceRehearsalView = { id: string; provider: string; status: string; generation: number; completeThrough: string | null; syncs: { id: string; status: string; windowStart: string; windowEnd: string; effectiveStart: string | null }[] };
export function AiSourceRehearsalPanel({ connections }: { connections: AiSourceRehearsalView[] }) {
  const router = useRouter(), keys = useRef(new Map<string, string>());
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({}), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function submit(action: "CONSENT" | "REVOKE" | "SYNC", provider: string, connection?: AiSourceRehearsalView, end?: string) {
    setBusy(true); setMessage("");
    const signature = `${connection?.id}:${connection?.generation}:${end}`;
    if (!keys.current.has(signature)) keys.current.set(signature, crypto.randomUUID());
    const input = action === "CONSENT" ? { provider, syntheticConsentConfirmed: confirmed[provider] === true } : action === "REVOKE" ? { connectionId: connection!.id }
      : { connectionId: connection!.id, requestKey: keys.current.get(signature), windowStart: "2026-08-01T00:00:00.000Z", windowEnd: end, lagHours: 24 };
    try {
      const response = await fetch("/api/ai-integrity/sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...input }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Source rehearsal unavailable.");
      keys.current.delete(signature);
      setMessage(action === "REVOKE" ? "Synthetic read consent revoked. Existing evidence remains subject to retention." : action === "CONSENT" ? "Synthetic reads enabled. No real account is connected." : result.status === "SKIPPED" ? "This window is already covered. No source read was repeated." : "Synthetic read saved separately from scan evidence.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Source rehearsal unavailable."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <div className="grid gap-5 xl:grid-cols-2">{["STRIPE", "OPENAI"].map((provider) => {
      const connection = connections.find((item) => item.provider === provider), active = connection?.status === "ACTIVE";
      return <section key={provider} className="rev-shell-panel min-w-0 rounded-[28px] p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="[font-family:var(--font-app)] text-xl font-semibold">{provider === "STRIPE" ? "Stripe" : "OpenAI"}</h2><span className="rounded-full border border-[color:var(--border-accent)] px-3 py-1 text-[10px] text-[color:var(--accent)]">{active ? "Synthetic reads enabled" : "Not connected"}</span></div>
        <p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">{provider === "STRIPE" ? "Invoice creation context only. Amount paid is not net collected revenue; refunds, credits and subscription changes still need separate review." : "Daily completions usage and reported cost stay separate. Cost has no automatic model or customer allocation. Cached input tokens are not counted twice."}</p>
        {!active ? <div className="mt-5 space-y-4"><label className="flex items-start gap-3 text-xs leading-6"><input type="checkbox" checked={confirmed[provider] ?? false} onChange={(event) => setConfirmed({ ...confirmed, [provider]: event.target.checked })} className="mt-1 accent-[color:var(--accent)]" />Allow reads of this synthetic account for a local rehearsal. This does not authorize access to a real account.</label><button type="button" disabled={busy || !confirmed[provider]} className="rev-button-primary px-4 py-3 text-xs disabled:opacity-40" onClick={() => submit("CONSENT", provider)}>Allow {provider === "STRIPE" ? "Stripe" : "OpenAI"} rehearsal</button></div>
          : <div className="mt-5 space-y-4"><p className="text-xs text-[color:var(--text-muted)]">Read through: {connection.completeThrough ? `${connection.completeThrough.slice(0, 10)} UTC (exclusive)` : "No completed read"}</p><div className="flex flex-wrap gap-3"><button type="button" disabled={busy} className="rev-button-primary px-4 py-3 text-xs disabled:opacity-40" onClick={() => submit("SYNC", provider, connection, "2026-08-02T00:00:00.000Z")}>Read August 1</button><button type="button" disabled={busy} className="rev-button-secondary px-4 py-3 text-xs disabled:opacity-40" onClick={() => submit("SYNC", provider, connection, "2026-08-03T00:00:00.000Z")}>Extend through August 2</button><button type="button" disabled={busy} className="px-2 py-3 text-xs text-[color:var(--text-muted)] disabled:opacity-40" onClick={() => submit("REVOKE", provider, connection)}>Revoke {provider === "STRIPE" ? "Stripe" : "OpenAI"} rehearsal</button></div></div>}
        <div className="mt-5 space-y-2">{connection?.syncs.map((sync) => <div key={sync.id} className="rounded-2xl border border-[color:var(--border)] p-3 text-xs"><p>{sync.status === "SKIPPED" ? "Already covered · No repeated read" : "Completed synthetic read"}</p><p className="mt-1 text-[color:var(--text-subtle)]">{(sync.effectiveStart ?? sync.windowStart).slice(0, 10)} → {sync.windowEnd.slice(0, 10)} UTC</p>{sync.status === "COMPLETED" ? <a className="mt-2 inline-block text-[color:var(--accent)]" href={`/api/ai-integrity/sources/${sync.id}/export`}>Download source evidence JSON →</a> : null}</div>)}</div>
      </section>;
    })}</div>
    {message ? <p role="status" className="rev-shell-panel rounded-2xl p-4 text-sm leading-6">{message}</p> : null}
  </div>;
}
