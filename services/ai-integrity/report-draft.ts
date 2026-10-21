import "server-only";
import { prisma } from "@/db/prisma";
import { assertConnectedReportAccess, CONNECTED_LEDGER_MODE, CONNECTED_REPORT_MODE } from "./connected-report-access";

const sources = ["STRIPE_REVENUE", "INTERNAL_LEDGER", "PROVIDER_REPORT"] as const;
export type ConnectedReportSetup = { selected: Partial<Record<typeof sources[number], string>>; timing: Partial<Record<typeof sources[number], { exportedAt: string; completeThrough: string }>>; lag: string; asOf: string };
export async function saveConnectedReportDraft(workspaceId: string, actorUserId: string, raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid report setup.");
  const { revision, setup, ...extra } = raw as Record<string, unknown>;
  if (Object.keys(extra).length || !Number.isSafeInteger(revision) || Number(revision) < 0 || !setup || typeof setup !== "object" || Array.isArray(setup)) throw new Error("Invalid report setup revision.");
  const data = setup as Record<string, unknown>;
  if (Object.keys(data).some((name) => !["selected", "timing", "lag", "asOf"].includes(name)) || typeof data.lag !== "string" || !/^(|[0-9]{1,3})$/.test(data.lag) || (data.lag !== "" && Number(data.lag) > 720) || typeof data.asOf !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(data.asOf)) throw new Error("Invalid report setup fields.");
  const selected = data.selected, timing = data.timing;
  for (const value of [selected, timing]) if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((name) => !sources.includes(name as typeof sources[number]))) throw new Error("Invalid source setup.");
  const clean: ConnectedReportSetup = { selected: {}, timing: {}, lag: data.lag, asOf: data.asOf };
  for (const source of sources) {
    const id = (selected as Record<string, unknown>)[source];
    if (id !== undefined && id !== "") { if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,160}$/.test(id)) throw new Error("Invalid selected source."); clean.selected[source] = id; }
    const value = (timing as Record<string, unknown>)[source];
    if (value !== undefined) {
      if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((name) => !["exportedAt", "completeThrough"].includes(name))) throw new Error("Invalid source timing.");
      const entry = value as Record<string, unknown>;
      for (const date of [entry.exportedAt, entry.completeThrough]) if (typeof date !== "string" || !/^(|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?)$/.test(date)) throw new Error("Invalid source date.");
      clean.timing[source] = { exportedAt: entry.exportedAt as string, completeThrough: entry.completeThrough as string };
    }
  }
  return prisma.$transaction(async (tx) => {
    await assertConnectedReportAccess(tx, workspaceId, actorUserId);
    for (const source of sources) if (clean.selected[source]) {
      if (!await tx.aiIntegrityImportBatch.findFirst({ where: { id: clean.selected[source], workspaceId, sourceKind: source, dataQualityJson: { path: ["mode"], equals: source === "INTERNAL_LEDGER" ? CONNECTED_LEDGER_MODE : CONNECTED_REPORT_MODE } }, select: { id: true } })) throw new Error("Selected source is unavailable in this workspace.");
    }
    const previous = await tx.aiIntegrityReportDraft.findUnique({ where: { workspaceId } });
    if ((previous?.revision ?? 0) !== revision) throw new Error("Report setup changed in another tab. Reload before saving.");
    return tx.aiIntegrityReportDraft.upsert({ where: { workspaceId }, create: { workspaceId, setupJson: clean }, update: { revision: { increment: 1 }, setupJson: clean } });
  });
}
