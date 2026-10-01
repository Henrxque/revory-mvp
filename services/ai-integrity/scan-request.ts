import type { RunAiScanRequest } from "./scan";

export async function readScanRequest(request: Request): Promise<Omit<RunAiScanRequest, "workspaceId" | "actorUserId">> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Error("JSON body required.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Empty request body.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 8192) { await reader.cancel(); throw new Error("Scan request exceeds 8 KB."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as Record<string, unknown> | null;
  if (!body || Array.isArray(body) || body.syntheticDataConfirmed !== true || body.closureReviewed !== true) throw new Error("Confirm synthetic data and source closure review.");
  if (!Array.isArray(body.batchIds) || body.batchIds.length !== 3 || body.batchIds.some((id) => typeof id !== "string" || !id || id.length > 200)) throw new Error("Select three source batches.");
  if (typeof body.asOf !== "string" || typeof body.lagHours !== "number" || !Array.isArray(body.sourceReviews) || body.sourceReviews.length !== 3) throw new Error("Complete analysis time, consolidation lag and source reviews.");
  const sourceReviews = body.sourceReviews.map((value: unknown) => {
    if (!value || typeof value !== "object") throw new Error("Invalid source review.");
    const r = value as Record<string, unknown>;
    if (typeof r.batchId !== "string" || typeof r.exportedAt !== "string" || typeof r.completeThrough !== "string") throw new Error("Invalid source review timestamps.");
    return { batchId: r.batchId, exportedAt: r.exportedAt, completeThrough: r.completeThrough };
  });
  if (body.grantId !== undefined && (typeof body.grantId !== "string" || body.grantId.length > 200)) throw new Error("Invalid purchase reference.");
  return { batchIds: body.batchIds as string[], asOf: body.asOf, lagHours: body.lagHours, sourceReviews, syntheticDataConfirmed: true,
    ...(typeof body.grantId === "string" ? { grantId: body.grantId } : {}) };
}
