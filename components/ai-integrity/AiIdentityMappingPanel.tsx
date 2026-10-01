"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Mapping = { id: string; kind: string; externalId: string; internalCustomerExternalId: string; status: string; validFrom: string; validUntil: string | null; provenance: Record<string, unknown> };
type Project = { provider: string; organizationId: string | null; projectId: string };

export function AiIdentityMappingPanel({ sourceBatchIds, defaultWindows, stripeCustomers, internalCustomers, projects, mappings }: {
  sourceBatchIds: { provider: string | null; ledger: string | null; revenue: string | null };
  defaultWindows: { provider: { start: string; end: string }; revenue: { start: string; end: string } };
  stripeCustomers: string[]; internalCustomers: string[]; projects: Project[]; mappings: Mapping[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"STRIPE_CUSTOMER" | "PROVIDER_PROJECT">("STRIPE_CUSTOMER");
  const [externalId, setExternalId] = useState("");
  const [internalId, setInternalId] = useState("");
  const [provider, setProvider] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [from, setFrom] = useState(defaultWindows.revenue.start.slice(0, 16));
  const [until, setUntil] = useState(defaultWindows.revenue.end.slice(0, 16));
  const [exclusive, setExclusive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inputClass = "min-h-11 w-full rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--background-card)] px-3 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--accent)]";

  function selectKind(value: "STRIPE_CUSTOMER" | "PROVIDER_PROJECT") {
    setKind(value); setExternalId(""); setProvider(""); setOrganizationId(""); setExclusive(false);
    const window = value === "STRIPE_CUSTOMER" ? defaultWindows.revenue : defaultWindows.provider;
    setFrom(window.start.slice(0, 16)); setUntil(window.end.slice(0, 16)); setError(""); setNotice("");
  }
  async function mutate(method: "POST" | "PATCH", body: Record<string, unknown>) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/ai-integrity/mappings", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Mapping review failed.");
      setNotice(data.status === "CONFLICTED" ? "Conflict retained for review. No attribution will use this link." : method === "PATCH" ? "Mapping revoked." : "Mapping confirmed.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Mapping review failed."); }
    finally { setBusy(false); }
  }
  function submit() {
    const sourceBatchId = kind === "STRIPE_CUSTOMER" ? sourceBatchIds.revenue : sourceBatchIds.provider;
    if (!sourceBatchId || !sourceBatchIds.ledger || !from || !until) { setError("Select the source and ledger batches and a valid period first."); return; }
    void mutate("POST", { kind, sourceBatchId, ledgerBatchId: sourceBatchIds.ledger, externalId: externalId.trim(), internalCustomerExternalId: internalId.trim(),
      provider: provider.trim(), organizationId: organizationId.trim(), validFrom: `${from}:00Z`, validUntil: `${until}:00Z`, exclusiveProjectConfirmed: exclusive });
  }
  return <section className="rev-shell-panel rounded-[26px] p-5 md:p-6">
    <h2 className="[font-family:var(--font-app)] text-lg font-semibold">Confirm an identity link</h2>
    <p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">Links are scoped to exact imported IDs and a closed UTC period. Overlap or contradictory evidence is retained as conflicted. Revocation preserves the audit trail.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <label className="space-y-2 text-xs font-semibold text-[color:var(--text-muted)]">Link type<select className={inputClass} value={kind} onChange={(event) => selectKind(event.target.value as "STRIPE_CUSTOMER" | "PROVIDER_PROJECT")}><option value="STRIPE_CUSTOMER">Stripe customer → internal customer</option><option value="PROVIDER_PROJECT">Exclusive provider project → internal customer</option></select></label>
      {kind === "PROVIDER_PROJECT" ? <label className="space-y-2 text-xs font-semibold text-[color:var(--text-muted)]">Observed project<select className={inputClass} value="" onChange={(event) => { const project = projects[Number(event.target.value)]; if (project) { setExternalId(project.projectId); setProvider(project.provider); setOrganizationId(project.organizationId ?? ""); } }}><option value="">Choose a project, or enter exact IDs below</option>{projects.map((project, index) => <option key={`${project.provider}-${project.organizationId}-${project.projectId}-${index}`} value={index}>{project.provider} / {project.organizationId ?? "no org"} / {project.projectId}</option>)}</select></label> : <div />}
      <label className="space-y-2 text-xs font-semibold text-[color:var(--text-muted)]">{kind === "STRIPE_CUSTOMER" ? "Stripe customer ID" : "Provider project ID"}<input className={inputClass} value={externalId} list={kind === "STRIPE_CUSTOMER" ? "stripe-customer-ids" : undefined} onChange={(event) => setExternalId(event.target.value)} placeholder={kind === "STRIPE_CUSTOMER" ? "cus_..." : "proj_..."} /></label>
      <label className="space-y-2 text-xs font-semibold text-[color:var(--text-muted)]">Internal customer ID<input className={inputClass} value={internalId} list="internal-customer-ids" onChange={(event) => setInternalId(event.target.value)} placeholder="customer_..." /></label>
      {kind === "PROVIDER_PROJECT" ? <><label className="space-y-2 text-xs font-semibold text-[color:var(--text-muted)]">Provider<input className={inputClass} value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="openai" /></label><label className="space-y-2 text-xs font-semibold text-[color:var(--text-muted)]">Organization ID, if present<input className={inputClass} value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} placeholder="org_..." /></label></> : null}
      <label className="space-y-2 text-xs font-semibold text-[color:var(--text-muted)]">Valid from · UTC inclusive<input className={inputClass} type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
      <label className="space-y-2 text-xs font-semibold text-[color:var(--text-muted)]">Valid until · UTC exclusive<input className={inputClass} type="datetime-local" value={until} onChange={(event) => setUntil(event.target.value)} /></label>
    </div>
    <datalist id="stripe-customer-ids">{stripeCustomers.map((id) => <option key={id} value={id} />)}</datalist>
    <datalist id="internal-customer-ids">{internalCustomers.map((id) => <option key={id} value={id} />)}</datalist>
    {kind === "PROVIDER_PROJECT" ? <label className="mt-5 flex items-start gap-3 text-xs leading-6 text-[color:var(--text-muted)]"><input type="checkbox" checked={exclusive} onChange={(event) => setExclusive(event.target.checked)} />I verified that this provider project was exclusive to this internal customer throughout the selected period. A shared key or project must not be confirmed.</label> : null}
    {error ? <p role="alert" className="mt-4 text-sm text-[color:var(--danger)]">{error}</p> : null}
    {notice ? <p role="status" className="mt-4 text-sm text-[color:var(--accent)]">{notice}</p> : null}
    <button className="rev-action-button mt-5 px-5 py-3 text-sm" type="button" disabled={busy || !externalId.trim() || !internalId.trim() || (kind === "PROVIDER_PROJECT" && !exclusive)} onClick={submit}>{busy ? "Working…" : "Confirm reviewed link"}</button>
    <div className="mt-8 border-t border-[color:var(--border)] pt-5"><h3 className="[font-family:var(--font-app)] text-sm font-semibold">Recent identity decisions</h3>
      {mappings.length ? <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">{mappings.map((mapping) => <div key={mapping.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] px-3 py-3 text-xs"><div><p className="font-semibold text-[color:var(--foreground)]">{mapping.kind.replaceAll("_", " ")} · {String(mapping.provenance.rawExternalId ?? mapping.externalId)} → {mapping.internalCustomerExternalId}</p><p className="mt-1 text-[color:var(--text-muted)]">{mapping.status} · {mapping.status !== "CONFIRMED" ? "Unattributed" : mapping.kind === "STRIPE_CUSTOMER" ? "Mapped identity only; no cost attribution" : "Strong candidate; check coverage below"} · {mapping.validFrom.slice(0, 16)} to {mapping.validUntil?.slice(0, 16) ?? "open"} UTC</p></div>{mapping.status !== "REVOKED" ? <button type="button" disabled={busy} className="text-[color:var(--accent)]" onClick={() => void mutate("PATCH", { mappingId: mapping.id })}>Revoke</button> : null}</div>)}</div> : <p className="mt-3 text-xs text-[color:var(--text-muted)]">No identity decisions yet.</p>}
    </div>
  </section>;
}
