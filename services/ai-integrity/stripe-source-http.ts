import "server-only";
import Stripe from "stripe";
import { assertAiSourceRead, type AiSourceTransport } from "@/domain/ai-integrity/connected-sources";

const MAX_BYTES = 2 * 1024 * 1024;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export async function verifyStripeSourceIdentity(key: string, expectedAccountId: string) {
  if (!/^rk_(test|live)_[A-Za-z0-9]{12,480}$/.test(key)) throw new Error("A restricted read-only key is required.");
  const account = await new Stripe(key, { timeout: 8000, maxNetworkRetries: 1 }).accounts.retrieve(null);
  if (account.id !== expectedAccountId) throw new Error("Stripe source account identity does not match.");
}

export function createStripeSourceTransport(restrictedKey: string, fetcher: typeof fetch = fetch, pause: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))): AiSourceTransport {
  if (!/^rk_(test|live)_[A-Za-z0-9]{12,480}$/.test(restrictedKey)) throw new Error("A restricted Stripe source key is required.");
  return async (read) => {
    assertAiSourceRead(read);
    if (read.origin !== "https://api.stripe.com" || read.path !== "/v1/invoices") throw new Error("Only Stripe invoice reads are supported.");
    const url = new URL(read.path, "https://api.stripe.com");
    for (const [name, value] of Object.entries(read.query)) for (const part of Array.isArray(value) ? value : [value]) url.searchParams.append(name, part);
    for (let attempt = 0; attempt < 3; attempt++) {
      let response: Response;
      try {
        response = await fetcher(url, { method: "GET", redirect: "error", cache: "no-store", headers: { Authorization: `Bearer ${restrictedKey}`, Accept: "application/json", "Stripe-Version": "2026-07-29.dahlia" }, signal: AbortSignal.timeout(8000) });
      } catch {
        if (attempt === 2) throw new Error("Stripe source read failed after bounded network retries.");
        await pause(250 * (attempt + 1)); continue;
      }
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        if (!RETRYABLE.has(response.status) || attempt === 2) throw new Error(`Stripe source read failed (HTTP ${response.status}).`);
        const delay = Number(response.headers.get("retry-after"));
        await pause(Number.isFinite(delay) && delay >= 0 ? Math.min(delay * 1000, 2000) : 250 * (attempt + 1)); continue;
      }
      if (!response.body || Number(response.headers.get("content-length")) > MAX_BYTES) { await response.body?.cancel().catch(() => {}); throw new Error("Stripe source response exceeds configured limits."); }
      const reader = response.body.getReader();
      const parts: Uint8Array[] = []; let length = 0;
      try {
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          length += value.length; if (length > MAX_BYTES) throw new Error("Stripe source response exceeds configured limits.");
          parts.push(value);
        }
      } finally { await reader.cancel().catch(() => {}); }
      try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts))); }
      catch { throw new Error("Stripe returned invalid source data."); }
    }
    throw new Error("Stripe source read failed.");
  };
}
