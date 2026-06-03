import "server-only";

import type {
  RevenueLeakConfidence,
  RevenueLeakSeverity,
  RevenueLeakStatus,
  RevenueLeakType,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { buildRevenueLeakConfidenceCopy } from "@/services/revenue-leaks/revenue-leak-confidence-copy";
import {
  buildRevenueLeakEvidenceSummary,
  type RevenueLeakEvidenceSummary,
} from "@/services/revenue-leaks/revenue-leak-evidence-summary";
import { getRevenueLeakCategory } from "@/services/revenue-leaks/revenue-leak-category";
import { canContributeToEstimatedRevenueAtRisk } from "@/services/revenue-leaks/revenue-leak-guards";
import { getRevenueLeakTypeLabel } from "@/services/revenue-leaks/revenue-leak-labels";
import type { RevenueLeakCategory } from "@/types/revenue-leak";

export type RevenueLeakListFilter =
  | "ALL_ACTIVE"
  | "DATA_QUALITY"
  | "DISMISSED"
  | "FINANCIAL"
  | "HIGH_SEVERITY"
  | "LOW_CONFIDENCE"
  | "OPERATIONAL"
  | "RESOLVED";

export type RevenueLeakListRelatedClient = {
  displayName: string;
  email: string | null;
  id: string;
  phone: string | null;
};

export type RevenueLeakListRelatedAppointment = {
  estimatedRevenueLabel: string;
  id: string;
  scheduledAt: Date;
  scheduledAtLabel: string;
  serviceName: string | null;
  status: string;
};

export type RevenueLeakListRelatedLeadBookingOpportunity = {
  blockingReason: string | null;
  id: string;
  nextAction: string | null;
  status: string;
};

export type RevenueLeakListSourceDataSource = {
  id: string;
  lastImportedAt: Date | null;
  lastImportedAtLabel: string;
  name: string;
  status: string;
  type: string;
};

export type RevenueLeakListItem = {
  category: RevenueLeakCategory;
  categoryLabel: string;
  confidence: RevenueLeakConfidence;
  confidenceExplanation: string;
  confidenceLabel: string;
  contextLabel: string;
  currency: string;
  detectedAt: Date;
  detectedAtLabel: string;
  estimatedValueCents: number | null;
  estimatedValueIsCounted: boolean;
  estimatedValueLabel: string;
  evidenceSummary: RevenueLeakEvidenceSummary;
  fingerprint: string;
  id: string;
  leakType: RevenueLeakType;
  providerName: string | null;
  reason: string;
  recommendedAction: string;
  relatedAppointment: RevenueLeakListRelatedAppointment | null;
  relatedClient: RevenueLeakListRelatedClient | null;
  relatedLeadBookingOpportunity: RevenueLeakListRelatedLeadBookingOpportunity | null;
  severity: RevenueLeakSeverity;
  severityLabel: string;
  shortLabel: string;
  sourceDataSource: RevenueLeakListSourceDataSource | null;
  sourceName: string | null;
  sourceWindowEnd: Date | null;
  sourceWindowLabel: string;
  sourceWindowStart: Date | null;
  status: RevenueLeakStatus;
  statusLabel: string;
  typeDescription: string;
  typeLabel: string;
};

export type RevenueLeakListRead = {
  activeCount: number;
  dismissedCount: number;
  filter: RevenueLeakListFilter;
  filteredCount: number;
  items: RevenueLeakListItem[];
  resolvedCount: number;
};

const ACTIVE_REVENUE_LEAK_STATUSES = ["OPEN", "ACKNOWLEDGED"] as const satisfies
  readonly RevenueLeakStatus[];
const DEFAULT_LIST_LIMIT = 50;

const financialLeakTypes = ["NO_SHOW_REVENUE", "CANCELED_NOT_RECOVERED"] as const satisfies
  readonly RevenueLeakType[];
const operationalLeakTypes = ["MISSING_CONTACT", "BOOKING_PATH_BLOCKED"] as const satisfies
  readonly RevenueLeakType[];
const dataQualityLeakTypes = ["STALE_BOOKED_PROOF"] as const satisfies
  readonly RevenueLeakType[];

const confidenceRank: Record<RevenueLeakConfidence, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const severityRank: Record<RevenueLeakSeverity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const statusRank: Record<RevenueLeakStatus, number> = {
  OPEN: 4,
  ACKNOWLEDGED: 3,
  RESOLVED: 2,
  DISMISSED: 1,
};

const revenueLeakListSelect = {
  confidence: true,
  currency: true,
  detectedAt: true,
  estimatedValueCents: true,
  evidenceJson: true,
  fingerprint: true,
  id: true,
  leakType: true,
  providerName: true,
  reason: true,
  recommendedAction: true,
  relatedAppointment: {
    select: {
      estimatedRevenue: true,
      id: true,
      scheduledAt: true,
      serviceName: true,
      status: true,
    },
  },
  relatedClient: {
    select: {
      email: true,
      firstName: true,
      fullName: true,
      id: true,
      lastName: true,
      phone: true,
    },
  },
  relatedLeadBookingOpportunity: {
    select: {
      blockingReason: true,
      id: true,
      nextAction: true,
      status: true,
    },
  },
  serviceName: true,
  severity: true,
  sourceDataSource: {
    select: {
      id: true,
      lastImportedAt: true,
      name: true,
      status: true,
      type: true,
    },
  },
  sourceName: true,
  sourceWindowEnd: true,
  sourceWindowStart: true,
  status: true,
} satisfies Prisma.RevenueLeakSelect;

type RevenueLeakListRow = Prisma.RevenueLeakGetPayload<{
  select: typeof revenueLeakListSelect;
}>;

export async function getRevenueLeakListForWorkspace(input: {
  filter?: RevenueLeakListFilter;
  limit?: number;
  workspaceId: string;
}): Promise<RevenueLeakListRead> {
  const filter = input.filter ?? "ALL_ACTIVE";
  const limit = clampListLimit(input.limit);

  const [rows, activeCount, resolvedCount, dismissedCount] = await Promise.all([
    prisma.revenueLeak.findMany({
      orderBy: [
        {
          detectedAt: "desc",
        },
      ],
      select: revenueLeakListSelect,
      take: limit,
      where: buildRevenueLeakListWhere(input.workspaceId, filter),
    }),
    prisma.revenueLeak.count({
      where: {
        status: {
          in: [...ACTIVE_REVENUE_LEAK_STATUSES],
        },
        workspaceId: input.workspaceId,
      },
    }),
    prisma.revenueLeak.count({
      where: {
        status: "RESOLVED",
        workspaceId: input.workspaceId,
      },
    }),
    prisma.revenueLeak.count({
      where: {
        status: "DISMISSED",
        workspaceId: input.workspaceId,
      },
    }),
  ]);

  const items = rows.map(mapRevenueLeakListItem).sort(compareRevenueLeakListItems);

  return {
    activeCount,
    dismissedCount,
    filter,
    filteredCount: items.length,
    items,
    resolvedCount,
  };
}

function buildRevenueLeakListWhere(
  workspaceId: string,
  filter: RevenueLeakListFilter,
): Prisma.RevenueLeakWhereInput {
  const activeWhere: Prisma.RevenueLeakWhereInput = {
    status: {
      in: [...ACTIVE_REVENUE_LEAK_STATUSES],
    },
    workspaceId,
  };

  switch (filter) {
    case "ALL_ACTIVE":
      return activeWhere;
    case "FINANCIAL":
      return {
        ...activeWhere,
        leakType: {
          in: [...financialLeakTypes],
        },
      };
    case "OPERATIONAL":
      return {
        ...activeWhere,
        leakType: {
          in: [...operationalLeakTypes],
        },
      };
    case "DATA_QUALITY":
      return {
        ...activeWhere,
        leakType: {
          in: [...dataQualityLeakTypes],
        },
      };
    case "HIGH_SEVERITY":
      return {
        ...activeWhere,
        severity: {
          in: ["CRITICAL", "HIGH"],
        },
      };
    case "LOW_CONFIDENCE":
      return {
        ...activeWhere,
        confidence: "LOW",
      };
    case "RESOLVED":
      return {
        status: "RESOLVED",
        workspaceId,
      };
    case "DISMISSED":
      return {
        status: "DISMISSED",
        workspaceId,
      };
  }
}

function mapRevenueLeakListItem(row: RevenueLeakListRow): RevenueLeakListItem {
  const category = getRevenueLeakCategory(row.leakType);
  const typeLabel = getRevenueLeakTypeLabel(row.leakType);
  const evidenceSummary = buildRevenueLeakEvidenceSummary(row.evidenceJson);
  const confidenceCopy = buildRevenueLeakConfidenceCopy({
    confidence: row.confidence,
    evidenceSummary,
  });
  const estimatedValueIsCounted =
    canContributeToEstimatedRevenueAtRisk(row.leakType) &&
    row.estimatedValueCents !== null;

  return {
    category,
    categoryLabel: getRevenueLeakCategoryLabel(category),
    confidence: row.confidence,
    confidenceExplanation: confidenceCopy.explanation,
    confidenceLabel: confidenceCopy.label,
    contextLabel: buildContextLabel(row),
    currency: row.currency,
    detectedAt: row.detectedAt,
    detectedAtLabel: formatDate(row.detectedAt),
    estimatedValueCents: estimatedValueIsCounted ? row.estimatedValueCents : null,
    estimatedValueIsCounted,
    estimatedValueLabel: buildEstimatedValueLabel({
      category,
      currency: row.currency,
      estimatedValueCents: row.estimatedValueCents,
      leakType: row.leakType,
    }),
    evidenceSummary,
    fingerprint: row.fingerprint,
    id: row.id,
    leakType: row.leakType,
    providerName: row.providerName,
    reason: row.reason,
    recommendedAction: row.recommendedAction,
    relatedAppointment: row.relatedAppointment
      ? {
          estimatedRevenueLabel: formatDecimalMoney(row.relatedAppointment.estimatedRevenue),
          id: row.relatedAppointment.id,
          scheduledAt: row.relatedAppointment.scheduledAt,
          scheduledAtLabel: formatDate(row.relatedAppointment.scheduledAt),
          serviceName: row.relatedAppointment.serviceName,
          status: row.relatedAppointment.status,
        }
      : null,
    relatedClient: row.relatedClient
      ? {
          displayName: buildClientDisplayName(row.relatedClient),
          email: row.relatedClient.email,
          id: row.relatedClient.id,
          phone: row.relatedClient.phone,
        }
      : null,
    relatedLeadBookingOpportunity: row.relatedLeadBookingOpportunity
      ? {
          blockingReason: row.relatedLeadBookingOpportunity.blockingReason,
          id: row.relatedLeadBookingOpportunity.id,
          nextAction: row.relatedLeadBookingOpportunity.nextAction,
          status: row.relatedLeadBookingOpportunity.status,
        }
      : null,
    severity: row.severity,
    severityLabel: getSeverityLabel(row.severity),
    shortLabel: typeLabel.shortLabel,
    sourceDataSource: row.sourceDataSource
      ? {
          id: row.sourceDataSource.id,
          lastImportedAt: row.sourceDataSource.lastImportedAt,
          lastImportedAtLabel: row.sourceDataSource.lastImportedAt
            ? formatDate(row.sourceDataSource.lastImportedAt)
            : "No completed import recorded",
          name: row.sourceDataSource.name,
          status: row.sourceDataSource.status,
          type: row.sourceDataSource.type,
        }
      : null,
    sourceName: row.sourceName,
    sourceWindowEnd: row.sourceWindowEnd,
    sourceWindowLabel: buildSourceWindowLabel(row.sourceWindowStart, row.sourceWindowEnd),
    sourceWindowStart: row.sourceWindowStart,
    status: row.status,
    statusLabel: getStatusLabel(row.status),
    typeDescription: typeLabel.description,
    typeLabel: typeLabel.label,
  };
}

function buildEstimatedValueLabel(input: {
  category: RevenueLeakCategory;
  currency: string;
  estimatedValueCents: number | null;
  leakType: RevenueLeakType;
}) {
  if (!canContributeToEstimatedRevenueAtRisk(input.leakType)) {
    return input.category === "DATA_QUALITY_RISK"
      ? "Data-quality risk; not counted as revenue at risk"
      : "Operational risk; not counted as revenue at risk";
  }

  if (input.estimatedValueCents === null) {
    return "Value needs stronger data";
  }

  return `${formatMoney(input.estimatedValueCents, input.currency)} estimated at risk`;
}

function buildContextLabel(row: RevenueLeakListRow) {
  const contextParts = [
    row.relatedClient ? buildClientDisplayName(row.relatedClient) : null,
    row.relatedAppointment?.serviceName ?? row.serviceName,
    row.providerName,
    row.sourceName ?? row.sourceDataSource?.name,
  ].filter((part): part is string => Boolean(part));

  return contextParts.length > 0
    ? contextParts.slice(0, 3).join(" • ")
    : "Imported clinic data";
}

function buildClientDisplayName(
  client: NonNullable<RevenueLeakListRow["relatedClient"]>,
) {
  if (client.fullName?.trim()) {
    return client.fullName.trim();
  }

  const name = [client.firstName, client.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ");

  return name || client.email || client.phone || "Client evidence";
}

function buildSourceWindowLabel(start: Date | null, end: Date | null) {
  if (start && end) {
    return `${formatDate(start)} to ${formatDate(end)}`;
  }

  if (start) {
    return `From ${formatDate(start)}`;
  }

  if (end) {
    return `Through ${formatDate(end)}`;
  }

  return "Current imported evidence";
}

function compareRevenueLeakListItems(
  left: RevenueLeakListItem,
  right: RevenueLeakListItem,
) {
  const statusDelta = statusRank[right.status] - statusRank[left.status];

  if (statusDelta !== 0) {
    return statusDelta;
  }

  const severityDelta = severityRank[right.severity] - severityRank[left.severity];

  if (severityDelta !== 0) {
    return severityDelta;
  }

  const confidenceDelta =
    confidenceRank[right.confidence] - confidenceRank[left.confidence];

  if (confidenceDelta !== 0) {
    return confidenceDelta;
  }

  const valueDelta =
    (right.estimatedValueCents ?? 0) - (left.estimatedValueCents ?? 0);

  if (valueDelta !== 0) {
    return valueDelta;
  }

  return right.detectedAt.getTime() - left.detectedAt.getTime();
}

function clampListLimit(limit: number | undefined) {
  if (!limit || !Number.isFinite(limit)) {
    return DEFAULT_LIST_LIMIT;
  }

  return Math.max(1, Math.min(Math.floor(limit), 100));
}

function getRevenueLeakCategoryLabel(category: RevenueLeakCategory) {
  switch (category) {
    case "FINANCIAL_LEAK":
      return "Financial leak";
    case "OPERATIONAL_RISK":
      return "Operational risk";
    case "DATA_QUALITY_RISK":
      return "Data quality";
  }
}

function getSeverityLabel(severity: RevenueLeakSeverity) {
  switch (severity) {
    case "CRITICAL":
      return "Critical severity";
    case "HIGH":
      return "High severity";
    case "MEDIUM":
      return "Medium severity";
    case "LOW":
      return "Low severity";
  }
}

function getStatusLabel(status: RevenueLeakStatus) {
  switch (status) {
    case "OPEN":
      return "Open";
    case "ACKNOWLEDGED":
      return "Acknowledged";
    case "RESOLVED":
      return "Resolved";
    case "DISMISSED":
      return "Dismissed";
  }
}

function formatMoney(valueCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(valueCents / 100);
}

function formatDecimalMoney(value: Prisma.Decimal | null) {
  if (!value) {
    return "Value not provided";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value.toNumber());
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}
