// The public AI SaaS presentation launched on October 2. Accounts created
// through that day remain eligible for the historical Quote Recovery journey.
const historicalAccountCutoff = new Date("2026-10-03T00:00:00.000Z");

type HistoricalBillingSignals = {
  accountCreatedAt: Date;
  billingStatus: string;
  hasLegacyPlan: boolean;
  hasRecordedEntitlement: boolean;
  hasStripeCustomer: boolean;
  internalPreview: boolean;
  productAdmin: boolean;
};

export function belongsToHistoricalBillingCohort(signals: HistoricalBillingSignals) {
  return (
    signals.internalPreview ||
    signals.productAdmin ||
    signals.accountCreatedAt < historicalAccountCutoff ||
    signals.hasStripeCustomer ||
    signals.hasLegacyPlan ||
    signals.billingStatus !== "INACTIVE" ||
    signals.hasRecordedEntitlement
  );
}
