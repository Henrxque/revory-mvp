import "server-only";
import type { AiIntegrityBatchInput } from "@/domain/ai-integrity/contracts";
import { prisma } from "@/db/prisma";
import { assertConnectedReportAccess, CONNECTED_LEDGER_MODE } from "./connected-report-access";
import { persistAiIntegrityBatch } from "./persist-batch";

export async function persistConnectedLedger(input: AiIntegrityBatchInput, actorUserId: string, authorized: boolean) {
  if (!authorized || input.sourceKind !== "INTERNAL_LEDGER") throw new Error("Authorize your internal ledger before storing it.");
  return prisma.$transaction(async (tx) => {
    await assertConnectedReportAccess(tx, input.workspaceId, actorUserId);
    return persistAiIntegrityBatch({ ...input, sourceSystem: `authorized-ledger:${input.sourceSystem}`, dataQuality: { ...input.dataQuality, mode: CONNECTED_LEDGER_MODE, authorizedBy: actorUserId, authorizationVersion: "connected-ledger/v1" } }, actorUserId, tx);
  }, { maxWait: 10000, timeout: 120000 });
}
