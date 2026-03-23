export type RevoryOperationalTone = "accent" | "future" | "neutral" | "real";

export type RevoryOperationalCategoryKey =
  | "at_risk"
  | "confirmation"
  | "recovery"
  | "reminder"
  | "review_request";

export type RevoryOperationalCard = {
  blockedCount: number;
  count: number;
  description: string;
  kindLabel: "Insight" | "Status";
  key: RevoryOperationalCategoryKey;
  nextAction: string;
  title: string;
  tone: RevoryOperationalTone;
};

export type RevoryOperationalPriorityItem = {
  categoryKey: RevoryOperationalCategoryKey;
  categoryLabel: string;
  clientName: string;
  estimatedRevenue: number | null;
  id: string;
  insight: string;
  nextAction: string;
  providerName: string | null;
  serviceName: string | null;
  stateLabel: string;
  stateTone: RevoryOperationalTone;
  timestamp: Date;
  timestampLabel: "Completed" | "Disrupted" | "Scheduled";
};

export type RevoryOperationalSurface = {
  blockedCount: number;
  categoryCards: RevoryOperationalCard[];
  generatedAt: Date;
  hasAppointmentBase: boolean;
  hasLiveSignals: boolean;
  needsAttentionNowCount: number;
  priorityItems: RevoryOperationalPriorityItem[];
  prioritySummary: {
    description: string;
    headline: string;
    suggestedNextAction: string;
  };
};
