import "server-only";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { getQuoteRecoveryRead } from "@/services/quote-recovery/read-model";

export async function createQuoteRecoveryAnalysisRun(workspaceId: string) { const read = await getQuoteRecoveryRead(workspaceId); const latest = await prisma.canonicalImportSession.findFirst({ where: { workspaceId, status: "COMMITTED" }, orderBy: { committedAt: "desc" } }); return prisma.quoteRecoveryAnalysisRun.create({ data: { workspaceId, importSessionId: latest?.id, findingSnapshotJson: read.findings as unknown as Prisma.InputJsonValue, activeCount: read.summary.activeCount, estimatedValueCents: read.summary.estimatedValueCents, dataQualityJson: read.dataQuality as unknown as Prisma.InputJsonValue } }); }
export async function completeQuoteRecoveryAnalysisRun(workspaceId: string, id: string) { return prisma.quoteRecoveryAnalysisRun.updateMany({ where: { id, workspaceId }, data: { status: "COMPLETED", completedAt: new Date() } }); }
export async function getQuoteRecoveryAnalysisHistory(workspaceId: string) { return prisma.quoteRecoveryAnalysisRun.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 12 }); }
