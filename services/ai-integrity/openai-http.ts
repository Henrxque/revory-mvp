import "server-only";
import { assertAiSourceRead, type AiSourceRead, type AiSourceTransport } from "@/domain/ai-integrity/connected-sources";

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

async function boundedJson(response: Response): Promise<unknown> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) throw new Error("OpenAI response exceeds the configured limit.");
  if (!response.body) throw new Error("OpenAI returned an empty HTTP body.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) throw new Error("OpenAI response exceeds the configured limit.");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new Error("OpenAI returned invalid JSON."); }
}

function safeDelay(response: Response | null, attempt: number) {
  const seconds = Number(response?.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds >= 0 ? Math.min(seconds * 1000, 2000) : 250 * (attempt + 1);
}

export function createOpenAiReadTransport(adminKey: string, organizationId: string, fetcher: typeof fetch = fetch, pause: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))): AiSourceTransport {
  if (!adminKey.startsWith("sk-") || /\s/.test(adminKey) || !/^org-[A-Za-z0-9_-]{3,100}$/.test(organizationId)) throw new Error("Controlled OpenAI credentials are unavailable.");
  return async (read: AiSourceRead) => {
    assertAiSourceRead(read);
    if (read.origin !== "https://api.openai.com" || !["/v1/organization/usage/completions", "/v1/organization/costs"].includes(read.path)) throw new Error("Only OpenAI Usage and Costs reads are available.");
    const url = new URL(read.path, "https://api.openai.com");
    for (const [key, value] of Object.entries(read.query)) for (const entry of Array.isArray(value) ? value : [value]) url.searchParams.append(key, entry);
    for (let attempt = 0; attempt < 3; attempt++) {
      let response: Response | null = null;
      try {
        response = await fetcher(url, { method: "GET", headers: { Authorization: `Bearer ${adminKey}`, "OpenAI-Organization": organizationId, Accept: "application/json" }, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(8000) });
      } catch {
        if (attempt === 2) throw new Error("OpenAI read failed after bounded network retries.");
        await pause(safeDelay(null, attempt)); continue;
      }
      if (response.ok) return boundedJson(response);
      if (!RETRYABLE.has(response.status) || attempt === 2) throw new Error(`OpenAI read failed (HTTP ${response.status}).`);
      await response.body?.cancel().catch(() => {});
      await pause(safeDelay(response, attempt));
    }
    throw new Error("OpenAI read failed.");
  };
}
