export type RevoryDemoRecord = {
  bookingPathStatus: "BLOCKED" | "READY" | null;
  clientRef: string;
  estimatedRevenueCents: number | null;
  hasEmail: boolean;
  hasPhone: boolean;
  id: string;
  kind: "APPOINTMENT" | "LEAD";
  providerName: string | null;
  scheduledAt: string | null;
  serviceName: string;
  status: "BOOKED" | "CANCELED" | "COMPLETED" | "LEAD_OPEN" | "NO_SHOW";
};

export type RevoryDemoRisk = {
  confidence: "HIGH" | "LOW" | "MEDIUM";
  count: number;
  evidence: string[];
  estimatedValueCents: number | null;
  id: string;
  label: string;
  recommendedAction: string;
  severity: "HIGH" | "LOW" | "MEDIUM";
  summary: string;
};

export const REVORY_DEMO_CLINIC = "Asteria Aesthetics — Sample MedSpa";
export const REVORY_DEMO_GENERATED_AT = "2026-07-11T12:00:00.000Z";
export const REVORY_DEMO_SOURCE_EXPORTED_AT = "2026-06-20T16:00:00.000Z";

export const REVORY_DEMO_RECORDS: readonly RevoryDemoRecord[] = [
  {
    bookingPathStatus: null,
    clientRef: "SAMPLE-001",
    estimatedRevenueCents: 65000,
    hasEmail: true,
    hasPhone: true,
    id: "APT-001",
    kind: "APPOINTMENT",
    providerName: "Provider A",
    scheduledAt: "2026-06-03T14:00:00.000Z",
    serviceName: "Injectable consultation",
    status: "NO_SHOW",
  },
  {
    bookingPathStatus: null,
    clientRef: "SAMPLE-002",
    estimatedRevenueCents: 90000,
    hasEmail: true,
    hasPhone: true,
    id: "APT-002",
    kind: "APPOINTMENT",
    providerName: "Provider B",
    scheduledAt: "2026-06-07T17:30:00.000Z",
    serviceName: "Laser consultation",
    status: "NO_SHOW",
  },
  {
    bookingPathStatus: null,
    clientRef: "SAMPLE-003",
    estimatedRevenueCents: null,
    hasEmail: true,
    hasPhone: true,
    id: "APT-003",
    kind: "APPOINTMENT",
    providerName: null,
    scheduledAt: "2026-06-10T15:00:00.000Z",
    serviceName: "Skin consultation",
    status: "NO_SHOW",
  },
  {
    bookingPathStatus: null,
    clientRef: "SAMPLE-004",
    estimatedRevenueCents: 120000,
    hasEmail: true,
    hasPhone: true,
    id: "APT-004",
    kind: "APPOINTMENT",
    providerName: "Provider A",
    scheduledAt: "2026-06-12T18:00:00.000Z",
    serviceName: "Body contouring consultation",
    status: "CANCELED",
  },
  {
    bookingPathStatus: null,
    clientRef: "SAMPLE-005",
    estimatedRevenueCents: 75000,
    hasEmail: true,
    hasPhone: true,
    id: "APT-005",
    kind: "APPOINTMENT",
    providerName: "Provider B",
    scheduledAt: "2026-06-14T16:00:00.000Z",
    serviceName: "Laser consultation",
    status: "CANCELED",
  },
  {
    bookingPathStatus: null,
    clientRef: "SAMPLE-006",
    estimatedRevenueCents: 68000,
    hasEmail: true,
    hasPhone: true,
    id: "APT-006",
    kind: "APPOINTMENT",
    providerName: "Provider A",
    scheduledAt: "2026-06-15T13:00:00.000Z",
    serviceName: "Injectable consultation",
    status: "CANCELED",
  },
  {
    bookingPathStatus: null,
    clientRef: "SAMPLE-006",
    estimatedRevenueCents: 68000,
    hasEmail: true,
    hasPhone: true,
    id: "APT-007",
    kind: "APPOINTMENT",
    providerName: "Provider A",
    scheduledAt: "2026-07-16T13:00:00.000Z",
    serviceName: "Injectable consultation",
    status: "BOOKED",
  },
  {
    bookingPathStatus: null,
    clientRef: "SAMPLE-007",
    estimatedRevenueCents: 50000,
    hasEmail: true,
    hasPhone: true,
    id: "APT-008",
    kind: "APPOINTMENT",
    providerName: "Provider C",
    scheduledAt: "2026-07-18T18:30:00.000Z",
    serviceName: "Skin consultation",
    status: "BOOKED",
  },
  {
    bookingPathStatus: null,
    clientRef: "SAMPLE-008",
    estimatedRevenueCents: 70000,
    hasEmail: true,
    hasPhone: true,
    id: "APT-009",
    kind: "APPOINTMENT",
    providerName: "Provider B",
    scheduledAt: "2026-06-18T19:00:00.000Z",
    serviceName: "Laser consultation",
    status: "COMPLETED",
  },
  {
    bookingPathStatus: "BLOCKED",
    clientRef: "SAMPLE-009",
    estimatedRevenueCents: null,
    hasEmail: false,
    hasPhone: false,
    id: "LEAD-001",
    kind: "LEAD",
    providerName: null,
    scheduledAt: null,
    serviceName: "Injectable consultation",
    status: "LEAD_OPEN",
  },
  {
    bookingPathStatus: "BLOCKED",
    clientRef: "SAMPLE-010",
    estimatedRevenueCents: null,
    hasEmail: true,
    hasPhone: true,
    id: "LEAD-002",
    kind: "LEAD",
    providerName: null,
    scheduledAt: null,
    serviceName: "Body contouring consultation",
    status: "LEAD_OPEN",
  },
  {
    bookingPathStatus: "READY",
    clientRef: "SAMPLE-011",
    estimatedRevenueCents: null,
    hasEmail: true,
    hasPhone: true,
    id: "LEAD-003",
    kind: "LEAD",
    providerName: null,
    scheduledAt: null,
    serviceName: "Laser consultation",
    status: "LEAD_OPEN",
  },
  {
    bookingPathStatus: null,
    clientRef: "SAMPLE-012",
    estimatedRevenueCents: 82500,
    hasEmail: true,
    hasPhone: true,
    id: "APT-010",
    kind: "APPOINTMENT",
    providerName: "Provider C",
    scheduledAt: "2026-07-22T16:30:00.000Z",
    serviceName: "Skin consultation",
    status: "BOOKED",
  },
  {
    bookingPathStatus: null,
    clientRef: "SAMPLE-013",
    estimatedRevenueCents: 57500,
    hasEmail: true,
    hasPhone: true,
    id: "APT-011",
    kind: "APPOINTMENT",
    providerName: "Provider A",
    scheduledAt: "2026-06-19T14:30:00.000Z",
    serviceName: "Injectable consultation",
    status: "COMPLETED",
  },
] as const;

function hasFutureRebooking(record: RevoryDemoRecord) {
  if (record.status !== "CANCELED" || !record.scheduledAt) {
    return false;
  }

  const canceledAt = new Date(record.scheduledAt).getTime();

  return REVORY_DEMO_RECORDS.some((candidate) => {
    if (
      candidate.kind !== "APPOINTMENT" ||
      candidate.clientRef !== record.clientRef ||
      candidate.serviceName !== record.serviceName ||
      candidate.status !== "BOOKED" ||
      !candidate.scheduledAt
    ) {
      return false;
    }

    return new Date(candidate.scheduledAt).getTime() > canceledAt;
  });
}

function sumKnownValue(records: readonly RevoryDemoRecord[]) {
  return records.reduce(
    (total, record) => total + (record.estimatedRevenueCents ?? 0),
    0,
  );
}

export function buildRevoryDemoRead() {
  const noShows = REVORY_DEMO_RECORDS.filter(
    (record) => record.kind === "APPOINTMENT" && record.status === "NO_SHOW",
  );
  const canceledNotRecovered = REVORY_DEMO_RECORDS.filter(
    (record) =>
      record.kind === "APPOINTMENT" &&
      record.status === "CANCELED" &&
      !hasFutureRebooking(record),
  );
  const recoveredCancellationCount = REVORY_DEMO_RECORDS.filter(
    (record) =>
      record.kind === "APPOINTMENT" &&
      record.status === "CANCELED" &&
      hasFutureRebooking(record),
  ).length;
  const missingContact = REVORY_DEMO_RECORDS.filter(
    (record) =>
      record.kind === "LEAD" && !record.hasEmail && !record.hasPhone,
  );
  const bookingPathBlocked = REVORY_DEMO_RECORDS.filter(
    (record) =>
      record.kind === "LEAD" &&
      record.bookingPathStatus === "BLOCKED" &&
      Boolean(record.hasEmail || record.hasPhone),
  );
  const noShowValueCents = sumKnownValue(noShows);
  const canceledValueCents = sumKnownValue(canceledNotRecovered);
  const financialLeaks: RevoryDemoRisk[] = [
    {
      confidence: noShows.some((record) => record.estimatedRevenueCents === null)
        ? "MEDIUM"
        : "HIGH",
      count: noShows.length,
      evidence: [
        `${noShows.length} appointment rows have status NO_SHOW.`,
        `${noShows.filter((record) => record.estimatedRevenueCents !== null).length} include direct estimated revenue; 1 has no value and is excluded from the dollar total.`,
      ],
      estimatedValueCents: noShowValueCents,
      id: "no-show-revenue-risk",
      label: "No-show revenue risk",
      recommendedAction:
        "Review the two highest-value no-shows first and confirm whether either appointment was recovered outside this sample.",
      severity: "HIGH",
      summary:
        "Three no-shows are visible. Only rows with direct appointment value contribute to the estimate.",
    },
    {
      confidence: "HIGH",
      count: canceledNotRecovered.length,
      evidence: [
        `${canceledNotRecovered.length} canceled appointments have no future booking for the same sample client and service.`,
        `${recoveredCancellationCount} canceled appointment has a future rebooking and is not counted as an active leak.`,
      ],
      estimatedValueCents: canceledValueCents,
      id: "canceled-not-recovered",
      label: "Canceled not recovered",
      recommendedAction:
        "Start with the $1,200 body-contouring cancellation, then verify whether a replacement booking exists outside the exported window.",
      severity: "HIGH",
      summary:
        "Two cancellations have no visible future rebooking in the sample data.",
    },
  ];
  const operationalRisks: RevoryDemoRisk[] = [
    {
      confidence: "HIGH",
      count: missingContact.length,
      evidence: [
        "One lead-shaped row has neither email nor phone.",
        "No financial value is assigned to this operational signal.",
      ],
      estimatedValueCents: null,
      id: "missing-contact",
      label: "Missing contact",
      recommendedAction:
        "Repair the missing contact fields at the source before treating this record as a reachable booking opportunity.",
      severity: "MEDIUM",
      summary:
        "A booking opportunity may be blocked because the sample record has no usable contact path.",
    },
    {
      confidence: "HIGH",
      count: bookingPathBlocked.length,
      evidence: [
        "One lead-shaped row has contact data but its booking path is marked BLOCKED.",
        "This is prioritized as operational risk, not counted as financial loss.",
      ],
      estimatedValueCents: null,
      id: "booking-path-blocked",
      label: "Booking path blocked",
      recommendedAction:
        "Check the handoff path for the blocked record and confirm the clinic's intended booking destination.",
      severity: "MEDIUM",
      summary:
        "A reachable sample lead still has no ready booking path.",
    },
  ];
  const dataQualityRisks: RevoryDemoRisk[] = [
    {
      confidence: "HIGH",
      count: 1,
      evidence: [
        "The sample source was exported 21 days before this read was generated.",
        "One no-show has no estimated revenue and one appointment has no provider name.",
      ],
      estimatedValueCents: null,
      id: "stale-incomplete-evidence",
      label: "Stale or incomplete evidence",
      recommendedAction:
        "Use a fresh comma-separated appointment export and include estimated revenue plus provider name when available.",
      severity: "LOW",
      summary:
        "The read is useful, but freshness and missing fields limit the completeness of the estimate.",
    },
  ];
  const estimatedRevenueAtRiskCents = financialLeaks.reduce(
    (total, leak) => total + (leak.estimatedValueCents ?? 0),
    0,
  );
  const biggestLeak = [...financialLeaks].sort(
    (left, right) =>
      (right.estimatedValueCents ?? 0) - (left.estimatedValueCents ?? 0),
  )[0];

  return {
    biggestLeak,
    clinicName: REVORY_DEMO_CLINIC,
    dataQuality: {
      missing: [
        "Estimated revenue on 1 no-show",
        "Provider name on 1 appointment",
        "Fresh records after June 20, 2026",
      ],
      supported: [
        "Appointment status and scheduled date",
        "Direct estimated revenue on 10 appointment rows",
        "Future rebooking comparison by sample client and service",
        "Contact and booking-path fields on lead-shaped rows",
      ],
    },
    dataQualityRisks,
    estimatedRevenueAtRiskCents,
    financialLeaks,
    generatedAt: REVORY_DEMO_GENERATED_AT,
    operationalRisks,
    recordCount: REVORY_DEMO_RECORDS.length,
    recoveredCancellationCount,
    sourceExportedAt: REVORY_DEMO_SOURCE_EXPORTED_AT,
  };
}

export const REVORY_DEMO_READ = buildRevoryDemoRead();
