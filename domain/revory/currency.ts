export const supportedWorkspaceCurrencies = [
  ["USD", "US Dollar (USD)"],
  ["CAD", "Canadian Dollar (CAD)"],
  ["GBP", "British Pound (GBP)"],
  ["EUR", "Euro (EUR)"],
  ["AUD", "Australian Dollar (AUD)"],
  ["NZD", "New Zealand Dollar (NZD)"],
] as const;

export type WorkspaceCurrency = (typeof supportedWorkspaceCurrencies)[number][0];

const supportedCurrencyCodes = new Set<string>(
  supportedWorkspaceCurrencies.map(([code]) => code),
);

export function normalizeWorkspaceCurrency(value: unknown): WorkspaceCurrency {
  const code = String(value ?? "USD").trim().toUpperCase();
  return supportedCurrencyCodes.has(code) ? (code as WorkspaceCurrency) : "USD";
}

export function formatWorkspaceMoney(
  cents: number,
  currency: string,
  options?: { maximumFractionDigits?: number },
) {
  return new Intl.NumberFormat("en-US", {
    currency: normalizeWorkspaceCurrency(currency),
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
    style: "currency",
  }).format(cents / 100);
}
