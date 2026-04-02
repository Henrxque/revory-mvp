export type RevoryDecisionSupportTone = "accent" | "real" | "future" | "neutral";

export type RevoryDecisionSupportSignal = {
  label: string;
  note: string;
  value: string;
};

export type RevoryDecisionSupportRead = {
  badgeLabel: string;
  detectedObjection: string;
  eyebrow: string;
  fallbackLabel: string;
  fallbackNote: string;
  guardrailLabel: string;
  guardrailNote: string;
  nextBestAction: string;
  recommendedPath: string;
  signals: RevoryDecisionSupportSignal[];
  summary: string;
  title: string;
  tone: RevoryDecisionSupportTone;
};
