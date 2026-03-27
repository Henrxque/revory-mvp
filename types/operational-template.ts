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

export type RevoryOperationalTemplatePreview = {
  blockedReason: string | null;
  body: string;
  categoryLabel: string;
  description: string;
  key: RevoryOperationalTemplateKey;
  liveItemCount: number;
  outreachState: RevoryOperationalOutreachPreparationState;
  outreachStateLabel: string;
  placeholders: RevoryOperationalTemplatePlaceholderDefinition[];
  previewMode: RevoryOperationalTemplatePreviewMode;
  previewModeLabel: string;
  suggestedNextStep: string;
  title: string;
};
