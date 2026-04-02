export type RevoryBoundedLlmUseCase = "activation" | "dashboard" | "imports";

export type RevoryDecisionSupportPatch = {
  detectedObjection: string;
  nextBestAction: string;
  recommendedPath: string;
  summary: string;
  title: string;
};

export type RevoryBoundedLlmRequest = {
  context: Record<string, unknown>;
  fallback: RevoryDecisionSupportPatch;
  prompt: string;
  useCase: RevoryBoundedLlmUseCase;
};
