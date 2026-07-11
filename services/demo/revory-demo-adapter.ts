import type {
  RevenueLeakType,
} from "@prisma/client";

import type { DailyLeakBriefRead } from "@/services/revenue-leaks/get-daily-leak-brief-read";
import type {
  ExecutiveRevenueLeakSummaryLeak,
  ExecutiveRevenueLeakSummaryRead,
} from "@/services/revenue-leaks/get-executive-revenue-leak-summary-read";
import type { RevenueLeakListItem } from "@/services/revenue-leaks/get-revenue-leak-list";
import type {
  RevenueLeakRead,
  RevenueLeakReadItem,
} from "@/services/revenue-leaks/get-revenue-leak-read";
import type { RevoryCsvTriageReviewState } from "@/types/imports";
import { buildRevenueLeakConfidenceCopy } from "@/services/revenue-leaks/revenue-leak-confidence-copy";
import { getRevenueLeakCategory } from "@/services/revenue-leaks/revenue-leak-category";
import { getRevenueLeakTypeLabel } from "@/services/revenue-leaks/revenue-leak-labels";

import {
  REVORY_DEMO_READ,
  type RevoryDemoRisk,
} from "./revory-demo-fixture";

const detectedAt = new Date(REVORY_DEMO_READ.generatedAt);
const sourceWindowStart = new Date("2026-06-03T00:00:00.000Z");
const sourceWindowEnd = new Date(REVORY_DEMO_READ.generatedAt);

const leakTypeByRiskId: Record<string, RevenueLeakType> = {
  "booking-path-blocked": "BOOKING_PATH_BLOCKED",
  "canceled-not-recovered": "CANCELED_NOT_RECOVERED",
  "missing-contact": "MISSING_CONTACT",
  "no-show-revenue-risk": "NO_SHOW_REVENUE",
  "stale-incomplete-evidence": "STALE_BOOKED_PROOF",
};

const shortSignalsByRiskId: Record<string, string[]> = {
  "booking-path-blocked": ["path BLOCKED", "contact present"],
  "canceled-not-recovered": ["2 unrecovered", "1 rebooking excluded", "direct values"],
  "missing-contact": ["contact absent", "1 blocked record"],
  "no-show-revenue-risk": ["3 NO_SHOW rows", "2 direct values", "1 value missing"],
  "stale-incomplete-evidence": ["21-day-old export", "1 value missing", "1 provider missing"],
};

function formatMoney(valueCents: number | null) {
  if (valueCents === null) {
    return "Value pending";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(valueCents / 100);
}

function formatEnumLabel(value: string) {
  const normalized = value.toLowerCase();

  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

function getCategoryLabel(leakType: RevenueLeakType) {
  switch (getRevenueLeakCategory(leakType)) {
    case "FINANCIAL_LEAK":
      return "Financial leak";
    case "OPERATIONAL_RISK":
      return "Operational risk";
    case "DATA_QUALITY_RISK":
      return "Data-quality risk";
  }
}

function mapRiskToListItem(risk: RevoryDemoRisk): RevenueLeakListItem {
  const leakType = leakTypeByRiskId[risk.id];
  const category = getRevenueLeakCategory(leakType);
  const typeLabel = getRevenueLeakTypeLabel(leakType);
  const evidenceSummary = {
    confidenceReason:
      risk.confidence === "HIGH"
        ? "The sample signal is backed by explicit structured fields."
        : "One financial field is missing, so the sample estimate remains usable but incomplete.",
    signals: shortSignalsByRiskId[risk.id] ?? [],
    sourceRecordIds: [],
    summary: risk.evidence[0] ?? risk.summary,
    valueSummary:
      category === "FINANCIAL_LEAK"
        ? "Direct estimated appointment value where available"
        : "No financial value assigned",
  };
  const confidenceCopy = buildRevenueLeakConfidenceCopy({
    confidence: risk.confidence,
    evidenceSummary,
  });

  return {
    category,
    categoryLabel: getCategoryLabel(leakType),
    confidence: risk.confidence,
    confidenceExplanation: confidenceCopy.explanation,
    confidenceLabel: confidenceCopy.label,
    contextLabel: `${risk.count} fictional sample ${risk.count === 1 ? "signal" : "signals"}`,
    currency: "USD",
    detectedAt,
    detectedAtLabel: "Jul 11, 2026",
    estimatedValueCents: risk.estimatedValueCents,
    estimatedValueIsCounted:
      category === "FINANCIAL_LEAK" && risk.estimatedValueCents !== null,
    estimatedValueLabel:
      category === "FINANCIAL_LEAK"
        ? formatMoney(risk.estimatedValueCents)
        : category === "OPERATIONAL_RISK"
          ? "Operational risk; not counted as revenue at risk"
          : "Data-quality risk; not counted as revenue at risk",
    evidenceSummary,
    fingerprint: `demo:${risk.id}`,
    id: `demo-${risk.id}`,
    leakType,
    providerName: null,
    reason: risk.summary,
    recommendedAction: risk.recommendedAction,
    relatedAppointment: null,
    relatedClient: null,
    relatedLeadBookingOpportunity: null,
    severity: risk.severity,
    severityLabel: `${formatEnumLabel(risk.severity)} severity`,
    shortLabel: typeLabel.shortLabel,
    sourceDataSource: null,
    sourceName: "revory-demo-appointments.csv",
    sourceWindowEnd,
    sourceWindowLabel: "Sample window: Jun 3–Jul 11, 2026",
    sourceWindowStart,
    status: "OPEN",
    statusLabel: "Open",
    typeDescription: typeLabel.description,
    typeLabel: typeLabel.label,
  };
}

const allRisks = [
  ...REVORY_DEMO_READ.financialLeaks,
  ...REVORY_DEMO_READ.operationalRisks,
  ...REVORY_DEMO_READ.dataQualityRisks,
];

export const REVORY_DEMO_LEAK_ITEMS = allRisks.map(mapRiskToListItem);

function mapListItemToDashboardItem(item: RevenueLeakListItem): RevenueLeakReadItem {
  return {
    category: item.category,
    confidence: item.confidence,
    currency: item.currency,
    detectedAt: item.detectedAt,
    estimatedValueCents:
      item.category === "FINANCIAL_LEAK" ? item.estimatedValueCents : null,
    estimatedValueLabel:
      item.category === "FINANCIAL_LEAK"
        ? item.estimatedValueLabel
        : "Not counted as revenue at risk",
    fingerprint: item.fingerprint,
    id: item.id,
    label: item.typeLabel,
    leakType: item.leakType,
    reason: item.reason,
    recommendedAction: item.recommendedAction,
    severity: item.severity,
    shortLabel: item.shortLabel,
    status: item.status,
  };
}

const dashboardItems = REVORY_DEMO_LEAK_ITEMS.map(mapListItemToDashboardItem);
const topFinancialLeak = dashboardItems.find(
  (item) => item.leakType === "CANCELED_NOT_RECOVERED",
) ?? null;
const topOperationalRisk = dashboardItems.find(
  (item) => item.leakType === "MISSING_CONTACT",
) ?? null;
const topDataQualityRisk = dashboardItems.find(
  (item) => item.leakType === "STALE_BOOKED_PROOF",
) ?? null;

export const REVORY_DEMO_DASHBOARD_READ: RevenueLeakRead = {
  activeDataQualityRiskCount: REVORY_DEMO_READ.dataQualityRisks.length,
  activeFinancialLeakCount: REVORY_DEMO_READ.financialLeaks.length,
  activeLeakCount: dashboardItems.length,
  activeOperationalRiskCount: REVORY_DEMO_READ.operationalRisks.length,
  confidenceSummary: {
    counts: { HIGH: 4, LOW: 0, MEDIUM: 1 },
    dominant: "HIGH",
    label: "high confidence",
  },
  dataFreshnessSummary: {
    hasStaleDataRisk: true,
    label: "Data may be stale",
    lastDetectedAt: detectedAt,
    note: topDataQualityRisk?.recommendedAction ?? "Refresh the sample evidence.",
    staleRiskCount: 1,
    topStaleRisk: topDataQualityRisk,
  },
  estimatedRevenueAtRiskCents: REVORY_DEMO_READ.estimatedRevenueAtRiskCents,
  estimatedRevenueAtRiskLabel: formatMoney(
    REVORY_DEMO_READ.estimatedRevenueAtRiskCents,
  ),
  lastDetectedAt: detectedAt,
  recommendedAction:
    topFinancialLeak?.recommendedAction ?? "Review the highest financial leak first.",
  severitySummary: {
    counts: { CRITICAL: 0, HIGH: 2, LOW: 1, MEDIUM: 2 },
    dominant: "HIGH",
    label: "high severity",
  },
  state: "HAS_REVENUE_AT_RISK",
  topDataQualityRisk,
  topFinancialLeak,
  topLeak: topFinancialLeak,
  topLeaks: dashboardItems,
  topOperationalRisk,
};

const primaryListItem = REVORY_DEMO_LEAK_ITEMS.find(
  (item) => item.leakType === "CANCELED_NOT_RECOVERED",
);

if (!primaryListItem) {
  throw new Error("REVORY demo requires an unrecovered cancellation fixture.");
}

export const REVORY_DEMO_DAILY_BRIEF_READ: DailyLeakBriefRead = {
  confidenceSeverityLabel: "HIGH / HIGH",
  detailHref: "#demo-leaks",
  estimatedValueCents: REVORY_DEMO_READ.estimatedRevenueAtRiskCents,
  estimatedValueLabel: formatMoney(REVORY_DEMO_READ.estimatedRevenueAtRiskCents),
  freshness: {
    label: "Data may be stale",
    note: "The fictional source snapshot is 21 days older than the sample read.",
    tone: "future",
  },
  headline: "Start with the revenue risk already visible.",
  honestyNote:
    "Estimated revenue at risk is not confirmed accounting loss. Operational and data-quality risks are kept separate from financial value.",
  primaryLeak: {
    categoryLabel: primaryListItem.categoryLabel,
    confidence: primaryListItem.confidence,
    confidenceLabel: primaryListItem.confidenceLabel,
    detailHref: "#demo-leaks",
    evidenceSummary: primaryListItem.evidenceSummary.summary,
    estimatedValueCents: primaryListItem.estimatedValueCents,
    estimatedValueLabel: primaryListItem.estimatedValueLabel,
    id: primaryListItem.id,
    label: primaryListItem.typeLabel,
    note: primaryListItem.reason,
    recommendedAction: primaryListItem.recommendedAction,
    severity: primaryListItem.severity,
    severityLabel: primaryListItem.severityLabel,
  },
  primarySignal: {
    label: "Estimated value",
    note: "Financial leak evidence only; not confirmed accounting loss.",
    tone: "accent",
    value: formatMoney(REVORY_DEMO_READ.estimatedRevenueAtRiskCents),
  },
  recommendedAction: primaryListItem.recommendedAction,
  signals: [
    {
      label: "Active signals",
      note: "Open fictional leak evidence.",
      tone: "accent",
      value: String(dashboardItems.length),
    },
    {
      label: "Financial / operational",
      note: "Operational risks stay separate from estimated value.",
      tone: "accent",
      value: "2 / 2",
    },
    {
      label: "Confidence / severity",
      note: "1 data-quality risk visible.",
      tone: "future",
      value: "HIGH / HIGH",
    },
  ],
  state: "HAS_FINANCIAL_LEAK",
  stateLabel: "Risk visible",
  summary:
    "5 active signals are visible. REVORY only counts financial leak evidence toward estimated revenue at risk.",
  tone: "accent",
};

function mapListItemToExecutiveLeak(
  item: RevenueLeakListItem,
): ExecutiveRevenueLeakSummaryLeak {
  return {
    category: item.category,
    categoryLabel: item.categoryLabel,
    confidence: item.confidence,
    confidenceExplanation: item.confidenceExplanation,
    confidenceLabel: item.confidenceLabel,
    detectedAtLabel: item.detectedAtLabel,
    estimatedValueCents:
      item.category === "FINANCIAL_LEAK" ? item.estimatedValueCents : null,
    estimatedValueLabel:
      item.category === "FINANCIAL_LEAK"
        ? item.estimatedValueLabel
        : "Not counted",
    evidenceSummary: item.evidenceSummary,
    id: item.id,
    label: item.typeLabel,
    note: item.reason,
    recommendedAction: item.recommendedAction,
    severity: item.severity,
    severityLabel: item.severityLabel,
    shortLabel: item.shortLabel,
  };
}

const executiveLeaks = REVORY_DEMO_LEAK_ITEMS.map(mapListItemToExecutiveLeak);

function filterExecutiveLeaks(category: RevenueLeakListItem["category"]) {
  return executiveLeaks.filter((item) => item.category === category);
}

export const REVORY_DEMO_EXECUTIVE_READ: ExecutiveRevenueLeakSummaryRead = {
  activeDataQualityRiskCount: REVORY_DEMO_READ.dataQualityRisks.length,
  activeFinancialLeakCount: REVORY_DEMO_READ.financialLeaks.length,
  activeOperationalRiskCount: REVORY_DEMO_READ.operationalRisks.length,
  confidenceSummary: {
    counts: { HIGH: 4, LOW: 0, MEDIUM: 1 },
    dominant: "HIGH",
    label: "High confidence",
    note: "Four sample signals use explicit structured evidence; one is limited by a missing value.",
  },
  copyableSummary:
    "Asteria Aesthetics sample read: $3,500 estimated revenue at risk from fictional data.",
  dataFreshnessSummary: {
    hasStaleDataRisk: true,
    label: "Data may be stale",
    note: "The fictional source snapshot is 21 days older than this sample read.",
    staleRiskCount: 1,
    tone: "future",
  },
  estimatedRevenueAtRiskCents: REVORY_DEMO_READ.estimatedRevenueAtRiskCents,
  estimatedRevenueAtRiskLabel: formatMoney(
    REVORY_DEMO_READ.estimatedRevenueAtRiskCents,
  ),
  generatedAt: detectedAt,
  headline: "The largest sample risk is an unrecovered cancellation.",
  honestyNote:
    "Estimated revenue at risk is based on fictional sample evidence, not confirmed accounting loss.",
  printSections: [],
  recommendedExecutiveAction: primaryListItem.recommendedAction,
  severitySummary: {
    counts: { CRITICAL: 0, HIGH: 2, LOW: 1, MEDIUM: 2 },
    dominant: "HIGH",
    label: "High severity",
    note: "Two financial leak groups are prioritized as high severity in this fictional read.",
  },
  state: "HAS_REVENUE_AT_RISK",
  summary:
    "Financial leaks total $3,500 in estimated revenue at risk. Operational and data-quality risks remain separate.",
  title: "Executive Revenue Leak Summary",
  topDataQualityRisks: filterExecutiveLeaks("DATA_QUALITY_RISK"),
  topFinancialLeaks: filterExecutiveLeaks("FINANCIAL_LEAK"),
  topOperationalRisks: filterExecutiveLeaks("OPERATIONAL_RISK"),
  workspaceId: "demo-static",
};

export const REVORY_DEMO_DATA_QUALITY_TRIAGE: RevoryCsvTriageReviewState = {
  columnMapping: {},
  confidence: "MEDIUM",
  detectedDatasetType: "APPOINTMENTS",
  importSupported: true,
  mappingConfidence: 84,
  matchesSelectedTemplate: true,
  missingFields: ["estimatedRevenue on 1 no-show", "providerName on 1 appointment"],
  mode: "DETERMINISTIC_FALLBACK",
  probableSourceFormat: "REVORY fictional sample",
  qualityScore: 84,
  qualityState: "REVIEW_REQUIRED",
  reviewRequired: true,
  status: "ready",
  supportedLeaks: [
    "NO_SHOW_REVENUE",
    "CANCELED_NOT_RECOVERED",
    "MISSING_CONTACT",
    "BOOKING_PATH_BLOCKED",
    "STALE_BOOKED_PROOF",
  ],
  warnings: [
    "The fictional source snapshot is 21 days older than this sample read.",
    "One canceled appointment has a future rebooking and is excluded from active leak value.",
  ],
};
