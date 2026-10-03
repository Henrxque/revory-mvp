"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";

const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function AiScanPurchasePanel({ driver, order }: { driver: "stripe-test" | "simulation" | "unavailable"; order: { id: string; status: string } | null }) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribeToHydration, clientReady, serverReady);
  const key = useRef<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function purchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    key.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/ai-integrity/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestKey: key.current, termsAccepted: true, testModeConfirmed: true }) });
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
      else { setError("Payment is not confirmed yet. You can retry after completing the test checkout."); router.refresh(); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to verify payment."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5">{order ? <div className="rounded-2xl border border-[color:var(--border-accent)] p-4"><p className="text-sm font-semibold">{order.status === "PAID" ? "Test purchase confirmed" : order.status === "PENDING" ? "Waiting for payment confirmation" : "Checkout needs another attempt"}</p><p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">{order.status === "PENDING" ? "Returning from checkout does not activate a scan. Confirmation comes from a verified payment status." : `Order status: ${order.status.toLowerCase()}.`}</p>{order.status === "PENDING" ? <button type="button" disabled={busy} onClick={refresh} className="rev-button-secondary mt-4">Check payment status</button> : order.status === "PAID" ? <Link className="rev-button-primary mt-4" href="/app/ai-integrity/dashboard">Open your workspace →</Link> : null}</div> : null}
    <form onSubmit={purchase} className="space-y-4"><label className="flex gap-3 text-xs leading-6 text-[color:var(--text-muted)]"><input required type="checkbox" className="mt-1" />I understand this test purchase provides one report for one closed period. It does not start a subscription.</label><label className="flex gap-3 text-xs leading-6 text-[color:var(--text-muted)]"><input required type="checkbox" className="mt-1" /><span>I reviewed the <Link href="/ai-integrity-preview-policy#offer" className="underline">test offer</Link> and <Link href="/ai-integrity-preview-policy#payment" className="underline">test payment conditions</Link>, and will use synthetic data in this preview.</span></label>
      <button className="rev-button-primary w-full" disabled={!hydrated || busy || driver === "unavailable"} type="submit">{busy ? "Opening test checkout…" : driver === "simulation" ? "Open simulated test checkout ↗" : "Continue to Stripe test checkout ↗"}</button>
      <p className="text-center text-[11px] leading-6 text-[color:var(--text-subtle)]">{driver === "simulation" ? "Local payment simulation. No funds move and no Stripe sandbox payment is made." : driver === "unavailable" ? "Stripe test checkout is not configured locally. The demo remains available." : "Stripe test mode. Use test payment details; no real payment is collected."}</p>
    </form>{error ? <p role="alert" className="text-xs leading-6 text-[color:var(--danger)]">{error}</p> : null}
  </div>;
}
