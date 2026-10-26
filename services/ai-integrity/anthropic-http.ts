import "server-only";
import { providerRequest } from "./provider-http";
import { assertAiSourceRead, type AiSourceTransport } from "@/domain/ai-integrity/connected-sources";

export function createAnthropicReadTransport(key: string, fetcher: typeof fetch = fetch, pause?: (ms: number) => Promise<void>): AiSourceTransport {
  if (!/^sk-ant-admin[A-Za-z0-9_-]{8,480}$/.test(key)) throw new Error("Use an Anthropic organization Admin API credential.");
  return async read => {
    assertAiSourceRead(read);
    if (read.origin !== "https://api.anthropic.com" || read.method !== "GET") throw new Error("Only Anthropic report reads are supported.");
    const url = new URL(read.path, read.origin);
    for (const [name, value] of Object.entries(read.query)) for (const entry of Array.isArray(value) ? value : [value]) url.searchParams.append(name, entry);
    return providerRequest(url, { method: "GET", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", Accept: "application/json" } }, fetcher, pause);
  };
}
export async function verifyAnthropicIdentity(transport: AiSourceTransport, accountId: string) {
  const response = await transport({ method: "GET", origin: "https://api.anthropic.com", path: "/v1/organizations/me", query: {} }) as { id?: unknown };
  if (!response || response.id !== accountId) throw new Error("The Anthropic organization does not match the authorized account.");
}
