import "server-only";

import { prisma } from "@/db/prisma";
import { getGrowthAccess } from "@/services/billing/growth-access";
import {
  createEmailIdempotencyKey,
  escapeEmailHtml,
  getTransactionalEmailConfig,
  sendTransactionalEmail,
} from "@/services/email/transactional-email";
import { buildCurrentGrowthIntelligence } from "@/services/growth-intelligence/snapshots";
import { getQuoteRecoveryMovement } from "@/services/quote-recovery/movement";

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { currency, maximumFractionDigits: 0, style: "currency" }).format(cents / 100);
}

export async function sendWeeklyGrowthDigest(workspaceId: string) {
  const access = await getGrowthAccess(workspaceId);
  if (!access.commerciallyEntitled) return { reason: "GROWTH_ENTITLEMENT_REQUIRED" as const, sent: false };
  const config = getTransactionalEmailConfig();
  if (!config.configured) return { reason: "EMAIL_NOT_CONFIGURED" as const, sent: false };
  const workspace = await prisma.workspace.findUnique({
    include: { digestPreference: true, owner: true },
    where: { id: workspaceId },
  });
  if (!workspace?.digestPreference?.enabled) return { reason: "DIGEST_DISABLED" as const, sent: false };

  const [movement, intelligence] = await Promise.all([
    getQuoteRecoveryMovement(workspaceId),
    buildCurrentGrowthIntelligence(workspaceId),
  ]);
  const decision = intelligence.decision;
  const providerDecisionHeadline = decision.segment
    ? `Review the highest guarded ${decision.segment.dimension.toLowerCase().replace("_", " ")} cohort in REVORY.`
    : decision.headline;
  const providerDecisionRationale = decision.segment
    ? `${decision.segment.findingRecordCount} of ${decision.segment.recordCount} comparable records carry the supported basis. The cohort label remains inside the authenticated workspace.`
    : decision.rationale;
  const calculatedGap = intelligence.realizationSummary.calculatedUnderbillingCents;
  const currency = intelligence.realizationSummary.currency ?? "USD";
  const calculatedLabel = calculatedGap === null
    ? "suppressed (mixed currencies)"
    : money(calculatedGap, currency);
  const safeHeadline = escapeEmailHtml(providerDecisionHeadline);
  const safeRationale = escapeEmailHtml(providerDecisionRationale);
  const safeCalculatedLabel = escapeEmailHtml(calculatedLabel);
  const dateKey = new Date().toISOString().slice(0, 10);
  const delivery = await sendTransactionalEmail({
    html: `<h1>Weekly management decision</h1><p><strong>${safeHeadline}</strong></p><p>${safeRationale}</p><h2>Movement</h2><p><strong>${movement.newCount}</strong> new &middot; <strong>${movement.persistentCount}</strong> persistent &middot; <strong>${movement.worseningCount}</strong> worsening &middot; <strong>${movement.resolvedCount}</strong> resolved.</p><p>Customer-confirmed recovered: <strong>${money(movement.recoveredValueCents)}</strong>.<br/>Calculated billing gap: <strong>${safeCalculatedLabel}</strong>.</p><p>Review source evidence in REVORY before acting.</p>`,
    idempotencyKey: createEmailIdempotencyKey("weekly-growth", `${workspaceId}:${dateKey}`),
    subject: "Your weekly REVORY management decision",
    text: `Weekly decision: ${providerDecisionHeadline}\n${providerDecisionRationale}\n\nQuote Recovery movement\nNew: ${movement.newCount}\nPersistent: ${movement.persistentCount}\nWorsening: ${movement.worseningCount}\nResolved: ${movement.resolvedCount}\nCustomer-confirmed recovered: ${money(movement.recoveredValueCents)}\nCalculated billing gap: ${calculatedLabel}\n\nReview source evidence in REVORY before acting.`,
    to: workspace.owner.email,
  });
  if (!delivery.sent) {
    console.error(JSON.stringify({ level: "error", message: "weekly_growth_digest_failed", reason: delivery.reason, workspaceId }));
    return { reason: delivery.reason ?? "PROVIDER_ERROR" as const, sent: false };
  }
  await prisma.quoteRecoveryDigestPreference.update({ data: { lastSentAt: new Date() }, where: { workspaceId } });
  console.log(JSON.stringify({ level: "info", message: "weekly_growth_digest_sent", workspaceId }));
  return { reason: null, sent: true };
}

export const sendWeeklyQuoteRecoveryDigest = sendWeeklyGrowthDigest;
