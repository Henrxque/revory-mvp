"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import type { AiScanCheckoutDriver } from "@/services/ai-integrity/purchase";

const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function AiScanPurchasePanel({ driver, order }: { driver: AiScanCheckoutDriver; order: { id: string; status: string } | null }) {
  const live = driver === "stripe-live";
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribeToHydration, clientReady, serverReady);
  const key = useRef<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function purchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    key.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/ai-integrity/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestKey: key.current, termsAccepted: true, testModeConfirmed: !live }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to open checkout.");
      window.location.assign(data.url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to open checkout."); setBusy(false); }
  }
  async function refresh() {
    if (!order) return; setBusy(true); setError("");
    try {
      const response = await fetch("/api/ai-integrity/checkout/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Unable to verify payment.");
      if (data.status === "PAID" && data.grantId) router.push("/app/ai-integrity/dashboard");
      else { setError("Payment is not confirmed yet. You can retry after completing checkout."); router.refresh(); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to verify payment."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5">{order ? <div className="rounded-2xl border border-[color:var(--border-accent)] p-4"><p className="text-sm font-semibold">{order.status === "PAID" ? live ? "Purchase confirmed" : "Test purchase confirmed" : order.status === "PENDING" ? "Waiting for payment confirmation" : "Checkout needs another attempt"}</p><p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">{order.status === "PENDING" ? "Returning from checkout does not activate a scan. Confirmation comes from a verified payment status." : `Order status: ${order.status.toLowerCase()}.`}</p>{order.status === "PENDING" ? <button type="button" disabled={busy} onClick={refresh} className="rev-button-secondary mt-4">Check payment status</button> : order.status === "PAID" ? <Link className="rev-button-primary mt-4" href="/app/ai-integrity/dashboard">Open your workspace</Link> : null}</div> : null}
    <form onSubmit={purchase} className="space-y-4"><label className="flex gap-3 text-xs leading-6 text-[color:var(--text-muted)]"><input required type="checkbox" className="mt-1" />I agree to US$99 once for one report covering one closed period. This does not start a subscription.</label><label className="flex gap-3 text-xs leading-6 text-[color:var(--text-muted)]"><input required type="checkbox" className="mt-1" /><span>{live ? <>I reviewed the <Link href="/terms" className="underline">terms</Link>, <Link href="/privacy" className="underline">privacy policy</Link> and <Link href="/refunds" className="underline">refund policy</Link>. I can provide authorized Stripe/OpenAI reads and an internal ledger for the same period.</> : <>I reviewed the <Link href="/ai-integrity-preview-policy#offer" className="underline">test offer</Link> and <Link href="/ai-integrity-preview-policy#payment" className="underline">test payment conditions</Link>, and will use synthetic data in this preview.</>}</span></label>
      <button className="rev-button-primary w-full" disabled={!hydrated || busy || driver === "unavailable"} type="submit">{busy ? "Opening checkout…" : live ? "Buy one Integrity Scan · US$99" : driver === "simulation" ? "Open simulated test checkout" : "Continue to Stripe test checkout"}</button>
      <p className="text-center text-[11px] leading-6 text-[color:var(--text-subtle)]">{live ? "Secure payment through Stripe. US$99 once. Monitoring is a separate subscription and requires another explicit purchase." : driver === "simulation" ? "Local payment simulation. No funds move and no Stripe sandbox payment is made." : driver === "unavailable" ? "Checkout is currently unavailable. The demo remains available." : "Stripe test mode. Use test payment details; no real payment is collected."}</p>
    </form>{error ? <p role="alert" className="text-xs leading-6 text-[color:var(--danger)]">{error}</p> : null}
  </div>;
}
