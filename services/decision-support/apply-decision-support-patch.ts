import type { RevoryDecisionSupportRead } from "@/types/decision-support";
import type { RevoryDecisionSupportPatch } from "@/types/decision-support-llm";

export function toDecisionSupportPatch(
  read: RevoryDecisionSupportRead,
): RevoryDecisionSupportPatch {
  return {
    detectedObjection: read.detectedObjection,
    nextBestAction: read.nextBestAction,
    recommendedPath: read.recommendedPath,
    summary: read.summary,
    title: read.title,
  };
}

export function applyDecisionSupportPatch(
  read: RevoryDecisionSupportRead,
  patch: RevoryDecisionSupportPatch | null,
): RevoryDecisionSupportRead {
  if (!patch) {
    return read;
  }

  return {
    ...read,
    detectedObjection: patch.detectedObjection,
    nextBestAction: patch.nextBestAction,
    recommendedPath: patch.recommendedPath,
    summary: patch.summary,
    title: patch.title,
  };
}
