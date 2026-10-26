import "server-only";

const MAX_BYTES = 2 * 1024 * 1024;
export async function providerJson(response: Response): Promise<unknown> {
  if (Number(response.headers.get("content-length")) > MAX_BYTES || !response.body) throw new Error("Provider response exceeds limits or is empty.");
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > MAX_BYTES) throw new Error("Provider response exceeds limits."); chunks.push(value); }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { throw new Error("Provider returned invalid JSON."); }
}
export async function providerRequest(url: URL, init: RequestInit, fetcher: typeof fetch = fetch, pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Response;
    try { response = await fetcher(url, { ...init, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(8000) }); }
    catch { if (attempt === 2) throw new Error("Provider read failed after bounded network retries."); await pause(250 * (attempt + 1)); continue; }
    if (response.ok) return providerJson(response);
    await response.body?.cancel().catch(() => {});
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 2) throw new Error(`Provider read failed (HTTP ${response.status}).`);
    const delay = Number(response.headers.get("retry-after")); await pause(Number.isFinite(delay) && delay >= 0 ? Math.min(2000, delay * 1000) : 250 * (attempt + 1));
  }
  throw new Error("Provider read failed.");
}
