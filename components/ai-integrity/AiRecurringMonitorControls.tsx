"use client";
import Link from "next/link";
import { useState } from "react";
import { inputClass, buttonClass, labels, type RecurringView } from "./recurring-monitor-view";
import styles from "./AiRecurringMonitor.module.css";

type Props = {
  view: RecurringView; section: "settings" | "usage"; busy: boolean; token: string;
  act: (action: string, data?: object) => Promise<void>;
  setToken: (value: string) => void; setMessage: (value: string) => void;
};
export function AiRecurringMonitorControls({ view, section, busy, token, act, setToken, setMessage }: Props) {
  const exampleStart = view.schedule?.nextStart ?? view.dates.start + "T00:00:00.000Z";
  const exampleEnd = new Date(Date.parse(exampleStart) + (view.schedule?.periodDays ?? 1) * 86400000).toISOString();
  const example = JSON.stringify({ sourceSystem: "your-product-ledger", windowStart: exampleStart, windowEnd: exampleEnd, exportedAt: "REPLACE_WITH_ACTUAL_EXPORT_TIMESTAMP_AFTER_LAG", completeThrough: exampleEnd, records: [{ externalId: "stable-usage-event-id", occurredAt: exampleStart, quantity: "80", unit: "input_tokens", provider: "openai", providerProjectId: "your-project-id", model: "your-model", internalCustomerExternalId: "your-customer-id" }] }, null, 2);
  const [checkoutKey] = useState(() => globalThis.crypto.randomUUID());
  return <div className={styles.controls}>{section === "settings" ? <>
    <section className="rev-shell-panel rounded-[22px] p-5 md:p-6">
      <p className="rev-kicker">Monitoring preferences</p><h2 className="mt-2 text-xl font-semibold">Schedule & permissions</h2>
      <p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">Connect both sources, prepare your first ledger and review customer links. Monitoring rechecks those confirmed links against each new ledger. A missing or conflicting link limits the comparison.</p>
      <div className="mt-4 flex flex-wrap gap-5 text-sm text-[color:var(--accent)]"><Link href="/app/ai-integrity/connections">Connect sources</Link><Link href="/app/ai-integrity/attribution">Review customer links</Link></div>
      {view.schedule ? <div className="mt-5 space-y-4"><p className="text-sm">{labels[view.schedule.status] ?? view.schedule.status} · {view.schedule.periodDays}-day periods · {view.schedule.lagHours}h consolidation lag</p><p className="text-sm text-[color:var(--text-muted)]">Next period starts {view.schedule.nextStart.slice(0, 10)} UTC. Consent ends {view.schedule.consentUntil.slice(0, 10)} UTC.</p>
        <button disabled={busy || view.schedule.status !== "ACTIVE"} className={`${buttonClass} ${styles.quietButton}`} onClick={() => act("PAUSE")}>Pause monitoring</button>
        <form className="space-y-3" onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); act("RESUME", { consentConfirmed: true, scopeReviewed: true, consentUntil: f.get("until") + "T00:00:00.000Z", emailEnabled: f.get("email") === "on" }); }}>
          <label className="block text-sm">Consent expiry (UTC)<input name="until" type="date" defaultValue={view.schedule.consentUntil.slice(0, 10)} required className={inputClass} /></label>
          <label className="flex gap-3 text-sm"><input name="email" type="checkbox" defaultChecked={view.schedule.emailEnabled} />Email me meaningful changes, incomplete comparisons and collection failures.</label>
          <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" required />I authorize recurring reads within this scope and the reuse of my reviewed project/customer links, subject to new evidence. Stripe invoices are billing context; they do not prove net revenue.</label>
          <button disabled={busy} className={buttonClass}>Renew consent and resume</button>
        </form></div>
        : <form className="mt-5 space-y-4" onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); act("CONFIGURE", { start: f.get("start") + "T00:00:00.000Z", consentUntil: f.get("until") + "T00:00:00.000Z", periodDays: Number(f.get("days")), lagHours: Number(f.get("lag")), minimumUsageDelta: String(f.get("threshold")), emailEnabled: f.get("email") === "on", consentConfirmed: true, scopeReviewed: true }); }}>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">First period starts (UTC)<input name="start" type="date" defaultValue={view.dates.start} required className={inputClass} /></label><label className="text-sm">Consent ends (up to 90 days)<input name="until" type="date" defaultValue={view.dates.until} required className={inputClass} /></label><label className="text-sm">Period length<select name="days" className={inputClass}><option value="1">Daily</option><option value="7">Weekly</option></select></label><label className="text-sm">Wait after period closes (hours)<input name="lag" type="number" min="24" max="168" defaultValue="72" required className={inputClass} /></label></div>
          <label className="block text-sm">Minimum absolute usage difference for email (in the compared unit)<input name="threshold" inputMode="decimal" defaultValue="1" required className={inputClass} /></label>
          <label className="flex gap-3 text-sm"><input name="email" type="checkbox" />Email me meaningful changes and collection problems.</label>
          <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" required />I authorize these recurring reads and reuse of my reviewed project/customer links while new evidence corroborates them. I reviewed source scope and completeness limits. No automatic correction or financial recovery is promised.</label>
          <button disabled={busy || view.subscription?.status !== "ACTIVE"} className={buttonClass}>Save monitoring schedule</button>
        </form>}
    </section>
    <section style={{ order: view.subscription?.status === "ACTIVE" ? 0 : -1 }} className="rev-shell-panel rounded-[22px] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="rev-kicker">Billing</p><h2 className="mt-2 text-xl font-semibold">Monitor · US$399/month</h2><p className="mt-2 text-sm text-[color:var(--text-muted)]">One workspace. Daily or weekly closed periods. Up to 10,000 ledger rows per period, subject to source read limits.</p></div><span className="text-sm text-[color:var(--accent)]">{view.subscription ? labels[view.subscription.status] ?? view.subscription.status.toLowerCase().replaceAll("_", " ") : "Not subscribed"}</span></div>
      {view.subscription ? <div className="mt-4 space-y-3"><p className="text-sm text-[color:var(--text-muted)]">Paid access through {view.subscription.paidThrough?.slice(0, 10) ?? "not verified"}. Cancellation does not create a new scan purchase.</p><button disabled={busy} className={`${buttonClass} ${styles.quietButton}`} onClick={() => act("PORTAL")}>Manage subscription or cancel</button></div>
        : <form className="mt-5 space-y-3" onSubmit={event => { event.preventDefault(); act("CHECKOUT", { requestKey: checkoutKey, termsAccepted: true, recurringAccepted: true, testModeConfirmed: view.runtime !== "LIVE" }); }}>
          <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" required className="mt-1" />I agree to US$399 monthly recurring billing and the <Link href="/terms" className="underline">terms</Link>. {view.runtime === "LIVE" ? "Payment renews monthly until canceled." : "This environment uses Stripe test mode and no real charge."}</label>
          <button disabled={busy} className={buttonClass}>{view.runtime === "LIVE" ? "Subscribe for US$399/month" : "Start monthly test checkout"}</button>
        </form>}
    </section>
  </> : <>
    <section className="rev-shell-panel rounded-[22px] p-5 md:p-6">
      <p className="rev-kicker">Internal product usage</p><h2 className="mt-2 text-xl font-semibold">Send your product usage</h2>
      <p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">Upload and review a CSV/XLSX, then select it below. Your backend can also send the same canonical ledger through a dedicated token. A missing ledger pauses that period; it never becomes zero usage.</p>
      <Link href="/app/ai-integrity/imports" className="mt-3 inline-block text-sm text-[color:var(--accent)]">Upload and review ledger</Link>
      {!view.schedule ? <p className="mt-4 text-sm text-[color:var(--text-muted)]">Save your monitoring schedule in Settings before queueing a period.</p> : null}
      <form className="mt-5 space-y-4" onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); act("LEDGER", { batchId: f.get("batch"), exportedAt: new Date(String(f.get("exported")) + "Z").toISOString(), completeThrough: new Date(String(f.get("complete")) + "Z").toISOString() }); }}>
        <label className="block text-sm">Reviewed ledger<select name="batch" required className={inputClass}><option value="">Choose the next period</option>{view.ledgers.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</select></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Exported at (UTC)<input name="exported" type="datetime-local" required className={inputClass} /></label><label className="text-sm">Complete through (UTC)<input name="complete" type="datetime-local" required className={inputClass} /></label></div>
        <label className="flex gap-3 text-sm leading-6"><input type="checkbox" required />I confirm the ledger contains the complete authorized period, including consolidation delays.</label>
        <button disabled={busy || !view.schedule} className={buttonClass}>Queue this period</button>
      </form>
      <details className="mt-6 border-t border-[color:var(--border)] pt-5"><summary className="cursor-pointer text-sm">Automate ledger delivery from your backend</summary><p className="mt-3 break-all font-mono text-sm">POST /api/ai-integrity/ledger/{view.workspaceId}</p><p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">Use Authorization: Bearer TOKEN. Send sourceSystem, windowStart, windowEnd, exportedAt, completeThrough and records as JSON. Each record needs an externalId, occurredAt, exact quantity and unit; add provider, providerProjectId, model and internalCustomerExternalId when available. Maximum 2 MB and 10,000 rows. Tokens can only submit authorized internal usage for this workspace.</p><pre className="mt-4 max-h-72 overflow-auto whitespace-pre rounded-xl border border-[color:var(--border)] p-3 text-[10px] leading-5" aria-label="Ledger API example">{example}</pre><div className="mt-4 flex flex-wrap gap-3"><button disabled={busy} className={buttonClass} onClick={() => act("TOKEN")}>Create or replace token</button><button disabled={busy} className={`${buttonClass} ${styles.quietButton}`} onClick={() => act("REVOKE_TOKEN")}>Revoke token</button></div>{token ? <div className="mt-3"><label className="text-sm">Copy once and store securely<input readOnly type="password" value={token} onFocus={event => event.currentTarget.select()} className={inputClass} /></label><button className="mt-2 text-sm text-[color:var(--accent)]" onClick={async () => { try { await navigator.clipboard.writeText(token); setMessage("Token copied."); } catch { setMessage("Select the token and copy it securely."); } }}>Copy token</button><button className="ml-4 text-sm" onClick={() => setToken("")}>Hide and discard from this screen</button></div> : null}</details>
    </section>
  </>}</div>;
}
