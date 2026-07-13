import { createHash } from "node:crypto";

import type { CanonicalRecordContract, FindingSeverity } from "@/domain/revory/contracts";
import type {
  JobBillingReconciliation,
  RevenueRealizationEvidence,
  RevenueRealizationFindingContract,
  RevenueRealizationFindingSummary,
  RevenueRealizationRead,
} from "@/domain/revory/revenue-realization";

const completedJobStatuses = new Set(["closed", "complete", "completed", "finished"]);
const approvedChangeStatuses = new Set(["accepted", "approved"]);
const explicitlyUnbilledStatuses = new Set([
  "not billed",
  "not invoiced",
  "not_billed",
  "not_invoiced",
  "pending billing",
  "pending invoice",
  "unbilled",
  "uninvoiced",
]);
const scopeTextPatterns = [
  /\badditional work\b/i,
  /\bcustomer requested\b/i,
  /\bextra work\b/i,
  /\bout of scope\b/i,
  /\bscope change\b/i,
];

function normalizedString(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function recordKey(record: CanonicalRecordContract) {
  return `${record.entityType}:${record.sourceSystem}:${record.externalId}`;
}

function fingerprint(
  workspaceId: string,
  type: RevenueRealizationFindingContract["type"],
  jobExternalId: string,
  changeOrderExternalId: string | null = null,
) {
  return createHash("sha256")
    .update(`${workspaceId}|REVENUE_REALIZATION|${type}|${jobExternalId}|${changeOrderExternalId ?? "JOB"}`)
    .digest("hex");
}

function severityForAmount(valueCents: number): FindingSeverity {
  if (valueCents >= 100_000_00) return "CRITICAL";
  if (valueCents >= 25_000_00) return "HIGH";
  if (valueCents >= 5_000_00) return "MEDIUM";
  return "LOW";
}

function evidence(
  record: CanonicalRecordContract,
  fields: readonly string[],
): RevenueRealizationEvidence[] {
  return fields
    .filter((field) => record.payload[field] !== undefined)
    .map((field) => ({
      entityType: record.entityType,
      externalId: record.externalId,
      field,
      provenance: record.provenance,
      value: record.payload[field],
    }));
}

function matchedToJob(
  read: RevenueRealizationRead,
  record: CanonicalRecordContract,
  job: CanonicalRecordContract,
) {
  const match = read.matches.find(
    (candidate) =>
      candidate.sourceRecordKey === recordKey(record) &&
      candidate.relationField === "jobExternalId",
  );
  return match?.state === "MATCHED" && match.candidateRecordKeys[0] === recordKey(job);
}

function invoiceMatchState(read: RevenueRealizationRead, record: CanonicalRecordContract) {
  return read.matches.find(
    (candidate) =>
      candidate.sourceRecordKey === recordKey(record) &&
      candidate.relationField === "invoiceExternalId",
  )?.state ?? null;
}

function underbillingFinding(
  workspaceId: string,
  row: JobBillingReconciliation,
  job: CanonicalRecordContract,
  linkedRecords: CanonicalRecordContract[],
): RevenueRealizationFindingContract | null {
  if (row.state !== "ELIGIBLE" || !row.currency || !row.calculatedGapCents || row.calculatedGapCents <= 0) {
    return null;
  }
  const valueCents = row.calculatedGapCents;
  return {
    additiveToExecutiveGap: true,
    calculationInputs: {
      approvedChangeOrderCents: row.approvedChangeOrderCents ?? 0,
      expectedBillingCents: row.expectedBillingCents ?? 0,
      invoicedCents: row.invoicedCents ?? 0,
    },
    category: "FINANCIAL",
    changeOrderExternalId: null,
    confidence: "HIGH",
    currency: row.currency,
    evidence: [
      ...evidence(job, ["status", "contractValueCents", "contractValueIncludesApprovedChanges", "currency"]),
      ...linkedRecords.flatMap((record) =>
        evidence(record, record.entityType === "CHANGE_ORDER"
          ? ["status", "approvedAmountCents", "approvedAt", "currency"]
          : ["status", "amountCents", "currency"]),
      ),
    ],
    family: "REVENUE_REALIZATION",
    fingerprint: fingerprint(workspaceId, "UNDERBILLING_GAP", row.jobExternalId),
    formula: row.formula,
    jobExternalId: row.jobExternalId,
    priority: valueCents >= 100_000_00 ? 98 : valueCents >= 25_000_00 ? 94 : valueCents >= 5_000_00 ? 86 : 78,
    reason: "Supported expected billing is greater than observed eligible invoice value for this completed job.",
    recommendedAction: "Review the reconstructed source rows and confirm whether an additional invoice or correction is appropriate.",
    severity: severityForAmount(valueCents),
    status: "OPEN",
    type: "UNDERBILLING_GAP",
    urgency: valueCents >= 25_000_00 ? "HIGH" : "MEDIUM",
    valueBasis: "CALCULATED",
    valueCents,
  };
}

export function runRevenueRealizationFindingEngine(input: {
  workspaceId: string;
  records: readonly CanonicalRecordContract[];
  reconciliation: RevenueRealizationRead;
}): RevenueRealizationFindingContract[] {
  if (
    input.reconciliation.workspaceId !== input.workspaceId ||
    input.records.some((record) => record.workspaceId !== input.workspaceId)
  ) {
    throw new Error("Cross-workspace records are not eligible for Revenue Realization findings.");
  }

  const findings: RevenueRealizationFindingContract[] = [];
  const jobs = input.records.filter((record) => record.entityType === "JOB");
  const invoices = input.records.filter((record) => record.entityType === "INVOICE");
  const changeOrders = input.records.filter((record) => record.entityType === "CHANGE_ORDER");
  const costs = input.records.filter((record) => record.entityType === "COST");

  for (const row of input.reconciliation.reconciliations) {
    const jobCandidates = jobs.filter((job) => job.externalId === row.jobExternalId);
    if (jobCandidates.length !== 1) continue;
    const job = jobCandidates[0];
    const jobInvoices = invoices.filter((record) => matchedToJob(input.reconciliation, record, job));
    const jobChanges = changeOrders.filter((record) => matchedToJob(input.reconciliation, record, job));
    const jobCosts = costs.filter((record) => matchedToJob(input.reconciliation, record, job));

    const gapFinding = underbillingFinding(
      input.workspaceId,
      row,
      job,
      [...jobInvoices, ...jobChanges],
    );
    if (gapFinding) findings.push(gapFinding);

    for (const changeOrder of jobChanges) {
      const amount = changeOrder.payload.approvedAmountCents;
      const approved = approvedChangeStatuses.has(normalizedString(changeOrder.payload.status));
      const explicitlyUnbilled = explicitlyUnbilledStatuses.has(normalizedString(changeOrder.payload.billingStatus));
      const invoiceState = invoiceMatchState(input.reconciliation, changeOrder);
      const hasObservedBasis =
        approved &&
        changeOrder.payload.approvedAt &&
        typeof amount === "number" &&
        Number.isSafeInteger(amount) &&
        amount > 0 &&
        normalizedString(changeOrder.payload.currency).toUpperCase() === row.currency;

      if (hasObservedBasis && explicitlyUnbilled && invoiceState === null && row.state === "ELIGIBLE" && row.currency) {
        findings.push({
          additiveToExecutiveGap: false,
          calculationInputs: { approvedAmountCents: amount },
          category: "FINANCIAL",
          changeOrderExternalId: changeOrder.externalId,
          confidence: "HIGH",
          currency: row.currency,
          evidence: evidence(changeOrder, [
            "status",
            "billingStatus",
            "approvedAmountCents",
            "approvedAt",
            "currency",
            "description",
          ]),
          family: "REVENUE_REALIZATION",
          fingerprint: fingerprint(
            input.workspaceId,
            "APPROVED_CHANGE_ORDER_NOT_BILLED",
            row.jobExternalId,
            changeOrder.externalId,
          ),
          formula: "observed approved change-order amount with explicit unbilled status",
          jobExternalId: row.jobExternalId,
          priority: amount >= 25_000_00 ? 92 : 82,
          reason: "The source marks this approved change order as unbilled and provides no invoice link.",
          recommendedAction: "Confirm the billing status in the source system before issuing or correcting an invoice.",
          severity: severityForAmount(amount),
          status: "OPEN",
          type: "APPROVED_CHANGE_ORDER_NOT_BILLED",
          urgency: amount >= 25_000_00 ? "HIGH" : "MEDIUM",
          valueBasis: "OBSERVED",
          valueCents: amount,
        });
      }
    }

    const targetGrossMarginBps = job.payload.targetGrossMarginBps;
    if (
      row.state === "ELIGIBLE" &&
      row.currency &&
      typeof targetGrossMarginBps === "number" &&
      Number.isSafeInteger(targetGrossMarginBps) &&
      targetGrossMarginBps >= 0 &&
      targetGrossMarginBps <= 10_000 &&
      row.invoicedCents !== null &&
      row.invoicedCents > 0 &&
      row.observedCostCents !== null
    ) {
      const observedGrossProfitCents = row.invoicedCents - row.observedCostCents;
      const targetGrossProfitCents = Math.round((row.invoicedCents * targetGrossMarginBps) / 10_000);
      const marginAtRiskCents = Math.max(targetGrossProfitCents - observedGrossProfitCents, 0);
      if (marginAtRiskCents > 0) {
        findings.push({
          additiveToExecutiveGap: false,
          calculationInputs: {
            invoicedCents: row.invoicedCents,
            observedCostCents: row.observedCostCents,
            observedGrossProfitCents,
            targetGrossMarginBps,
            targetGrossProfitCents,
          },
          category: "FINANCIAL",
          changeOrderExternalId: null,
          confidence: "HIGH",
          currency: row.currency,
          evidence: [
            ...evidence(job, ["targetGrossMarginBps", "currency"]),
            ...jobInvoices.flatMap((record) => evidence(record, ["status", "amountCents", "currency"])),
            ...jobCosts.flatMap((record) => evidence(record, ["amountCents", "currency", "category"])),
          ],
          family: "REVENUE_REALIZATION",
          fingerprint: fingerprint(input.workspaceId, "MARGIN_AT_RISK", row.jobExternalId),
          formula: "target gross profit at observed invoice revenue − observed invoice revenue + observed job costs",
          jobExternalId: row.jobExternalId,
          priority: marginAtRiskCents >= 25_000_00 ? 90 : 76,
          reason: "Observed invoice revenue and matched job costs produce a gross-margin basis below the imported target.",
          recommendedAction: "Review cost and invoice completeness before treating the calculated shortfall as a margin decision.",
          severity: severityForAmount(marginAtRiskCents),
          status: "OPEN",
          type: "MARGIN_AT_RISK",
          urgency: marginAtRiskCents >= 25_000_00 ? "HIGH" : "MEDIUM",
          valueBasis: "CALCULATED",
          valueCents: marginAtRiskCents,
        });
      }
    }

    const completed = completedJobStatuses.has(normalizedString(job.payload.status));
    const hasScopeText =
      typeof job.payload.notes === "string" &&
      scopeTextPatterns.some((pattern) => pattern.test(job.payload.notes as string));
    if (completed && changeOrders.length > 0 && jobChanges.length === 0 && job.payload.scopeChangeFlag === true) {
      findings.push({
        additiveToExecutiveGap: false,
        calculationInputs: {},
        category: "OPERATIONAL",
        changeOrderExternalId: null,
        confidence: "HIGH",
        currency: row.currency ?? (normalizedString(job.payload.currency).toUpperCase() || "USD"),
        evidence: evidence(job, ["status", "scopeChangeFlag", "notes"]),
        family: "REVENUE_REALIZATION",
        fingerprint: fingerprint(input.workspaceId, "SUSPECTED_MISSING_CHANGE_ORDER", row.jobExternalId),
        formula: null,
        jobExternalId: row.jobExternalId,
        priority: 72,
        reason: "The completed job explicitly flags a scope change, but no change-order record links to it.",
        recommendedAction: "Review the source job and change-order export; add or link evidence before assigning any financial value.",
        severity: "MEDIUM",
        status: "OPEN",
        type: "SUSPECTED_MISSING_CHANGE_ORDER",
        urgency: "MEDIUM",
        valueBasis: "OPERATIONAL",
        valueCents: null,
      });
    } else if (completed && changeOrders.length > 0 && jobChanges.length === 0 && hasScopeText) {
      findings.push({
        additiveToExecutiveGap: false,
        calculationInputs: {},
        category: "OPERATIONAL",
        changeOrderExternalId: null,
        confidence: "MEDIUM",
        currency: row.currency ?? (normalizedString(job.payload.currency).toUpperCase() || "USD"),
        evidence: evidence(job, ["status", "notes"]),
        family: "REVENUE_REALIZATION",
        fingerprint: fingerprint(input.workspaceId, "SCOPE_CREEP_REVIEW_CANDIDATE", row.jobExternalId),
        formula: null,
        jobExternalId: row.jobExternalId,
        priority: 58,
        reason: "Job notes contain a bounded scope-change phrase, but no linked change-order evidence.",
        recommendedAction: "Human review is required; text alone does not prove approval, performed work or a financial gap.",
        severity: "LOW",
        status: "OPEN",
        type: "SCOPE_CREEP_REVIEW_CANDIDATE",
        urgency: "LOW",
        valueBasis: "OPERATIONAL",
        valueCents: null,
      });
    }
  }

  return findings.sort(
    (left, right) =>
      right.priority - left.priority ||
      (right.valueCents ?? 0) - (left.valueCents ?? 0) ||
      left.fingerprint.localeCompare(right.fingerprint),
  );
}

export function summarizeRevenueRealizationFindings(
  findings: readonly Pick<
    RevenueRealizationFindingContract,
    "additiveToExecutiveGap" | "category" | "currency" | "type" | "valueCents"
  >[],
): RevenueRealizationFindingSummary {
  const currencies = [...new Set(findings.filter((finding) => finding.category === "FINANCIAL").map((finding) => finding.currency))];
  const currency = currencies.length === 1 ? currencies[0] : null;
  const canAggregate = currency !== null;
  return {
    activeCount: findings.length,
    approvedChangeOrderReviewCents: canAggregate ? findings
      .filter((finding) => finding.type === "APPROVED_CHANGE_ORDER_NOT_BILLED")
      .reduce((sum, finding) => sum + (finding.valueCents ?? 0), 0) : null,
    calculatedUnderbillingCents: canAggregate ? findings
      .filter((finding) => finding.type === "UNDERBILLING_GAP" && finding.additiveToExecutiveGap)
      .reduce((sum, finding) => sum + (finding.valueCents ?? 0), 0) : null,
    currency,
    financialCount: findings.filter((finding) => finding.category === "FINANCIAL").length,
    hasMixedCurrencies: currencies.length > 1,
    marginAtRiskCents: canAggregate ? findings
      .filter((finding) => finding.type === "MARGIN_AT_RISK")
      .reduce((sum, finding) => sum + (finding.valueCents ?? 0), 0) : null,
    operationalCount: findings.filter((finding) => finding.category === "OPERATIONAL").length,
  };
}
