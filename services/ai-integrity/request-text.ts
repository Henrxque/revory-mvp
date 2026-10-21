export async function readAiBoundedText(request: Request, maxBytes: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Empty request body.");
  const chunks: Uint8Array[] = []; let length = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break;
    length += value.byteLength; if (length > maxBytes) { await reader.cancel(); throw new Error("Request too large."); } chunks.push(value);
  } } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
