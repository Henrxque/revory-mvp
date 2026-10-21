import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../db/prisma";
import { queueMonitorEmailTest, deliverMonitorNotices } from "../services/ai-integrity/recurring-monitor";

if (!/^\/revory_sprint1_[a-f0-9]{12}$/.test(new URL(process.env.DATABASE_URL ?? "").pathname)) throw new Error("Use the disposable database harness.");
Object.assign(process.env, { REVORY_AI_SAAS_PREVIEW: "true", REVORY_AI_SAAS_SYNTHETIC_ONLY: "false", REVORY_AI_CUSTOMER_SOURCES: "true", REVORY_AI_CONNECTED_REPORTS: "true", REVORY_AI_RECURRING_MONITOR: "true", REVORY_AI_MONITOR_PRICE_ID: "price_monitor_fixture" });
delete process.env.VERCEL_ENV;

try {
  const user = await prisma.user.create({ data: { email: randomUUID() + "@example.invalid", status: "ACTIVE", emailVerifiedAt: new Date() } });
  const other = await prisma.user.create({ data: { email: randomUUID() + "@example.invalid", status: "ACTIVE", emailVerifiedAt: new Date() } });
  async function workspace(paid = true) {
    const ws = await prisma.workspace.create({ data: { name: "Email test fixture", slug: randomUUID(), ownerUserId: user.id } });
    if (paid) await prisma.aiIntegrityMonitorState.create({ data: { workspaceId: ws.id, kind: "SUBSCRIPTION", key: "primary", status: "ACTIVE", dataJson: { priceId: "price_monitor_fixture", livemode: false, verifiedAt: new Date().toISOString(), paidThrough: new Date(Date.now() + 86400000).toISOString() } } });
    return ws;
  }
  const ws = await workspace(), unpaid = await workspace(false);
  await assert.rejects(() => queueMonitorEmailTest(ws.id, other.id));
  await assert.rejects(() => queueMonitorEmailTest(unpaid.id, user.id));
  await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: null } });
  await assert.rejects(() => queueMonitorEmailTest(ws.id, user.id));
  await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });

  const requests = await Promise.all([queueMonitorEmailTest(ws.id, user.id), queueMonitorEmailTest(ws.id, user.id)]);
  assert.equal(requests[0].id, requests[1].id, "Concurrent requests reuse one daily notice.");
  assert.equal(await prisma.aiIntegrityMonitorState.count({ where: { workspaceId: ws.id, kind: "SCHEDULE" } }), 0, "A delivery test grants no recurring-read consent.");
  let sends = 0;
  const sender = async (input: { to: string; subject: string; text: string; idempotencyKey: string }) => {
    sends++; assert.equal(input.to, user.email); assert.match(input.subject, /email test/); assert.match(input.text, /does not start recurring reads/);
    assert.equal(input.idempotencyKey, "revory-monitor/" + requests[0].id);
    return { sent: true, reason: null, providerId: "provider-fixture" } as const;
  };
  const target = { workspaceId: ws.id, noticeId: requests[0].id };
  await Promise.all([deliverMonitorNotices(sender, target), deliverMonitorNotices(sender, target)]);
  assert.equal(sends, 1, "Outbox lease prevents duplicate delivery.");
  const sent = await prisma.aiIntegrityMonitorState.findUniqueOrThrow({ where: { id: target.noticeId } });
  assert.equal(sent.status, "SENT"); assert.equal((sent.dataJson as { providerId: string }).providerId, "provider-fixture");
  assert.equal((await queueMonitorEmailTest(ws.id, user.id)).id, target.noticeId);

  const foreign = await workspace(), foreignNotice = await queueMonitorEmailTest(foreign.id, user.id);
  await deliverMonitorNotices(sender, { workspaceId: ws.id, noticeId: foreignNotice.id });
  assert.equal(sends, 1, "Targeted request cannot send another workspace's notice.");
  await prisma.workspace.update({ where: { id: foreign.id }, data: { ownerUserId: other.id } });
  await deliverMonitorNotices(sender, { workspaceId: foreign.id, noticeId: foreignNotice.id });
  assert.equal(sends, 1, "Ownership change cancels queued delivery.");
  assert.equal((await prisma.aiIntegrityMonitorState.findUniqueOrThrow({ where: { id: foreignNotice.id } })).status, "CANCELED");

  const blocked = await workspace(), blockedNotice = await queueMonitorEmailTest(blocked.id, user.id);
  await prisma.aiIntegrityMonitorState.updateMany({ where: { workspaceId: blocked.id, kind: "SUBSCRIPTION" }, data: { status: "BLOCKED" } });
  await deliverMonitorNotices(sender, { workspaceId: blocked.id, noticeId: blockedNotice.id });
  assert.equal(sends, 1, "Lost paid access prevents delivery.");

  const changed = await workspace(), changedNotice = await queueMonitorEmailTest(changed.id, user.id);
  await prisma.user.update({ where: { id: user.id }, data: { email: randomUUID() + "@example.invalid" } });
  await deliverMonitorNotices(sender, { workspaceId: changed.id, noticeId: changedNotice.id });
  assert.equal(sends, 1, "A queued test cannot silently change recipient.");
  console.log("PASS: paid verified owner only, daily deduplication, no recurring consent, recipient binding, outbox lease and workspace isolation.");
} finally { await prisma.$disconnect(); }
