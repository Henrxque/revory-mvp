import type { Prisma } from "@prisma/client";

import type { RevoryDecisionSupportRead } from "@/types/decision-support";
import type { OnboardingStepKey } from "@/services/onboarding/wizard-steps";

type BuildActivationStepReadInput = {
  averageDealValue: Prisma.Decimal | null;
  primaryChannel: string | null;
  recommendedModeKey: string | null;
  selectedDataSourceType: string | null;
  selectedTemplate: string | null;
  stepKey: OnboardingStepKey;
};

function formatCurrency(value: Prisma.Decimal | null) {
  if (!value) {
    return "Not set";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(numericValue);
}

function formatMainOffer(value: string | null) {
  switch (value) {
    case "INJECTABLES":
      return "Injectables";
    case "LASER_SKIN":
      return "Laser & Skin";
    case "BODY_CONTOURING":
      return "Body Contouring";
    default:
      return "Main offer next";
  }
}

function formatLeadEntry(value: string | null) {
  switch (value) {
    case "APPOINTMENTS_CSV":
      return "Appointments upload";
    case "CLIENTS_CSV":
      return "Client export";
    case "MANUAL_IMPORT":
      return "Guided CSV upload";
    default:
      return "Lead entry next";
  }
}

function formatBookingPath(value: string | null) {
  switch (value) {
    case "EMAIL":
      return "Primary booking path (Email)";
    case "SMS":
      return "Assisted booking path (SMS)";
    default:
      return "Booking path next";
  }
}

function formatVoice(value: string | null) {
  switch (value) {
    case "MODE_A":
      return "Calm & Premium";
    case "MODE_B":
      return "Clear & Assertive";
    case "MODE_C":
      return "High-Touch Premium";
    default:
      return "Voice next";
  }
}

export function buildActivationStepRead({
  averageDealValue,
  primaryChannel,
  recommendedModeKey,
  selectedDataSourceType,
  selectedTemplate,
  stepKey,
}: BuildActivationStepReadInput): RevoryDecisionSupportRead {
  const mainOffer = formatMainOffer(selectedTemplate);
  const leadEntry = formatLeadEntry(selectedDataSourceType);
  const bookingPath = formatBookingPath(primaryChannel);
  const voice = formatVoice(recommendedModeKey);
  const valuePerBooking = formatCurrency(averageDealValue);

  switch (stepKey) {
    case "template":
      return {
        badgeLabel: "Guided recommendation",
        detectedObjection:
          "Spreading attention across multiple services too early would blur the first booking motion and weaken the promise to clone one best seller.",
        eyebrow: "Controlled Support",
        nextBestAction: `${mainOffer} is the cleanest starting anchor when the goal is one guided booking path instead of a broader service menu.`,
        recommendedPath: "One main offer -> lead entry -> one booking path",
        signals: [
          {
            label: "Main offer",
            note: "This is the one offer Seller will read first.",
            value: mainOffer,
          },
          {
            label: "Next move",
            note: "After this, lead entry should stay equally narrow.",
            value: "Lock lead entry",
          },
          {
            label: "Commercial gain",
            note: "A narrower start makes the product feel more premium and easier to trust.",
            value: "One offer live",
          },
        ],
        summary:
          "This step is the safest place for short decision support because it shapes the whole booking motion without adding any new workflow.",
        title: `${mainOffer} gives Seller a tighter booking story.`,
        tone: "accent",
      };
    case "source":
      return {
        badgeLabel: "Guided recommendation",
        detectedObjection:
          selectedDataSourceType === "CLIENTS_CSV"
            ? "Starting from broader client records first can delay booked proof if the clinic already has appointments available."
            : "Lead entry should stay explicit so Seller never feels like a generic import manager.",
        eyebrow: "Controlled Support",
        nextBestAction:
          selectedDataSourceType === "APPOINTMENTS_CSV"
            ? "Keep appointments upload first when the clinic already exports booked visits. That is the shortest path to proof and revenue confidence."
            : selectedDataSourceType === "CLIENTS_CSV"
              ? "Use client export first only when the workspace needs lead-base visibility before booked proof can exist."
              : "Use guided CSV upload only as a controlled fallback when the export needs one short normalization pass.",
        recommendedPath:
          selectedDataSourceType === "APPOINTMENTS_CSV"
            ? "Appointments upload -> booked proof -> revenue view"
            : selectedDataSourceType === "CLIENTS_CSV"
              ? "Client export -> lead base -> booked proof later"
              : "Guided CSV upload -> clean lead entry -> booked proof",
        signals: [
          {
            label: "Lead entry",
            note: "This is where Seller reads live demand first.",
            value: leadEntry,
          },
          {
            label: "Booked proof path",
            note: "Appointments remain the fastest proof lane when available.",
            value:
              selectedDataSourceType === "APPOINTMENTS_CSV" ? "Shortest path" : "Secondary path",
          },
          {
            label: "Risk",
            note: "The product should not drift toward source administration.",
            value: "Keep guided",
          },
        ],
        summary:
          "Lead entry is where minimal intelligence adds value fast: it can point to the safest starting input without opening a broader intake system.",
        title:
          selectedDataSourceType === "APPOINTMENTS_CSV"
            ? "Appointments upload is the fastest path to booked proof."
            : selectedDataSourceType === "CLIENTS_CSV"
              ? "Client export can work, but it makes proof one step more indirect."
              : "Guided CSV upload keeps edge cases contained.",
        tone: selectedDataSourceType === "APPOINTMENTS_CSV" ? "real" : "future",
      };
    case "channel":
      return {
        badgeLabel: "Guided recommendation",
        detectedObjection:
          primaryChannel === "SMS"
            ? "SMS should stay one controlled booking lane, not the start of a broader conversational surface."
            : "Adding multiple booking lanes too early would make Seller feel heavier and less trustworthy.",
        eyebrow: "Controlled Support",
        nextBestAction:
          primaryChannel === "EMAIL"
            ? "Keep email as the main booking path when you want the clearest MVP handoff from interest to booked appointment."
            : "Use SMS only as one explicit booking destination. It should not imply open chat, triage sprawl, or multiple parallel paths.",
        recommendedPath:
          primaryChannel === "EMAIL"
            ? "Lead enters -> email handoff -> booked appointment"
            : "Lead enters -> controlled SMS handoff -> booked appointment",
        signals: [
          {
            label: "Booking path",
            note: "Seller should reinforce one destination, not a route maze.",
            value: bookingPath,
          },
          {
            label: "Handoff quality",
            note: "The booking path should stay obvious during demo and launch.",
            value: primaryChannel === "EMAIL" ? "Clear" : "Controlled",
          },
          {
            label: "MVP guardrail",
            note: "No inbox, no free chat, no multi-lane routing.",
            value: "One path only",
          },
        ],
        summary:
          "Channel selection is the right place for invisible intelligence because the product can recommend the clearest default without inventing any autonomous behavior.",
        title:
          primaryChannel === "EMAIL"
            ? "Email keeps the booking handoff clearest."
            : "SMS can stay premium only if the path remains tightly controlled.",
        tone: primaryChannel === "EMAIL" ? "real" : "future",
      };
    case "deal_value":
      return {
        badgeLabel: "Guided recommendation",
        detectedObjection:
          valuePerBooking === "Not set"
            ? "Without one directional booking value, the revenue view stays abstract even if booked appointments appear."
            : "This should stay one directional baseline, not the start of pricing logic or a finance workflow.",
        eyebrow: "Controlled Support",
        nextBestAction:
          valuePerBooking === "Not set"
            ? "Set one clean value per booking so revenue can read as a grounded outcome from the first visible appointments."
            : `Keep ${valuePerBooking} as the directional value per booking unless the clinic needs a materially different baseline to explain revenue honestly.`,
        recommendedPath: "Configured value per booking -> visible bookings -> revenue read",
        signals: [
          {
            label: "Value per booking",
            note: "This is the baseline REVORY uses in the revenue read.",
            value: valuePerBooking,
          },
          {
            label: "Revenue read",
            note: "The dashboard needs one number before it needs more math.",
            value: valuePerBooking === "Not set" ? "Still abstract" : "Ready to anchor",
          },
          {
            label: "Scope guardrail",
            note: "No pricing engine, no filters, no plan calculator.",
            value: "One number",
          },
        ],
        summary:
          "A short recommendation here makes Seller feel economically aware without turning activation into analytics or pricing software.",
        title:
          valuePerBooking === "Not set"
            ? "Value per booking is the missing revenue anchor."
            : `${valuePerBooking} keeps the revenue story legible from day one.`,
        tone: valuePerBooking === "Not set" ? "future" : "accent",
      };
    case "mode":
      return {
        badgeLabel: "Guided recommendation",
        detectedObjection:
          "Voice choice should never turn into a custom copy builder or an open-ended brand workshop inside activation.",
        eyebrow: "Controlled Support",
        nextBestAction: `${voice} works best when it reinforces the same booking path consistently instead of trying to cover every edge case in tone.`,
        recommendedPath: "One Seller voice -> one booking motion -> one consistent handoff",
        signals: [
          {
            label: "Seller voice",
            note: "This stays a posture choice, not a writing system.",
            value: voice,
          },
          {
            label: "Booking motion",
            note: "Voice should support the handoff, not compete with it.",
            value: "One tone live",
          },
          {
            label: "AI posture",
            note: "Short recommendation only, not copy generation.",
            value: "Controlled",
          },
        ],
        summary:
          "Minimal intelligence belongs here as a short posture recommendation, because the product can steer tone without pretending to be a writing agent.",
        title: `${voice} keeps Seller coherent without opening copy sprawl.`,
        tone: "accent",
      };
    case "activation":
      return {
        badgeLabel: "Guided recommendation",
        detectedObjection:
          "Activation should not be mistaken for proof. Revenue only becomes commercially convincing after booked appointments are visible in Booking Inputs.",
        eyebrow: "Controlled Support",
        nextBestAction:
          "Go live once the core pillars are locked, then move straight to booked proof so the dashboard reads like revenue, not just configuration.",
        recommendedPath: "Activation complete -> booked proof -> revenue view",
        signals: [
          {
            label: "Main offer",
            note: "The workspace stays commercially narrow around one offer.",
            value: mainOffer,
          },
          {
            label: "Booking path",
            note: "Seller keeps one explicit handoff to booking.",
            value: bookingPath,
          },
          {
            label: "Revenue anchor",
            note: "Booked proof is the next thing that makes this feel real.",
            value: valuePerBooking,
          },
        ],
        summary:
          "This is the final activation read: a short recommendation, the main objection, and three visible proof anchors before the workspace goes live.",
        title: "Activation is ready to hand off into booked proof.",
        tone: "real",
      };
  }
}
