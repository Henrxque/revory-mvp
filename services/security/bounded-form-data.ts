import "server-only";

export async function readBoundedMultipartFormData(request: Request, maxBodyBytes: number) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    throw new Error("INVALID_MULTIPART_CONTENT_TYPE");
  }
  const declared = Number(request.headers.get("content-length"));
  if (!Number.isSafeInteger(declared) || declared <= 0) throw new Error("CONTENT_LENGTH_REQUIRED");
  if (declared > maxBodyBytes) throw new Error("UPLOAD_BODY_TOO_LARGE");
  if (!request.body) throw new Error("EMPTY_UPLOAD_BODY");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBodyBytes) {
        await reader.cancel("Upload body exceeds the authenticated workspace limit.");
        throw new Error("UPLOAD_BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (received !== declared) throw new Error("CONTENT_LENGTH_MISMATCH");
  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Request(request.url, { body, headers: { "content-type": contentType }, method: "POST" }).formData();
}
