import type { RevenueLeakCreateInput } from "@/types/revenue-leak";
import { getRevenueLeakCategory } from "@/services/revenue-leaks/revenue-leak-category";
import {
  canContributeToEstimatedRevenueAtRisk,
  isFinancialRevenueLeak,
} from "@/services/revenue-leaks/revenue-leak-guards";

const FIXTURE_WORKSPACE_ID = "fixture_workspace_revenue_leak_detector";
const FIXTURE_DATA_SOURCE_ID = "fixture_data_source_import_appointments";
const FIXTURE_CLIENT_ID = "fixture_client_redacted";
const FIXTURE_APPOINTMENT_ID = "fixture_appointment_redacted";
const FIXTURE_LEAD_OPPORTUNITY_ID = "fixture_lead_booking_opportunity_redacted";
const FIXTURE_DETECTED_AT = new Date("2026-05-01T12:00:00.000Z");
const FIXTURE_WINDOW_START = new Date("2026-04-01T00:00:00.000Z");
const FIXTURE_WINDOW_END = new Date("2026-04-30T23:59:59.999Z");

type RevenueLeakFixtureScenario =
  | "booking_path_blocked_operational_risk"
  | "canceled_not_recovered_financial_leak"
  | "dismissed_leak"
  | "leak_without_financial_value"
  | "low_confidence_leak"
  | "missing_contact_operational_risk"
  | "no_show_high_confidence_financial_leak"
  | "no_show_medium_confidence_average_deal_value"
  | "resolved_leak"
  | "stale_booked_proof_data_quality_risk";

export type RevenueLeakFixture = RevenueLeakCreateInput & {
  canContributeToEstimatedRevenueAtRisk: boolean;
  category: ReturnType<typeof getRevenueLeakCategory>;
  isFinancial: boolean;
  scenario: RevenueLeakFixtureScenario;
};

function buildRevenueLeakFixture(
  scenario: RevenueLeakFixtureScenario,
  input: RevenueLeakCreateInput,
): RevenueLeakFixture {
  return {
    ...input,
    canContributeToEstimatedRevenueAtRisk:
      canContributeToEstimatedRevenueAtRisk(input.leakType),
    category: getRevenueLeakCategory(input.leakType),
    isFinancial: isFinancialRevenueLeak(input.leakType),
    scenario,
  };
}

export const REVENUE_LEAK_FIXTURES = [
  buildRevenueLeakFixture("no_show_high_confidence_financial_leak", {
    confidence: "HIGH",
    currency: "USD",
    detectedAt: FIXTURE_DETECTED_AT,
    estimatedValueCents: 42500,
    evidenceJson: {
      confidenceReason:
        "Imported appointment has no-show status and direct appointment value.",
      signals: ["appointment_status:no_show", "value_source:appointment"],
      sourceRecordIds: [FIXTURE_APPOINTMENT_ID],
      summary:
        "A redacted appointment is marked no-show with direct appointment value available.",
      value: { appointmentValueCents: 42500, valueSource: "appointment" },
    },
    fingerprint:
      "fixture:no_show_high_confidence_financial_leak:appointment_redacted",
    leakType: "NO_SHOW_REVENUE",
    reason:
      "A completed import shows a no-show appointment with estimated value attached.",
    recommendedAction:
      "Review whether this no-show was recovered or should remain counted as revenue at risk.",
    relatedAppointmentId: FIXTURE_APPOINTMENT_ID,
    relatedClientId: FIXTURE_CLIENT_ID,
    severity: "HIGH",
    sourceDataSourceId: FIXTURE_DATA_SOURCE_ID,
    sourceName: "Fixture appointment import",
    sourceWindowEnd: FIXTURE_WINDOW_END,
    sourceWindowStart: FIXTURE_WINDOW_START,
    status: "OPEN",
    workspaceId: FIXTURE_WORKSPACE_ID,
  }),
  buildRevenueLeakFixture("no_show_medium_confidence_average_deal_value", {
    confidence: "MEDIUM",
    currency: "USD",
    detectedAt: FIXTURE_DETECTED_AT,
    estimatedValueCents: 30000,
    evidenceJson: {
      confidenceReason:
        "Imported appointment has no-show status, but value uses workspace average deal value.",
      signals: ["appointment_status:no_show", "value_source:average_deal_value"],
      sourceRecordIds: [FIXTURE_APPOINTMENT_ID],
      summary:
        "A redacted appointment is marked no-show, with estimated value inferred from average deal value.",
      value: { averageDealValueCents: 30000, valueSource: "average_deal_value" },
    },
    fingerprint:
      "fixture:no_show_medium_confidence_average_deal_value:appointment_redacted",
    leakType: "NO_SHOW_REVENUE",
    reason:
      "A no-show appointment is visible, but the amount is estimated from average deal value.",
    recommendedAction:
      "Confirm whether the appointment had a real value before treating this as a stronger revenue risk.",
    relatedAppointmentId: FIXTURE_APPOINTMENT_ID,
    relatedClientId: FIXTURE_CLIENT_ID,
    severity: "MEDIUM",
    sourceDataSourceId: FIXTURE_DATA_SOURCE_ID,
    sourceName: "Fixture appointment import",
    sourceWindowEnd: FIXTURE_WINDOW_END,
    sourceWindowStart: FIXTURE_WINDOW_START,
    status: "OPEN",
    workspaceId: FIXTURE_WORKSPACE_ID,
  }),
  buildRevenueLeakFixture("canceled_not_recovered_financial_leak", {
    confidence: "HIGH",
    currency: "USD",
    detectedAt: FIXTURE_DETECTED_AT,
    estimatedValueCents: 57500,
    evidenceJson: {
      confidenceReason:
        "Imported appointment is canceled and no replacement booking evidence is linked in the fixture.",
      signals: [
        "appointment_status:canceled",
        "recovery_evidence:not_found",
        "value_source:appointment",
      ],
      sourceRecordIds: [FIXTURE_APPOINTMENT_ID],
      summary:
        "A redacted appointment is canceled with no fixture evidence of recovery.",
      value: { appointmentValueCents: 57500, valueSource: "appointment" },
    },
    fingerprint:
      "fixture:canceled_not_recovered_financial_leak:appointment_redacted",
    leakType: "CANCELED_NOT_RECOVERED",
    reason:
      "A canceled appointment appears unrecovered in the structured fixture evidence.",
    recommendedAction:
      "Review whether the cancellation was rebooked before counting the estimate as active revenue at risk.",
    relatedAppointmentId: FIXTURE_APPOINTMENT_ID,
    relatedClientId: FIXTURE_CLIENT_ID,
    severity: "HIGH",
    sourceDataSourceId: FIXTURE_DATA_SOURCE_ID,
    sourceName: "Fixture appointment import",
    sourceWindowEnd: FIXTURE_WINDOW_END,
    sourceWindowStart: FIXTURE_WINDOW_START,
    status: "OPEN",
    workspaceId: FIXTURE_WORKSPACE_ID,
  }),
  buildRevenueLeakFixture("missing_contact_operational_risk", {
    confidence: "HIGH",
    detectedAt: FIXTURE_DETECTED_AT,
    estimatedValueCents: null,
    evidenceJson: {
      confidenceReason:
        "Lead booking opportunity has neither email nor phone in the fixture.",
      signals: ["contact_email:missing", "contact_phone:missing"],
      sourceRecordIds: [FIXTURE_LEAD_OPPORTUNITY_ID],
      summary:
        "A redacted booking opportunity is blocked because contact evidence is missing.",
      value: { contributesToRevenueAtRisk: false },
    },
    fingerprint:
      "fixture:missing_contact_operational_risk:opportunity_redacted",
    leakType: "MISSING_CONTACT",
    reason:
      "This opportunity cannot move through a safe booking path until contact evidence exists.",
    recommendedAction:
      "Add a usable contact method before treating this as an actionable booking-path risk.",
    relatedLeadBookingOpportunityId: FIXTURE_LEAD_OPPORTUNITY_ID,
    severity: "MEDIUM",
    sourceName: "Fixture booking opportunity",
    sourceWindowEnd: FIXTURE_WINDOW_END,
    sourceWindowStart: FIXTURE_WINDOW_START,
    status: "OPEN",
    workspaceId: FIXTURE_WORKSPACE_ID,
  }),
  buildRevenueLeakFixture("booking_path_blocked_operational_risk", {
    confidence: "MEDIUM",
    detectedAt: FIXTURE_DETECTED_AT,
    estimatedValueCents: null,
    evidenceJson: {
      confidenceReason:
        "Lead booking opportunity has contact evidence but no complete booking path in the fixture.",
      signals: ["booking_path:missing", "contact_identity:present"],
      sourceRecordIds: [FIXTURE_LEAD_OPPORTUNITY_ID],
      summary:
        "A redacted booking opportunity is blocked because the booking path is incomplete.",
      value: { contributesToRevenueAtRisk: false },
    },
    fingerprint:
      "fixture:booking_path_blocked_operational_risk:opportunity_redacted",
    leakType: "BOOKING_PATH_BLOCKED",
    reason:
      "The booking path is incomplete, so the opportunity remains an operational risk rather than a financial leak.",
    recommendedAction:
      "Lock the intended booking path before moving this opportunity into action guidance.",
    relatedLeadBookingOpportunityId: FIXTURE_LEAD_OPPORTUNITY_ID,
    severity: "MEDIUM",
    sourceName: "Fixture booking opportunity",
    sourceWindowEnd: FIXTURE_WINDOW_END,
    sourceWindowStart: FIXTURE_WINDOW_START,
    status: "OPEN",
    workspaceId: FIXTURE_WORKSPACE_ID,
  }),
  buildRevenueLeakFixture("stale_booked_proof_data_quality_risk", {
    confidence: "HIGH",
    detectedAt: FIXTURE_DETECTED_AT,
    estimatedValueCents: null,
    evidenceJson: {
      confidenceReason:
        "Fixture source freshness is outside the acceptable revenue-read window.",
      signals: ["data_freshness:stale", "last_import:old"],
      sourceRecordIds: [FIXTURE_DATA_SOURCE_ID],
      summary:
        "Appointment evidence is stale, so the current revenue read may be outdated.",
      value: { contributesToRevenueAtRisk: false, staleDays: 21 },
    },
    fingerprint: "fixture:stale_booked_proof_data_quality_risk:source_redacted",
    leakType: "STALE_BOOKED_PROOF",
    reason:
      "The imported appointment evidence is stale enough to weaken confidence in the current revenue read.",
    recommendedAction:
      "Upload a fresh appointment file before using the read for stronger commercial decisions.",
    severity: "LOW",
    sourceDataSourceId: FIXTURE_DATA_SOURCE_ID,
    sourceName: "Fixture appointment import",
    sourceWindowEnd: FIXTURE_WINDOW_END,
    sourceWindowStart: FIXTURE_WINDOW_START,
    status: "OPEN",
    workspaceId: FIXTURE_WORKSPACE_ID,
  }),
  buildRevenueLeakFixture("leak_without_financial_value", {
    confidence: "MEDIUM",
    detectedAt: FIXTURE_DETECTED_AT,
    estimatedValueCents: null,
    evidenceJson: {
      confidenceReason:
        "Financial leak type is visible, but no direct value or average deal value is available in the fixture.",
      signals: ["appointment_status:no_show", "value_source:missing"],
      sourceRecordIds: [FIXTURE_APPOINTMENT_ID],
      summary:
        "A no-show appointment is visible, but the fixture does not provide enough value evidence.",
      value: { valueSource: "missing" },
    },
    fingerprint: "fixture:leak_without_financial_value:appointment_redacted",
    leakType: "NO_SHOW_REVENUE",
    reason:
      "A no-show can be classified, but the estimated value is intentionally absent.",
    recommendedAction:
      "Improve appointment value evidence or average deal value before using this in estimated revenue at risk.",
    relatedAppointmentId: FIXTURE_APPOINTMENT_ID,
    severity: "MEDIUM",
    sourceDataSourceId: FIXTURE_DATA_SOURCE_ID,
    sourceName: "Fixture appointment import",
    sourceWindowEnd: FIXTURE_WINDOW_END,
    sourceWindowStart: FIXTURE_WINDOW_START,
    status: "OPEN",
    workspaceId: FIXTURE_WORKSPACE_ID,
  }),
  buildRevenueLeakFixture("dismissed_leak", {
    confidence: "HIGH",
    currency: "USD",
    detectedAt: FIXTURE_DETECTED_AT,
    estimatedValueCents: 22500,
    evidenceJson: {
      confidenceReason:
        "Dismissed fixture keeps financial evidence but represents a user-dismissed state.",
      signals: ["appointment_status:no_show", "user_state:dismissed"],
      sourceRecordIds: [FIXTURE_APPOINTMENT_ID],
      summary:
        "A no-show revenue risk was dismissed in this deterministic fixture.",
      value: { appointmentValueCents: 22500, valueSource: "appointment" },
    },
    fingerprint: "fixture:dismissed_leak:appointment_redacted",
    leakType: "NO_SHOW_REVENUE",
    reason:
      "This fixture represents a no-show revenue risk that was dismissed after review.",
    recommendedAction:
      "Keep dismissed risks out of active recovery reads unless reopened by a future workflow.",
    relatedAppointmentId: FIXTURE_APPOINTMENT_ID,
    severity: "LOW",
    sourceDataSourceId: FIXTURE_DATA_SOURCE_ID,
    sourceName: "Fixture appointment import",
    sourceWindowEnd: FIXTURE_WINDOW_END,
    sourceWindowStart: FIXTURE_WINDOW_START,
    status: "DISMISSED",
    workspaceId: FIXTURE_WORKSPACE_ID,
  }),
  buildRevenueLeakFixture("resolved_leak", {
    confidence: "HIGH",
    currency: "USD",
    detectedAt: FIXTURE_DETECTED_AT,
    estimatedValueCents: 35000,
    evidenceJson: {
      confidenceReason:
        "Resolved fixture keeps original financial evidence and a deterministic resolved state.",
      signals: ["appointment_status:canceled", "user_state:resolved"],
      sourceRecordIds: [FIXTURE_APPOINTMENT_ID],
      summary:
        "An unrecovered cancellation risk was resolved in this deterministic fixture.",
      value: { appointmentValueCents: 35000, valueSource: "appointment" },
    },
    fingerprint: "fixture:resolved_leak:appointment_redacted",
    leakType: "CANCELED_NOT_RECOVERED",
    reason:
      "This fixture represents a cancellation risk that was later resolved.",
    recommendedAction:
      "Keep resolved risks available for proof/history reads without counting them as active.",
    relatedAppointmentId: FIXTURE_APPOINTMENT_ID,
    resolvedAt: new Date("2026-05-02T12:00:00.000Z"),
    severity: "MEDIUM",
    sourceDataSourceId: FIXTURE_DATA_SOURCE_ID,
    sourceName: "Fixture appointment import",
    sourceWindowEnd: FIXTURE_WINDOW_END,
    sourceWindowStart: FIXTURE_WINDOW_START,
    status: "RESOLVED",
    workspaceId: FIXTURE_WORKSPACE_ID,
  }),
  buildRevenueLeakFixture("low_confidence_leak", {
    confidence: "LOW",
    currency: "USD",
    detectedAt: FIXTURE_DETECTED_AT,
    estimatedValueCents: 18000,
    evidenceJson: {
      confidenceReason:
        "Fixture includes partial no-show evidence with weak value support.",
      signals: ["appointment_status:unclear_no_show", "value_source:estimated"],
      sourceRecordIds: [FIXTURE_APPOINTMENT_ID],
      summary:
        "A possible no-show risk exists, but the fixture evidence is intentionally low confidence.",
      value: { estimatedValueCents: 18000, valueSource: "weak_estimate" },
    },
    fingerprint: "fixture:low_confidence_leak:appointment_redacted",
    leakType: "NO_SHOW_REVENUE",
    reason:
      "The fixture represents a possible no-show revenue risk with weak supporting evidence.",
    recommendedAction:
      "Use this only as a review candidate until stronger appointment status and value evidence exists.",
    relatedAppointmentId: FIXTURE_APPOINTMENT_ID,
    severity: "LOW",
    sourceDataSourceId: FIXTURE_DATA_SOURCE_ID,
    sourceName: "Fixture appointment import",
    sourceWindowEnd: FIXTURE_WINDOW_END,
    sourceWindowStart: FIXTURE_WINDOW_START,
    status: "OPEN",
    workspaceId: FIXTURE_WORKSPACE_ID,
  }),
] as const satisfies readonly RevenueLeakFixture[];
