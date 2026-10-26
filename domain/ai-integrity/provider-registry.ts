// Customer-system connectors. Rehearsal fixtures keep their original contract.
export const AI_CUSTOMER_PROVIDERS = ["STRIPE", "OPENAI", "ANTHROPIC", "GEMINI"] as const;
export type AiCustomerProvider = typeof AI_CUSTOMER_PROVIDERS[number];
export const AI_USAGE_PROVIDERS = ["OPENAI", "ANTHROPIC", "GEMINI"] as const;
export const providerLabels: Record<AiCustomerProvider, string> = { STRIPE: "Stripe", OPENAI: "OpenAI", ANTHROPIC: "Anthropic / Claude", GEMINI: "Google / Gemini" };
export function customerProvider(value: unknown): value is AiCustomerProvider { return AI_CUSTOMER_PROVIDERS.includes(value as AiCustomerProvider); }
export function validConnectedProviderSet(providers: string[]) {
  return providers.length >= 2 && providers.length <= 4 && new Set(providers).size === providers.length
    && providers.filter(p => p === "STRIPE").length === 1
    && providers.every(p => customerProvider(p));
}
export function providerChannels(provider: string): string[] {
  switch (provider) {
    case "STRIPE": return ["stripe-invoices"];
    case "OPENAI": return ["openai-usage", "openai-costs"];
    case "ANTHROPIC": return ["anthropic-usage", "anthropic-costs"];
    case "GEMINI": return ["gemini-usage", "gemini-costs"];
    default: throw new Error("Unsupported source provider.");
  }
}
