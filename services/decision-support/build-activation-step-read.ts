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
      return "Data entry pending";
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
        badgeLabel: "REVORY guidance",
        detectedObjection:
          "Spreading attention across multiple services too early would blur which appointment and booking risks matter most.",
        eyebrow: "Activation read",
        fallbackLabel: "If confidence softens",
        fallbackNote:
          "If the offer is still unclear, REVORY stays in one-offer mode and waits for a single confident choice.",
        guardrailLabel: "REVORY stays narrow",
        guardrailNote:
          "This step can recommend the strongest starting offer, but it never opens multi-offer strategy logic.",
        nextBestAction: `${mainOffer} is the cleanest starting anchor when the goal is one revenue leak read instead of a broader service menu.`,
        recommendedPath: "One main offer -> data entry -> one booking path",
        signals: [
          {
            label: "Main offer",
            note: "This is the one offer REVORY will use for risk context first.",
            value: mainOffer,
          },
          {
            label: "Next move",
            note: "After this, data entry should stay equally narrow.",
            value: "Lock data entry",
          },
          {
            label: "Commercial gain",
            note: "A narrower start makes the product feel more premium and easier to trust.",
            value: "One offer live",
          },
        ],
        summary:
          "A short recommendation here keeps the leak-read story narrow from the first step.",
        title: `${mainOffer} gives REVORY a tighter risk context.`,
        tone: "accent",
      };
    case "source":
      if (selectedDataSourceType === null) {
        return {
          badgeLabel: "REVORY guidance",
          detectedObjection:
            "REVORY still needs one clear data entry path before appointment evidence can support the leak read.",
          eyebrow: "Activation read",
          fallbackLabel: "If confidence softens",
          fallbackNote:
            "Until one entry path is chosen, REVORY keeps evidence waiting and avoids implying any broader intake system.",
          guardrailLabel: "REVORY stays narrow",
          guardrailNote:
            "Data entry stays on a short supported list. No open intake design, no migration maze, no hidden setup project.",
          nextBestAction:
            "Choose the cleanest data entry path now. Appointments upload is the fastest path when appointment evidence already exists.",
          recommendedPath: "Choose data entry -> appointment evidence -> leak read",
          signals: [
            {
              label: "Data entry",
              note: "This still needs one explicit choice.",
              value: "Data entry next",
            },
            {
              label: "Evidence path",
              note: "Evidence waits until the entry path is explicit.",
              value: "Waiting on choice",
            },
            {
              label: "Current support",
              note: "Nothing is promoted until one entry path is selected.",
              value: "Not chosen yet",
            },
          ],
          summary:
            "Data entry should stay explicit before REVORY starts reading evidence or support.",
          title: "Data entry is still the missing activation choice.",
          tone: "future",
        };
      }

      return {
        badgeLabel: "REVORY guidance",
        detectedObjection:
          selectedDataSourceType === "CLIENTS_CSV"
            ? "Starting from broader client records first can delay appointment evidence if the clinic already has appointments available."
            : "Data entry should stay explicit so REVORY never feels like a generic import manager.",
        eyebrow: "Activation read",
        fallbackLabel: "If confidence softens",
        fallbackNote:
          "If the input path is not clean yet, REVORY falls back to supported entry types and keeps evidence waiting.",
        guardrailLabel: "REVORY stays narrow",
        guardrailNote:
          "Data entry stays on a fixed shortlist. It never turns into open intake design or hidden migration work.",
        nextBestAction:
          selectedDataSourceType === "APPOINTMENTS_CSV"
            ? "Keep appointments upload first when the clinic already exports visits. That is the shortest path to evidence and revenue risk confidence."
            : selectedDataSourceType === "CLIENTS_CSV"
              ? "Use client export first only when the workspace needs client context before appointment evidence can exist."
              : "Use guided CSV upload only as a controlled fallback when the export needs one short normalization pass.",
        recommendedPath:
          selectedDataSourceType === "APPOINTMENTS_CSV"
            ? "Appointments upload -> appointment evidence -> leak read"
            : selectedDataSourceType === "CLIENTS_CSV"
              ? "Client export -> client context -> appointment evidence later"
              : "Guided CSV upload -> clean data entry -> appointment evidence",
        signals: [
          {
            label: "Data entry",
            note: "This is where REVORY reads clinic evidence first.",
            value: leadEntry,
          },
          {
            label: "Evidence path",
            note: "Appointments remain the fastest evidence lane when available.",
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
          "Data entry is where short guidance adds value fast without opening a broader intake system.",
        title:
          selectedDataSourceType === "APPOINTMENTS_CSV"
            ? "Appointments upload is the fastest path to appointment evidence."
            : selectedDataSourceType === "CLIENTS_CSV"
              ? "Client export can work, but it makes appointment evidence one step more indirect."
              : "Guided CSV upload keeps edge cases contained.",
        tone: selectedDataSourceType === "APPOINTMENTS_CSV" ? "real" : "future",
      };
    case "channel":
      return {
        badgeLabel: "REVORY guidance",
        detectedObjection:
          primaryChannel === "SMS"
            ? "SMS should stay one controlled booking lane, not the start of a broader conversational surface."
            : "Adding multiple booking lanes too early would make REVORY feel heavier and less trustworthy.",
        eyebrow: "Activation read",
        fallbackLabel: "If confidence softens",
        fallbackNote:
          "If the handoff feels unclear, REVORY falls back to one primary booking lane instead of branching into parallel paths.",
        guardrailLabel: "REVORY stays narrow",
        guardrailNote:
          "Channel choice is bounded to one booking destination. It does not imply inbox behavior, free chat, or agent improvisation.",
        nextBestAction:
          primaryChannel === "EMAIL"
            ? "Email stays the recommended default when you want the clearest MVP handoff from interest to booked appointment."
            : "Use SMS only as one explicit booking destination. It should not imply open chat, triage sprawl, or multiple parallel paths.",
        recommendedPath:
          primaryChannel === "EMAIL"
            ? "Booking risk -> email path -> appointment evidence"
            : "Booking risk -> controlled SMS path -> appointment evidence",
        signals: [
          {
            label: "Booking path",
            note: "REVORY should read one destination, not a route maze.",
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
        badgeLabel: "REVORY guidance",
        detectedObjection:
          valuePerBooking === "Value pending"
            ? "Without one directional value, estimated revenue at risk stays abstract even if appointment evidence appears."
            : "This should stay one directional baseline, not the start of pricing logic or a finance workflow.",
        eyebrow: "Activation read",
        fallbackLabel: "If confidence softens",
        fallbackNote:
          "If the value is still uncertain, REVORY keeps the risk read waiting rather than inventing assumptions.",
        guardrailLabel: "REVORY stays narrow",
        guardrailNote:
          "This recommendation stays inside one configured value baseline. It does not expand into forecasting or pricing tools.",
        nextBestAction:
          valuePerBooking === "Value pending"
            ? "Set one clean estimated value so revenue at risk can read as grounded from the first visible appointments."
            : `Keep ${valuePerBooking} as the directional value unless the clinic needs a materially different baseline to explain risk honestly.`,
        recommendedPath: "Configured estimated value -> appointment evidence -> leak read",
        signals: [
          {
            label: "Estimated value",
            note: "This is the baseline REVORY uses when direct appointment value is missing.",
            value: valuePerBooking,
          },
          {
            label: "Leak read",
            note: "The dashboard needs one value before it needs more math.",
            value: valuePerBooking === "Value pending" ? "Pending" : "Ready",
          },
          {
            label: "Scope guardrail",
            note: "No pricing engine, no filters, no plan calculator.",
            value: "One number",
          },
        ],
        summary:
          "A short recommendation here makes REVORY feel economically aware without turning activation into pricing software.",
        title:
          valuePerBooking === "Value pending"
            ? "Estimated value is the missing revenue risk anchor."
            : `${valuePerBooking} keeps the revenue risk story legible from day one.`,
        tone: valuePerBooking === "Value pending" ? "future" : "accent",
      };
    case "mode":
      return {
        badgeLabel: "REVORY guidance",
        detectedObjection:
          "Voice choice should never turn into a custom copy builder or an open-ended brand workshop inside activation.",
        eyebrow: "Activation read",
        fallbackLabel: "If confidence softens",
        fallbackNote:
          "If tone is still uncertain, REVORY keeps the choice on closed message-tone presets instead of opening free-form writing.",
        guardrailLabel: "REVORY stays narrow",
        guardrailNote:
          "Voice remains a preset posture choice. It does not branch into open generation or editing loops.",
        nextBestAction: `${voice} works best when it reinforces the same booking path consistently instead of trying to cover every edge case in tone.`,
        recommendedPath: "One message tone -> one booking path -> one consistent read",
        signals: [
          {
            label: "Message tone",
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
          "A short posture recommendation belongs here without turning REVORY into a writing tool.",
        title: `${voice} keeps REVORY coherent without opening copy sprawl.`,
        tone: "accent",
      };
    case "activation":
      return {
        badgeLabel: "REVORY guidance",
        detectedObjection:
          "Activation should not be mistaken for evidence. Revenue at risk only becomes credible after appointment evidence is visible in Clinic Data.",
        eyebrow: "Activation read",
        fallbackLabel: "If confidence softens",
        fallbackNote:
          "If evidence is still missing after activation, REVORY falls back to Clinic Data as the next move.",
        guardrailLabel: "REVORY stays narrow",
        guardrailNote:
          "Activation only hands off into appointment evidence and the leak read. It does not open broader playbook branches.",
        nextBestAction:
          "Activate once the core pillars are locked, then move straight to appointment evidence so the dashboard reads like revenue risk, not just configuration.",
        recommendedPath: "Activation complete -> appointment evidence -> leak read",
        signals: [
          {
            label: "Main offer",
            note: "The workspace stays commercially narrow around one offer.",
            value: mainOffer,
          },
          {
            label: "Booking path",
            note: "REVORY keeps one explicit handoff to booking.",
            value: bookingPath,
          },
          {
            label: "Revenue anchor",
            note: "Appointment evidence is the next thing that makes this feel real.",
            value: valuePerBooking,
          },
        ],
        summary:
          "This is the final activation read before the workspace goes live.",
        title: "Activation is ready to hand off into appointment evidence.",
        tone: "real",
      };
  }
}
