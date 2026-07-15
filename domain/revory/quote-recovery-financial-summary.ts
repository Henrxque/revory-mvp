export type QuoteRecoveryExposureFinding = {
  currency?: unknown;
  estimateExternalId?: unknown;
  fingerprint?: unknown;
  id?: unknown;
  valueBasis?: unknown;
  valueCents?: unknown;
};

export type QuoteRecoveryExposureAnnotation = {
  countedInEstimatedTotal: boolean;
  estimatedTotalContributionCents: number | null;
};

export type QuoteRecoveryFinancialSummary = {
  annotations: QuoteRecoveryExposureAnnotation[];
  estimatedValueCents: number | null;
  financialCount: number;
  hasConflictingEstimateValues: boolean;
  hasMixedCurrencies: boolean;
  reportingCurrency: string;
};

type Candidate = {
  currency: string;
  estimateKey: string;
  index: number;
  valueCents: number;
};

function cleanCurrency(value: unknown, fallbackCurrency: string) {
  const candidate = typeof value === "string" ? value.trim().toUpperCase() : "";
  return candidate || fallbackCurrency;
}

function cleanFallbackCurrency(value: unknown) {
  const candidate = typeof value === "string" ? value.trim().toUpperCase() : "";
  return candidate || "USD";
}

function estimateKey(finding: QuoteRecoveryExposureFinding, index: number) {
  const externalId = typeof finding.estimateExternalId === "string"
    ? finding.estimateExternalId.trim()
    : "";
  if (externalId) return externalId;

  const stableFallback = [finding.fingerprint, finding.id]
    .find((value) => typeof value === "string" && value.trim());
  return stableFallback ? `unlinked:${String(stableFallback).trim()}` : `unlinked-index:${index}`;
}

/**
 * Summarizes modeled Quote Recovery exposure once per estimate.
 *
 * A single estimate can trigger several rules, but those rules do not create
 * additional dollars. Conflicting values for one estimate or incompatible
 * currencies suppress the aggregate instead of selecting a convenient value.
 */
export function summarizeQuoteRecoveryFinancialExposure(
  findings: readonly QuoteRecoveryExposureFinding[],
  fallbackCurrency = "USD",
): QuoteRecoveryFinancialSummary {
  const normalizedFallbackCurrency = cleanFallbackCurrency(fallbackCurrency);
  const candidates: Candidate[] = [];

  findings.forEach((finding, index) => {
    if (
      finding.valueBasis !== "ESTIMATED"
      || typeof finding.valueCents !== "number"
      || !Number.isSafeInteger(finding.valueCents)
    ) return;

    candidates.push({
      currency: cleanCurrency(finding.currency, normalizedFallbackCurrency),
      estimateKey: estimateKey(finding, index),
      index,
      valueCents: finding.valueCents,
    });
  });

  const byEstimate = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const current = byEstimate.get(candidate.estimateKey) ?? [];
    current.push(candidate);
    byEstimate.set(candidate.estimateKey, current);
  }

  const estimateExposures = [...byEstimate.values()].map((group) => ({
    currencies: new Set(group.map((candidate) => candidate.currency)),
    group,
    values: new Set(group.map((candidate) => candidate.valueCents)),
  }));
  const hasConflictingEstimateValues = estimateExposures.some(
    (exposure) => exposure.currencies.size > 1 || exposure.values.size > 1,
  );
  const financialCurrencies = new Set(
    estimateExposures.flatMap((exposure) => [...exposure.currencies]),
  );
  const hasMixedCurrencies = financialCurrencies.size > 1;
  const aggregateIsSafe = !hasConflictingEstimateValues && !hasMixedCurrencies;
  const reportingCurrency = [...financialCurrencies][0] ?? normalizedFallbackCurrency;
  const annotations = findings.map<QuoteRecoveryExposureAnnotation>(() => ({
    countedInEstimatedTotal: false,
    estimatedTotalContributionCents: aggregateIsSafe ? 0 : null,
  }));

  let estimatedValueCents = 0;
  if (aggregateIsSafe) {
    for (const exposure of estimateExposures) {
      const representative = exposure.group[0];
      estimatedValueCents += representative.valueCents;
      annotations[representative.index] = {
        countedInEstimatedTotal: true,
        estimatedTotalContributionCents: representative.valueCents,
      };
    }
  }

  return {
    annotations,
    estimatedValueCents: aggregateIsSafe ? estimatedValueCents : null,
    financialCount: byEstimate.size,
    hasConflictingEstimateValues,
    hasMixedCurrencies,
    reportingCurrency,
  };
}
