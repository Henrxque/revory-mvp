export function aiAmount(value: string) {
  const [whole, fraction] = value.split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction ? `.${fraction}` : ""}`;
}
export function aiMoney(value: string, currency: string) {
  const [whole, fraction = ""] = value.split(".");
  return `${currency} ${aiAmount(whole)}.${fraction.padEnd(2, "0")}`;
}
export function aiFindingTitle(type: string) { return type === "UNATTRIBUTED_PROVIDER_SPEND" ? "Spend without a customer link" : "Usage that doesn't reconcile"; }
export function aiReason(code: string) {
  const copy: Record<string, string> = {
    NO_EXCLUSIVE_PROJECT_MAPPING: "Project ownership has not been confirmed.",
    NO_PROVIDER_PROJECT: "The provider report has no project identity.",
    NO_CORROBORATING_LEDGER_USAGE: "No internal usage corroborates this project in the period.",
    SHARED_OR_UNATTRIBUTED_PROJECT: "This project has shared usage or missing customer identities.",
    PROJECT_ACROSS_ORGANIZATIONS: "Project identity is ambiguous across provider organizations.",
    LEDGER_WINDOW_INCOMPLETE: "The ledger is incomplete for this period.",
    SOURCE_OPEN_OR_CONSOLIDATION_LAG: "A source is still open or has not passed the reviewed consolidation lag.",
    PROVIDER_BUCKET_NOT_FINAL: "The provider report timestamp cannot support a settled comparison.",
    IMPORT_EXCLUDED_ROWS: "Some imported rows were excluded. Review the original quality notes.",
    REVENUE_MARGIN_AND_CREDIT_RULES_NOT_IMPLEMENTED: "Stripe revenue and credits are context in this scan; no margin or credit-balance conclusion is made.",
    CONFIRMED_COMPARABLE_SCOPE_REQUIRED: "Confirm an exclusive project link before comparing customer usage.",
    SOURCE_INCOMPLETE_FOR_USAGE_COMPARISON: "Usage comparison needs both sources to be complete.",
    USAGE_UNIT_NOT_COMPARABLE: "The usage units do not match exactly.",
    LEDGER_ROWS_NOT_COMPARED: "Some ledger events have no eligible provider comparison.",
    OVERLAPPING_PROVIDER_BUCKETS: "Overlapping provider cost buckets were excluded to prevent double counting.",
    OVERLAPPING_USAGE_BUCKETS: "Overlapping usage buckets cannot reuse the same ledger events.",
    CONFLICTING_PROVIDER_RECORD_VERSION: "Provider records have conflicting revisions.",
    CONFLICTING_LEDGER_RECORD_VERSION: "Ledger records have conflicting revisions.",
    DUPLICATE_PROVIDER_REQUEST: "The same provider request appears under multiple ledger events.",
    ADJUSTMENT_EXCLUDED: "Credits or adjustments were excluded from comparable reported spend.",
    ESTIMATED_COST_EXCLUDED: "Estimated costs are kept outside observed provider spend.",
    COST_NOT_REPORTED: "No observed provider cost is available for this bucket.",
  };
  return copy[code] ?? "This evidence needs review before it can support a comparable result.";
}
