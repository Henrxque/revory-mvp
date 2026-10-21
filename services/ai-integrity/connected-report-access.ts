import { aiConnectedScanOrderWhere } from "./experience";
import "server-only";
import { monitorPaid } from "./recurring-access";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/db/prisma";
import { isAiCustomerSourcesEnabled } from "./customer-sources";

export const CONNECTED_REPORT_MODE = "CONNECTED_REPORT_PREVIEW";
export const CONNECTED_LEDGER_MODE = "AUTHORIZED_LEDGER_PREVIEW";
export function isAiConnectedReportsEnabled() {
  return isAiCustomerSourcesEnabled() && process.env.REVORY_AI_CONNECTED_REPORTS === "true";
}
export async function assertConnectedReportAccess(tx: Prisma.TransactionClient, workspaceId: string, actorUserId: string, requireUnusedPurchase = true) {
  if (!isAiConnectedReportsEnabled()) throw new Error("Connected reports are unavailable in this environment.");
  const owners = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM workspaces WHERE id = ${workspaceId} AND "ownerUserId" = ${actorUserId} FOR UPDATE`;
  if (owners.length !== 1) throw new Error("Only the workspace owner can prepare a connected report.");
  if (requireUnusedPurchase && !await monitorPaid(tx, workspaceId) && !await tx.aiIntegrityScanGrant.findFirst({ where: { workspaceId, status: "ACTIVE", consumedAt: null, order: aiConnectedScanOrderWhere() }, select: { id: true } })) throw new Error("A confirmed unused scan purchase is required.");
}
export async function requireConnectedReportAccess(workspaceId: string, actorUserId: string) {
  return prisma.$transaction((tx) => assertConnectedReportAccess(tx, workspaceId, actorUserId));
}
