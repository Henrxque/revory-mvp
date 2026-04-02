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
    return "Value pending";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "Value pending";
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
      return "Offer pending";
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
      return "Lead entry pending";
  }
}

function formatBookingPath(value: string | null) {
  switch (value) {
    case "EMAIL":
      return "Primary booking path (Email)";
    case "SMS":
      return "Assisted booking path (SMS)";
    default:
      return "Path pending";
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
      return "Voice pending";
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
        badgeLabel: "Seller guidance",
        detectedObjection:
          "Spreading attention across multiple services too early would blur the first booking motion and weaken the promise to clone one best seller.",
        eyebrow: "Activation read",
        fallbackLabel: "If confidence softens",
        fallbackNote:
          "If the offer is still unclear, Seller stays in one-offer mode and waits for a single confident choice.",
        guardrailLabel: "Seller stays narrow",
        guardrailNote:
          "This step can recommend the strongest starting offer, but it never opens multi-offer strategy logic.",
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
          "A short recommendation here keeps the booking story narrow from the first step.",
        title: `${mainOffer} gives Seller a tighter booking story.`,
        tone: "accent",
      };
    case "source":
      if (selectedDataSourceType === null) {
        return {
          badgeLabel: "Seller guidance",
          detectedObjection:
            "Seller still needs one clear lead entry before booked proof can start reading like a product outcome.",
          eyebrow: "Activation read",
          fallbackLabel: "If confidence softens",
          fallbackNote:
            "Until one entry path is chosen, Seller keeps proof waiting and avoids implying any broader intake system.",
          guardrailLabel: "Seller stays narrow",
          guardrailNote:
            "Lead entry stays on a short supported list. No open intake design, no migration maze, no hidden setup project.",
          nextBestAction:
            "Choose the cleanest lead entry now. Appointments upload is the fastest path when booked visits already exist.",
          recommendedPath: "Choose lead entry -> booked proof -> revenue view",
          signals: [
            {
              label: "Lead entry",
              note: "This still needs one explicit choice.",
              value: "Lead entry next",
            },
            {
              label: "Booked proof path",
              note: "Proof waits until the entry path is explicit.",
              value: "Waiting on choice",
            },
            {
              label: "Current support",
              note: "Nothing is promoted until one entry path is selected.",
              value: "Not chosen yet",
            },
          ],
          summary:
            "Lead entry should stay explicit before Seller starts reading proof or support.",
          title: "Lead entry is still the missing activation choice.",
          tone: "future",
        };
      }

      return {
        badgeLabel: "Seller guidance",
        detectedObjection:
          selectedDataSourceType === "CLIENTS_CSV"
            ? "Starting from broader client records first can delay booked proof if the clinic already has appointments available."
            : "Lead entry should stay explicit so Seller never feels like a generic import manager.",
        eyebrow: "Activation read",
        fallbackLabel: "If confidence softens",
        fallbackNote:
          "If the input path is not clean yet, Seller falls back to supported entry types and keeps proof waiting.",
        guardrailLabel: "Seller stays narrow",
        guardrailNote:
          "Lead entry stays on a fixed shortlist. It never turns into open intake design or hidden migration work.",
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
            label: "Current support",
            note: "The product should not drift toward source administration.",
            value: "Keep guided",
          },
        ],
        summary:
          "Lead entry is where short guidance adds value fast without opening a broader intake system.",
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
        badgeLabel: "Seller guidance",
        detectedObjection:
          primaryChannel === "SMS"
            ? "SMS should stay one controlled booking lane, not the start of a broader conversational surface."
            : "Adding multiple booking lanes too early would make Seller feel heavier and less trustworthy.",
        eyebrow: "Activation read",
        fallbackLabel: "If confidence softens",
        fallbackNote:
          "If the handoff feels unclear, Seller falls back to one primary booking lane instead of branching into parallel paths.",
        guardrailLabel: "Seller stays narrow",
        guardrailNote:
          "Channel choice is bounded to one booking destination. It does not imply inbox behavior, free chat, or agent improvisation.",
        nextBestAction:
          primaryChannel === "EMAIL"
            ? "Email stays the recommended default when you want the clearest MVP handoff from interest to booked appointment."
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
          "Channel selection is the right place for a short default because it keeps the handoff clear without adding extra flow.",
        title:
          primaryChannel === "EMAIL"
            ? "Email is the recommended default booking path."
            : "SMS can stay premium only if the path remains tightly controlled.",
        tone: primaryChannel === "EMAIL" ? "real" : "future",
      };
    case "deal_value":
      return {
        badgeLabel: "Seller guidance",
        detectedObjection:
          valuePerBooking === "Value pending"
            ? "Without one directional booking value, the revenue view stays abstract even if booked appointments appear."
            : "This should stay one directional baseline, not the start of pricing logic or a finance workflow.",
        eyebrow: "Activation read",
        fallbackLabel: "If confidence softens",
        fallbackNote:
          "If the value is still uncertain, Seller keeps revenue waiting rather than inventing assumptions.",
        guardrailLabel: "Seller stays narrow",
        guardrailNote:
          "This recommendation stays inside one configured value baseline. It does not expand into forecasting or pricing tools.",
        nextBestAction:
          valuePerBooking === "Value pending"
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
            value: valuePerBooking === "Value pending" ? "Pending" : "Ready",
          },
          {
            label: "Scope guardrail",
            note: "No pricing engine, no filters, no plan calculator.",
            value: "One number",
          },
        ],
        summary:
          "A short recommendation here makes Seller feel economically aware without turning activation into pricing software.",
        title:
          valuePerBooking === "Value pending"
            ? "Value per booking is the missing revenue anchor."
            : `${valuePerBooking} keeps the revenue story legible from day one.`,
        tone: valuePerBooking === "Value pending" ? "future" : "accent",
      };
    case "mode":
      return {
        badgeLabel: "Seller guidance",
        detectedObjection:
          "Voice choice should never turn into a custom copy builder or an open-ended brand workshop inside activation.",
        eyebrow: "Activation read",
        fallbackLabel: "If confidence softens",
        fallbackNote:
          "If tone is still uncertain, Seller keeps the choice on closed voice presets instead of opening free-form writing.",
        guardrailLabel: "Seller stays narrow",
        guardrailNote:
          "Voice remains a preset posture choice. It does not branch into open generation or editing loops.",
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
            label: "Voice scope",
            note: "Preset guidance only, not free-form writing.",
            value: "Controlled",
          },
        ],
        summary:
          "A short posture recommendation belongs here without turning Seller into a writing tool.",
        title: `${voice} keeps Seller coherent without opening copy sprawl.`,
        tone: "accent",
      };
    case "activation":
      return {
        badgeLabel: "Seller guidance",
        detectedObjection:
          "Activation should not be mistaken for proof. Revenue only becomes commercially convincing after booked appointments are visible in Booking Inputs.",
        eyebrow: "Activation read",
        fallbackLabel: "If confidence softens",
        fallbackNote:
          "If proof is still missing after activation, Seller falls back to Booking Inputs as the next move.",
        guardrailLabel: "Seller stays narrow",
        guardrailNote:
          "Activation only hands off into booked proof and revenue view. It does not open broader playbook branches.",
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
          "This is the final activation read before the workspace goes live.",
        title: "Activation is ready to hand off into booked proof.",
        tone: "real",
      };
  }
}
