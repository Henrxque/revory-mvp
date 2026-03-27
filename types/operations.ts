import type { RevoryOperationalTemplatePreview } from "@/types/operational-template";

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
  emptyLabel: string;
  blockedReason: string | null;
  kindLabel: string;
  key: RevoryOperationalCategoryKey;
  nextAction: string;
  readinessLabel: string;
  title: string;
  tone: RevoryOperationalTone;
};

export type RevoryOperationalReadinessState = "blocked" | "prepared" | "ready_now";

export type RevoryOperationalPriorityItem = {
  blockedReason: string | null;
  categoryKey: RevoryOperationalCategoryKey;
  categoryLabel: string;
  clientName: string;
  estimatedRevenue: number | null;
  id: string;
  insight: string;
  nextAction: string;
  providerName: string | null;
  readinessLabel: string;
  readinessState: RevoryOperationalReadinessState;
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
  readinessSummary: {
    blockedCount: number;
    nextActionCount: number;
    preparedCount: number;
    readyNowCount: number;
  };
  templatePreviews: RevoryOperationalTemplatePreview[];
};
