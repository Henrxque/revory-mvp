import "server-only";

export function isAiIntegrityExperienceEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.REVORY_AI_SAAS_PREVIEW === "true";
}
