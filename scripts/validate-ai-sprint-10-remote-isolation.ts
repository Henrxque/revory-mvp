import assert from "node:assert/strict";

import { prisma } from "../db/prisma";
import { getAiIntegrityScan } from "../services/ai-integrity/scan";

assert.equal(process.env.REVORY_SYNTHETIC_SEED_ACK, "SPRINT_10_ISOLATION_ONLY");
const database = new URL(process.env.DATABASE_URL ?? "").pathname.slice(1);
assert.match(database, /^revory_ai_(sandbox|homolog)_[a-f0-9]{12}$/);

try {
  const [owner, other] = await Promise.all([
    prisma.user.findUnique({ where: { email: "ai-sandbox@revory.local" }, select: { ownedWorkspaces: { select: { id: true } } } }),
    prisma.user.findUnique({ where: { email: "ai-isolation@revory.local" }, select: { ownedWorkspaces: { select: { id: true } } } }),
  ]);
  const ownerWorkspaceId = owner?.ownedWorkspaces[0]?.id;
  const otherWorkspaceId = other?.ownedWorkspaces[0]?.id;
  assert.ok(ownerWorkspaceId && otherWorkspaceId);
  assert.notEqual(ownerWorkspaceId, otherWorkspaceId);
  const report = await prisma.aiIntegritySnapshot.findFirst({ where: { workspaceId: ownerWorkspaceId }, orderBy: { createdAt: "desc" }, select: { id: true } });
  assert.ok(report);
  assert.ok(await getAiIntegrityScan(ownerWorkspaceId, report.id));
  assert.equal(await getAiIntegrityScan(otherWorkspaceId, report.id), null);
  assert.equal(await prisma.aiIntegritySnapshot.count({ where: { workspaceId: otherWorkspaceId } }), 0);
  console.log(JSON.stringify({ database, distinctWorkspaces: true, ownReportReadable: true, crossWorkspaceReportDenied: true }));
} finally {
  await prisma.$disconnect();
}
