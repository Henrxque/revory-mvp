"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export type CustomerConnectionView = {
  id: string; provider: string; status: string; organizationId: string | null;
  consentStart: string | null; consentEnd: string | null; completeThrough: string | null;
  syncs: Array<{ id: string; status: string; windowStart: string; windowEnd: string; batchId?: string | null; activity?: string | null; eligible?: boolean }>;
};

export function AiCustomerConnections({ connections, suggestedPeriod, connectedReports = false }: { connections: CustomerConnectionView[]; suggestedPeriod: { start: string; end: string }; connectedReports?: boolean }) {
  const router = useRouter();
  const [provider, setProvider] = useState("OPENAI");
  const [accountId, setAccountId] = useState("");
  const [secret, setSecret] = useState("");
  const [start, setStart] = useState(suggestedPeriod.start);
  const [end, setEnd] = useState(suggestedPeriod.end);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestKeys = useRef<Record<string, string>>({});
  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--background-card)] px-3 text-sm outline-none focus:border-[color:var(--accent)]";

  async function action(payload: Record<string, unknown>) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/ai-integrity/connections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Connection action failed.");
      if (payload.action === "SYNC") { delete requestKeys.current[String(payload.connectionId)]; setNotice("Source read completed. Open its evidence below to inspect activity and limits. No scan was started."); }
      else if (payload.action === "PREPARE") setNotice(result.replayed ? "This source is already prepared. Continue with your internal usage file for the same period." : "Source prepared for review. No CSV is needed for this API source. Add your internal usage file, then review customer links and the report setup.");
      else if (payload.action === "REVOKE") setNotice("Disconnected. The saved credential was removed and further reads are blocked.");
      else setNotice("Credential and consent saved. Use Read authorized period to check access and collect source evidence.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connection action failed."); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = { action: "REGISTER", provider, accountId, secret, windowStart: `${start}T00:00:00.000Z`, windowEnd: `${end}T00:00:00.000Z`, consentConfirmed: consent };
    setSecret(""); setConsent(false);
    void action(payload);
  }
  return <div className="space-y-6">
    <form onSubmit={submit} className="rev-shell-panel space-y-5 rounded-[26px] p-6">
      <div><h2 className="text-lg font-semibold">Add or replace a source connection</h2><p className="mt-2 text-sm leading-7 text-[color:var(--text-muted)]">Connections belong to this workspace. Saving a replacement invalidates previous read consent and starts a new history of coverage.</p></div>
      <div className="grid gap-4 md:grid-cols-2"><label className="text-sm text-[color:var(--text-muted)]">Source<select disabled={busy} value={provider} onChange={(event) => { setProvider(event.target.value); setSecret(""); setAccountId(""); setConsent(false); }} className={inputClass}><option value="OPENAI">OpenAI Usage & Costs</option><option value="STRIPE">Stripe invoices · test mode</option></select></label><label className="text-sm text-[color:var(--text-muted)]">{provider === "OPENAI" ? "OpenAI organization ID" : "Stripe test account ID"}<input required disabled={busy} value={accountId} onChange={(event) => { setAccountId(event.target.value); setConsent(false); }} className={inputClass} placeholder={provider === "OPENAI" ? "org-…" : "acct_…"} autoComplete="off" spellCheck={false} /></label></div>
      <label className="block text-sm text-[color:var(--text-muted)]">{provider === "OPENAI" ? "Administrative key authorized for Usage & Costs" : "Restricted test key with invoice read permission"}<input required disabled={busy} type="password" value={secret} onChange={(event) => { setSecret(event.target.value); setConsent(false); }} className={inputClass} autoComplete="new-password" spellCheck={false} minLength={16} maxLength={512} /><span className="mt-2 block text-xs leading-6">{provider === "OPENAI" ? "Use the minimum Usage/Costs permissions available in your organization. A model-generation key does not grant access to this data. Only completions usage and reported costs are read." : "Create a restricted rk_test_ key with read access to invoices. Live and unrestricted secret keys are not accepted in this connector preview. The account ID is your declaration; it is retained as provenance."}</span></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-[color:var(--text-muted)]">Period starts · UTC<input required disabled={busy} type="date" value={start} onChange={(event) => { setStart(event.target.value); setConsent(false); }} className={inputClass} /></label><label className="text-sm text-[color:var(--text-muted)]">Period ends · UTC, day excluded<input required disabled={busy} type="date" value={end} onChange={(event) => { setEnd(event.target.value); setConsent(false); }} className={inputClass} /></label></div><p className="text-xs leading-6 text-[color:var(--text-muted)]">Choose up to 31 days, ending at least 24 hours ago. Stripe reads invoices created in this period as billing context. Invoice payments are not a complete measure of net collected revenue.</p>
      <label className="flex items-start gap-3 text-sm leading-7 text-[color:var(--text-muted)]"><input disabled={busy} type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-2" />I am authorized to share this credential and consent to read only this account and period for source integrity. I reviewed the permissions, and understand that this does not start a scan or a payment.</label>
      <button disabled={busy || !consent} type="submit" className="rev-button-primary">{busy ? "Working…" : "Save connection"}</button>
    </form>
    {error ? <p role="alert" className="rounded-xl border border-[color:var(--danger)] p-4 text-sm text-[color:var(--danger)]">{error}</p> : null}
    {notice ? <p role="status" className="rounded-xl border border-[color:var(--border-accent)] p-4 text-sm text-[color:var(--accent)]">{notice}</p> : null}
    <section className="rev-shell-panel rounded-[26px] p-6"><h2 className="text-lg font-semibold">Your saved connections</h2><p className="mt-2 text-sm leading-7 text-[color:var(--text-muted)]">Saving a credential does not verify permissions. A completed source read records what the provider returned. No reported activity is not proof of zero total spend.</p><div className="mt-5 space-y-4">{connections.length ? connections.map((connection) => <article key={connection.id} className="rounded-2xl border border-[color:var(--border)] p-5"><div className="flex flex-wrap justify-between gap-3"><h3 className="text-base font-semibold">{connection.provider === "OPENAI" ? "OpenAI" : "Stripe test mode"}</h3><p className="text-sm text-[color:var(--accent)]">{connection.status === "REVOKED" ? "Disconnected" : connection.completeThrough ? "Source read saved" : "Saved · access not checked"}</p></div><p className="mt-3 break-all text-sm leading-7 text-[color:var(--text-muted)]">{connection.organizationId}<br />{connection.consentStart?.slice(0, 10)} to {connection.consentEnd?.slice(0, 10)} UTC</p>{connection.status === "ACTIVE" ? <div className="mt-4 flex flex-wrap gap-3"><button disabled={busy} type="button" className="rev-button-primary" onClick={() => { requestKeys.current[connection.id] ??= crypto.randomUUID(); void action({ action: "SYNC", connectionId: connection.id, requestKey: requestKeys.current[connection.id] }); }}>Read authorized period</button><button disabled={busy} type="button" className="rev-button-secondary" onClick={() => void action({ action: "REVOKE", connectionId: connection.id })}>Disconnect</button></div> : null}<div className="mt-4 space-y-2">{connection.syncs.map((sync) => <div key={sync.id} className="rounded-xl border border-[color:var(--border)] p-3 text-sm"><p>{sync.activity === "NO_REPORTED_ROWS" ? "No rows reported - review scope or choose another period. Total activity is unknown." : sync.status === "COMPLETED" ? "Source read completed · inspect activity in evidence" : sync.status === "FAILED" ? "Read failed · coverage unchanged" : "Read in progress"}</p>{sync.status === "COMPLETED" ? <a className="mt-2 inline-block font-semibold text-[color:var(--accent)]" href={`/api/ai-integrity/connections/${sync.id}/export`}>Download source evidence</a> : null}{connectedReports && sync.status === "COMPLETED" && sync.activity !== "NO_REPORTED_ROWS" && sync.eligible !== false && connection.status === "ACTIVE" ? <div className="mt-3">{sync.batchId ? <a className="font-semibold text-[color:var(--accent)]" href="/app/ai-integrity/scans">Prepared · review report setup</a> : <button disabled={busy} type="button" className="rev-button-secondary" onClick={() => void action({ action: "PREPARE", syncId: sync.id })}>Use this read in my report</button>}</div> : null}</div>)}</div></article>) : <p className="text-sm text-[color:var(--text-muted)]">No source connected yet. Add one above to begin.</p>}</div></section>
  </div>;
}
