import type { RevoryConfidenceBand } from "@/types/intent-classification";

export type RevoryOperationalTemplateKey =
  | "confirmation"
  | "reminder"
  | "recovery"
  | "review_request";

export type RevoryOperationalTemplatePlaceholderKey =
  | "client_first_name"
  | "client_full_name"
  | "google_reviews_url"
  | "provider_name"
  | "scheduled_at"
  | "service_name";

export type RevoryOperationalTemplatePlaceholderDefinition = {
  key: RevoryOperationalTemplatePlaceholderKey;
  label: string;
  token: `{{${RevoryOperationalTemplatePlaceholderKey}}}`;
};

export type RevoryOperationalTemplateDefinition = {
  body: string;
  categoryLabel: string;
  description: string;
  key: RevoryOperationalTemplateKey;
  placeholders: RevoryOperationalTemplatePlaceholderKey[];
  title: string;
};

export type RevoryOperationalTemplatePreviewMode = "controlled_sample" | "live_preview";

export type RevoryOperationalOutreachPreparationState =
  | "detected"
  | "recommended"
  | "prepared"
  | "ready";

export const revoryTemplateObjectionCodes = [
  "NO_ACTIVE_OBJECTION",
  "CONTACT_PATH_BLOCKED",
  "SCHEDULE_CHANGE_RISK",
  "ATTENDANCE_DROP_RISK",
  "RETURN_TO_BOOKING_RESISTANCE",
  "FEEDBACK_FRICTION",
] as const;

export type RevoryTemplateObjectionCode =
  (typeof revoryTemplateObjectionCodes)[number];

export type RevoryOperationalTemplatePreview = {
  blockedReason: string | null;
  body: string;
  categoryLabel: string;
  confidenceBand: RevoryConfidenceBand | null;
  description: string;
  isRecommended: boolean;
  key: RevoryOperationalTemplateKey;
  liveItemCount: number;
  objectionCode: RevoryTemplateObjectionCode | null;
  outreachState: RevoryOperationalOutreachPreparationState;
  outreachStateLabel: string;
  placeholders: RevoryOperationalTemplatePlaceholderDefinition[];
  previewMode: RevoryOperationalTemplatePreviewMode;
  previewModeLabel: string;
  replyBlock: string;
  replyBlockMode: "adapted" | "default";
  suggestedNextStep: string;
  title: string;
};
