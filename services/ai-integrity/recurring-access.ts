import "server-only";
import { isAiCommercialRuntimeEnabled, monitorLiveMode } from "./commercial-runtime";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/db/prisma";
import { isAiIntegrityExperienceEnabled } from "./experience";
import { MONITOR_OFFER, LEGACY_MONITOR_OFFER } from "@/domain/ai-integrity/commercial-offers";

export { MONITOR_OFFER } from "@/domain/ai-integrity/commercial-offers";
export function monitorPriceOffer(priceId: string) {
  if (priceId && priceId === process.env.REVORY_AI_MONITOR_PRICE_ID) return MONITOR_OFFER;
  const legacyIds = (process.env.REVORY_AI_MONITOR_LEGACY_PRICE_IDS ?? "").split(/[,;\s]+/).filter(id => /^price_/.test(id));
  return legacyIds.includes(priceId) ? LEGACY_MONITOR_OFFER : null;
}
export function isKnownMonitorOffer(version: string | undefined) { return version === MONITOR_OFFER.version || version === LEGACY_MONITOR_OFFER.version; }
export const RECURRING_MODE = "CONNECTED_MONITOR";
export type MonitorSubscription = { customerId: string; subscriptionId: string; priceId: string; paidThrough: string; verifiedAt: string; livemode: boolean; amountMinor?: number; offerVersion?: string; cancelAt?: string | null; cancelAtPeriodEnd?: boolean };
export type MonitorSchedule = { actorUserId: string; periodDays: number; lagHours: number; consentUntil: string; nextStart: string; connections: Array<{ id: string; generation: number }>; emailEnabled: boolean; minimumUsageDelta: string; projectLinks: Array<{ mappingId: string; projectId: string; customerId: string; provider: string; organizationId: string | null }> };
export type MonitorRun = { scheduleId: string; start: string; end: string; ledgerBatchId?: string; exportedAt?: string; completeThrough?: string; snapshotId?: string; comparisonId?: string; errorCode?: string };
export const stateKey = (workspaceId: string, kind: string, key = "primary") => ({ workspaceId_kind_key: { workspaceId, kind, key } });
export function recurringEnabled() {
  // The existing commercial activation gate remains closed until its environment
  // and source live-mode requirements have been verified.
  return process.env.REVORY_AI_RECURRING_MONITOR === "true" && (isAiCommercialRuntimeEnabled() || (process.env.NODE_ENV !== "production" && !process.env.VERCEL_ENV)) && process.env.REVORY_AI_CUSTOMER_SOURCES === "true"
    && process.env.REVORY_AI_CONNECTED_REPORTS === "true" && process.env.REVORY_AI_SAAS_SYNTHETIC_ONLY !== "true"
    && isAiIntegrityExperienceEnabled();
}
export async function monitorPaid(tx: Prisma.TransactionClient, workspaceId: string, now = new Date()) {
  if (!recurringEnabled()) return false;
  const row = await tx.aiIntegrityMonitorState.findUnique({ where: stateKey(workspaceId, "SUBSCRIPTION") });
  const data = row?.dataJson as unknown as MonitorSubscription | undefined;
  const offer = data ? monitorPriceOffer(data.priceId) : null;
  return row?.status === "ACTIVE" && !!data && !!offer && (!data.offerVersion || data.offerVersion === offer.version) && data.livemode === monitorLiveMode() && new Date(data.paidThrough) > now
    && new Date(data.verifiedAt).valueOf() > now.valueOf() - 86400000;
}
export async function assertMonitorOwner(workspaceId: string, actorUserId: string, tx: Prisma.TransactionClient = prisma) {
  if (!recurringEnabled()) throw new Error("Recurring monitoring is unavailable.");
  const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM workspaces WHERE id = ${workspaceId} AND "ownerUserId" = ${actorUserId} FOR UPDATE`;
  if (rows.length !== 1) throw new Error("Only the workspace owner can manage monitoring.");
}
export async function monitorRunAuthorized(tx: Prisma.TransactionClient, workspaceId: string, runId: string, actorUserId: string, expectedLease?: string) {
  await assertMonitorOwner(workspaceId, actorUserId, tx);
  if (!await monitorPaid(tx, workspaceId)) throw new Error("A current paid monitoring subscription is required.");
  const run = await tx.aiIntegrityMonitorState.findFirst({ where: { id: runId, workspaceId, kind: "RUN", status: "RUNNING", leaseUntil: { gt: new Date() } } });
  if (!run || (expectedLease && run.leaseToken !== expectedLease)) throw new Error("Monitoring execution is no longer active.");
  const data = run.dataJson as unknown as MonitorRun;
  const schedule = await tx.aiIntegrityMonitorState.findFirst({ where: { id: data.scheduleId, workspaceId, kind: "SCHEDULE", status: "ACTIVE" } });
  const config = schedule?.dataJson as unknown as MonitorSchedule | undefined;
  if (!config || config.actorUserId !== actorUserId || new Date(config.consentUntil) < new Date(data.end)) throw new Error("Recurring consent expired or was revoked.");
  const connections = await tx.aiIntegritySourceConnection.findMany({ where: { workspaceId, id: { in: config.connections.map(c => c.id) }, status: "ACTIVE", credential: { isNot: null } } });
  if (connections.length !== 2 || config.connections.some(c => !connections.some(active => active.id === c.id && active.generation === c.generation))) throw new Error("A source was revoked or replaced. Review recurring consent.");
  const links = config.projectLinks ?? [];
  if (await tx.aiIntegrityMapping.count({ where: { workspaceId, id: { in: links.map(link => link.mappingId) }, status: "CONFIRMED" } }) !== links.length) throw new Error("Customer links changed. Review recurring consent.");
  return { run, data, schedule: schedule!, config };
}

export function getMonitorDateSuggestions(asOf = new Date()) {
  const day = (offset: number) => new Date(asOf.valueOf() + offset * 86400000).toISOString().slice(0, 10);
  return { start: day(-8), until: day(30) };
}
