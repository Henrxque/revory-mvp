// Public prices and billing contracts share one source of truth. Previous
// contracts remain distinct so a price change never rewrites a subscription.
export const MONITOR_OFFER = { version: "revory-monitor-199/v1", amountMinor: 19900, currency: "usd", interval: "month", maxPeriodDays: 7, maxLedgerRows: 10000 } as const;
export const LEGACY_MONITOR_OFFER = { ...MONITOR_OFFER, version: "revory-monitor-399/v1", amountMinor: 39900 } as const;
export const COMMERCIAL_RELEASE = "integrity-99-monitor-199/v1";
export const SCAN_LIVE_OFFER_VERSION = "revory-integrity-scan-99/v1";
export function usdPrice(amountMinor: number) { return `US$${amountMinor / 100}`; }
