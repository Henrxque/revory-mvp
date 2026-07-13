import { createHash } from "node:crypto";

import type { CanonicalEntityType, CanonicalRecordContract } from "@/domain/revory/contracts";
import type {
  ExplicitRecordMatch,
  JobBillingReconciliation,
  ReconciliationInput,
  RevenueRealizationRead,
} from "@/domain/revory/revenue-realization";

const relationTargets: Record<string, CanonicalEntityType> = {
  customerExternalId: "CUSTOMER",
  estimateExternalId: "ESTIMATE",
  invoiceExternalId: "INVOICE",
  jobExternalId: "JOB",
  leadExternalId: "LEAD",
};

const completedJobStatuses = new Set(["closed", "complete", "completed", "finished"]);
const billedInvoiceStatuses = new Set(["issued", "sent", "open", "paid", "partial", "overdue", "unpaid"]);
const excludedInvoiceStatuses = new Set(["cancelled", "canceled", "draft", "void"]);
const approvedChangeStatuses = new Set(["accepted", "approved"]);
const nonApprovedChangeStatuses = new Set(["cancelled", "canceled", "declined", "draft", "pending", "rejected", "void"]);

function recordKey(record: CanonicalRecordContract) {
  return `${record.entityType}:${record.sourceSystem}:${record.externalId}`;
}

function normalizedString(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function money(record: CanonicalRecordContract, field: string) {
  const value = record.payload[field];
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function currency(record: CanonicalRecordContract) {
  const value = record.payload.currency;
  return typeof value === "string" && /^[A-Za-z]{3}$/.test(value.trim())
    ? value.trim().toUpperCase()
    : null;
}

function evidence(record: CanonicalRecordContract, field: string, valueCents: number): ReconciliationInput {
  return { externalId: record.externalId, field, provenance: record.provenance, valueCents };
}

function unique(values: readonly string[]) {
  return [...new Set(values)];
}

function stableObject(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

export function revenueRealizationStateFingerprint(records: readonly CanonicalRecordContract[]) {
  const state = records.map((record) => ({
    entityType: record.entityType,
    externalId: record.externalId,
    occurredAt: record.occurredAt,
    payload: stableObject(record.payload),
    relations: stableObject(record.relationExternalIds),
    sourceSystem: record.sourceSystem,
    workspaceId: record.workspaceId,
  })).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return createHash("sha256").update(JSON.stringify(state)).digest("hex");
}

export function revenueRealizationReadIntegrityFingerprint(
  read: Omit<RevenueRealizationRead, "integrityFingerprint">,
) {
  return createHash("sha256").update(JSON.stringify(read)).digest("hex");
}

function isFutureDate(value: unknown, asOf: Date) {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return !Number.isNaN(date.valueOf()) && date.valueOf() > asOf.valueOf();
}

export function buildRevenueRealizationRead(
  records: readonly CanonicalRecordContract[],
  asOf = new Date(),
): RevenueRealizationRead {
  const workspaceIds = unique(records.map((record) => record.workspaceId));
  if (workspaceIds.length !== 1 || !workspaceIds[0]) {
    throw new Error("Revenue Realization requires records from exactly one authorized workspace.");
  }

  const index = new Map<string, CanonicalRecordContract[]>();
  for (const record of records) {
    const key = `${record.entityType}:${record.externalId}`;
    index.set(key, [...(index.get(key) ?? []), record]);
  }

  const matches: ExplicitRecordMatch[] = [];
  const matchBySourceAndField = new Map<string, ExplicitRecordMatch>();
  for (const record of records) {
    for (const [relationField, targetExternalId] of Object.entries(record.relationExternalIds)) {
      const targetEntityType = relationTargets[relationField];
      if (!targetEntityType || !targetExternalId.trim()) continue;
      const candidates = index.get(`${targetEntityType}:${targetExternalId}`) ?? [];
      const state = candidates.length === 1 ? "MATCHED" : candidates.length === 0 ? "UNMATCHED" : "CONFLICT";
      const match: ExplicitRecordMatch = {
        candidateRecordKeys: candidates.map(recordKey),
        reason:
          state === "MATCHED"
            ? "One explicit external ID resolved to one canonical record."
            : state === "UNMATCHED"
              ? "The explicit external ID has no canonical target in this workspace."
              : "The explicit external ID resolves to multiple source records and is ambiguous.",
        relationField,
        sourceEntityType: record.entityType,
        sourceExternalId: record.externalId,
        sourceRecordKey: recordKey(record),
        state,
        targetEntityType,
        targetExternalId,
      };
      matches.push(match);
      matchBySourceAndField.set(`${recordKey(record)}:${relationField}`, match);
    }
  }

  const recordsOf = (entityType: CanonicalEntityType) =>
    records.filter((record) => record.entityType === entityType);
  const jobs = recordsOf("JOB");
  const invoices = recordsOf("INVOICE");
  const changeOrders = recordsOf("CHANGE_ORDER");
  const costs = recordsOf("COST");
  const duplicateEntityIds = new Set(
    [...records.reduce((counts, record) => {
      const key = `${record.entityType}:${record.externalId}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts;
    }, new Map<string, number>()).entries()].filter(([, count]) => count > 1).map(([key]) => key),
  );

  const byMatchedJob = (source: readonly CanonicalRecordContract[]) => source.reduce((groups, record) => {
    const match = matchBySourceAndField.get(`${recordKey(record)}:jobExternalId`);
    if (match?.state !== "MATCHED" || !match.candidateRecordKeys[0]) return groups;
    const current = groups.get(match.candidateRecordKeys[0]) ?? [];
    current.push(record);
    groups.set(match.candidateRecordKeys[0], current);
    return groups;
  }, new Map<string, CanonicalRecordContract[]>());
  const invoicesByJob = byMatchedJob(invoices);
  const changesByJob = byMatchedJob(changeOrders);
  const costsByJob = byMatchedJob(costs);

  const reconciliations: JobBillingReconciliation[] = jobs.map((job) => {
    const jobInvoices = invoicesByJob.get(recordKey(job)) ?? [];
    const jobChanges = changesByJob.get(recordKey(job)) ?? [];
    const jobCosts = costsByJob.get(recordKey(job)) ?? [];
    const issues: string[] = [];
    const marginIssues: string[] = [];
    const inputEvidence: ReconciliationInput[] = [];
    const jobCurrency = currency(job);
    const contractValueCents = money(job, "contractValueCents");
    const includesApprovedChanges = job.payload.contractValueIncludesApprovedChanges;
    const invoiceExportComplete = job.payload.invoiceExportComplete === true;
    const changeOrderExportComplete = job.payload.changeOrderExportComplete === true;
    const costExportComplete = job.payload.costExportComplete === true;

    if (!completedJobStatuses.has(normalizedString(job.payload.status))) {
      issues.push("Job status does not prove completion; billing-gap calculation is suppressed.");
    }
    if (contractValueCents === null) issues.push("Observed job contract value is missing or invalid.");
    if (!jobCurrency) issues.push("Job currency is missing or invalid.");
    if (typeof includesApprovedChanges !== "boolean") {
      issues.push("Job must state whether contract value includes approved changes.");
    }
    if (!invoiceExportComplete) issues.push("Job-level invoice export completeness is not explicitly confirmed.");
    if (includesApprovedChanges === false && !changeOrderExportComplete) {
      issues.push("Job-level change-order export completeness is required when contract value excludes approved changes.");
    }
    if (isFutureDate(job.payload.completedAt, asOf)) issues.push("Job completion date is in the future.");
    if (duplicateEntityIds.has(`JOB:${job.externalId}`)) issues.push("Job external ID appears in more than one source system.");

    const invoiceValues: Array<{ record: CanonicalRecordContract; value: number }> = [];
    for (const invoice of jobInvoices) {
      const status = normalizedString(invoice.payload.status);
      if (excludedInvoiceStatuses.has(status)) continue;
      if (!billedInvoiceStatuses.has(status)) {
        issues.push(`Invoice ${invoice.externalId} has an unsupported billing status.`);
        continue;
      }
      const value = money(invoice, "amountCents");
      if (value === null) {
        issues.push(`Invoice ${invoice.externalId} has no valid observed amount.`);
        continue;
      }
      if (!currency(invoice) || currency(invoice) !== jobCurrency) {
        issues.push(`Invoice ${invoice.externalId} has missing or conflicting currency.`);
        continue;
      }
      if (isFutureDate(invoice.payload.issuedAt, asOf)) {
        issues.push(`Invoice ${invoice.externalId} is dated in the future.`);
        continue;
      }
      if (duplicateEntityIds.has(`INVOICE:${invoice.externalId}`)) {
        issues.push(`Invoice ${invoice.externalId} appears in more than one source system.`);
        continue;
      }
      invoiceValues.push({ record: invoice, value });
    }

    const approvedChanges: Array<{ record: CanonicalRecordContract; value: number }> = [];
    for (const changeOrder of jobChanges) {
      const status = normalizedString(changeOrder.payload.status);
      if (nonApprovedChangeStatuses.has(status)) continue;
      if (!approvedChangeStatuses.has(status)) {
        issues.push(`Change order ${changeOrder.externalId} has an unsupported approval status.`);
        continue;
      }
      const value = money(changeOrder, "approvedAmountCents");
      if (value === null || !changeOrder.payload.approvedAt) {
        issues.push(`Change order ${changeOrder.externalId} lacks observed approval evidence.`);
        continue;
      }
      if (isFutureDate(changeOrder.payload.approvedAt, asOf)) {
        issues.push(`Change order ${changeOrder.externalId} is approved in the future.`);
        continue;
      }
      if (duplicateEntityIds.has(`CHANGE_ORDER:${changeOrder.externalId}`)) {
        issues.push(`Change order ${changeOrder.externalId} appears in more than one source system.`);
        continue;
      }
      if (!currency(changeOrder) || currency(changeOrder) !== jobCurrency) {
        issues.push(`Change order ${changeOrder.externalId} has missing or conflicting currency.`);
        continue;
      }
      approvedChanges.push({ record: changeOrder, value });
    }

    const relationConflicts = matches.filter(
      (match) =>
        match.targetEntityType === "JOB" &&
        match.targetExternalId === job.externalId &&
        match.state === "CONFLICT" &&
        match.candidateRecordKeys.includes(recordKey(job)),
    );
    if (relationConflicts.length) {
      issues.push("At least one job link is ambiguous across source records.");
    }

    const observedCostValues: Array<{ record: CanonicalRecordContract; value: number }> = [];
    if (!costExportComplete) marginIssues.push("Job-level cost export completeness is not explicitly confirmed.");
    for (const cost of jobCosts) {
      const value = money(cost, "amountCents");
      if (value === null) { marginIssues.push(`Cost ${cost.externalId} has no valid observed amount.`); continue; }
      if (!currency(cost) || currency(cost) !== jobCurrency) { marginIssues.push(`Cost ${cost.externalId} has missing or conflicting currency.`); continue; }
      if (isFutureDate(cost.payload.incurredAt, asOf)) { marginIssues.push(`Cost ${cost.externalId} is dated in the future.`); continue; }
      if (duplicateEntityIds.has(`COST:${cost.externalId}`)) { marginIssues.push(`Cost ${cost.externalId} appears in more than one source system.`); continue; }
      observedCostValues.push({ record: cost, value });
    }

    if (contractValueCents !== null) inputEvidence.push(evidence(job, "contractValueCents", contractValueCents));
    for (const item of invoiceValues) inputEvidence.push(evidence(item.record, "amountCents", item.value));
    for (const item of approvedChanges) inputEvidence.push(evidence(item.record, "approvedAmountCents", item.value));
    for (const item of observedCostValues) inputEvidence.push(evidence(item.record, "amountCents", item.value));

    const uniqueIssues = unique(issues);
    const eligible = uniqueIssues.length === 0 && contractValueCents !== null;
    const invoicedCents = invoiceExportComplete
      ? invoiceValues.reduce((sum, item) => sum + item.value, 0)
      : null;
    const approvedChangeOrderCents = changeOrderExportComplete
      ? approvedChanges.reduce((sum, item) => sum + item.value, 0)
      : null;
    const expectedBillingCents = eligible
      ? contractValueCents + (includesApprovedChanges === false ? approvedChangeOrderCents ?? 0 : 0)
      : null;
    const uniqueMarginIssues = unique(marginIssues);
    const observedCostCents = uniqueMarginIssues.length === 0
      ? observedCostValues.reduce((sum, item) => sum + item.value, 0)
      : null;

    return {
      approvedChangeOrderCents,
      approvedChangeOrderIds: approvedChanges.map((item) => item.record.externalId),
      billedLessObservedCostCents:
        invoicedCents !== null && observedCostCents !== null ? invoicedCents - observedCostCents : null,
      calculatedGapCents:
        expectedBillingCents !== null && invoicedCents !== null
          ? Math.max(expectedBillingCents - invoicedCents, 0)
          : null,
      contractValueIncludesApprovedChanges: typeof includesApprovedChanges === "boolean" ? includesApprovedChanges : null,
      currency: jobCurrency,
      costIds: observedCostValues.map((item) => item.record.externalId),
      expectedBillingCents,
      formula: eligible
        ? includesApprovedChanges
          ? "observed contract value − observed eligible invoice total"
          : "observed contract value + observed approved changes − observed eligible invoice total"
        : null,
      inputEvidence,
      invoiceIds: invoiceValues.map((item) => item.record.externalId),
      invoicedCents,
      issues: uniqueIssues,
      jobExternalId: job.externalId,
      marginEligible: eligible && uniqueMarginIssues.length === 0,
      marginIssues: uniqueMarginIssues,
      observedCostCents,
      state: eligible ? "ELIGIBLE" : "SUPPRESSED",
      valueBasis: eligible ? "CALCULATED" : "DATA_QUALITY",
    };
  });

  const eligibleJobs = reconciliations.filter((row) => row.state === "ELIGIBLE").length;
  const hasApprovedBasis = reconciliations.some((row) => (row.approvedChangeOrderCents ?? 0) > 0);
  const hasCostBasis = reconciliations.some((row) => row.billedLessObservedCostCents !== null);
  const eligibility = {
    APPROVED_CHANGE_ORDER_BASIS: {
      eligible: hasApprovedBasis,
      missingFields: hasApprovedBasis ? [] : ["matched approved change order evidence"],
    },
    COST_REVENUE_BASIS: {
      eligible: hasCostBasis,
      missingFields: hasCostBasis ? [] : ["matched invoice and observed cost basis"],
    },
    JOB_BILLING_RECONCILIATION: {
      eligible: eligibleJobs > 0,
      missingFields: eligibleJobs > 0 ? [] : ["one unambiguous, completed and currency-consistent job basis"],
    },
  };

  const recordCounts = Object.fromEntries(
    (["CUSTOMER", "LEAD", "ESTIMATE", "ACTIVITY", "JOB", "INVOICE", "CHANGE_ORDER", "COST"] as const).map(
      (entityType) => [entityType, recordsOf(entityType).length],
    ),
  ) as Record<CanonicalEntityType, number>;

  const read: Omit<RevenueRealizationRead, "integrityFingerprint"> = {
    eligibility,
    matches,
    reconciliations,
    summary: {
      conflictLinks: matches.filter((match) => match.state === "CONFLICT").length,
      eligibleJobs,
      matchedLinks: matches.filter((match) => match.state === "MATCHED").length,
      recordCounts,
      suppressedJobs: reconciliations.length - eligibleJobs,
      unmatchedLinks: matches.filter((match) => match.state === "UNMATCHED").length,
    },
    stateFingerprint: revenueRealizationStateFingerprint(records),
    workspaceId: workspaceIds[0],
  };
  return { ...read, integrityFingerprint: revenueRealizationReadIntegrityFingerprint(read) };
}
