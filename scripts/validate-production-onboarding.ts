import assert from "node:assert/strict";

import { belongsToHistoricalBillingCohort } from "../domain/revory/historical-billing-cohort";

const newAccount = {
  accountCreatedAt: new Date("2026-10-13T12:00:00.000Z"),
  billingStatus: "INACTIVE",
  hasLegacyPlan: false,
  hasRecordedEntitlement: false,
  hasStripeCustomer: false,
  internalPreview: false,
  productAdmin: false,
};

assert.equal(belongsToHistoricalBillingCohort(newAccount), false, "New accounts must not see Quote Recovery billing.");
assert.equal(belongsToHistoricalBillingCohort({ ...newAccount, accountCreatedAt: new Date("2026-10-02T23:59:59.999Z") }), true);
assert.equal(belongsToHistoricalBillingCohort({ ...newAccount, accountCreatedAt: new Date("2026-10-03T00:00:00.000Z") }), false);
assert.equal(belongsToHistoricalBillingCohort({ ...newAccount, hasRecordedEntitlement: true }), true, "Past purchases retain historical billing access.");
assert.equal(belongsToHistoricalBillingCohort({ ...newAccount, hasStripeCustomer: true }), true);
assert.equal(belongsToHistoricalBillingCohort({ ...newAccount, hasLegacyPlan: true }), true);
assert.equal(belongsToHistoricalBillingCohort({ ...newAccount, billingStatus: "ACTIVE" }), true);
assert.equal(belongsToHistoricalBillingCohort({ ...newAccount, productAdmin: true }), true);
assert.equal(belongsToHistoricalBillingCohort({ ...newAccount, internalPreview: true }), true);

console.log("Production onboarding cohort: PASS");
