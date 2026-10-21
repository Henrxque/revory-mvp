import "server-only";

import { isInternalMigrationPreviewEnabled } from "@/services/app/internal-preview";
import { isWorkspaceProductAdmin } from "@/services/app/product-admin";
import { isAiIntegrityExperienceEnabled } from "./experience";

export async function canUseAiIntegrityIntakePreview(workspaceId: string) {
  if (isAiIntegrityExperienceEnabled()) return true;
  return process.env.NODE_ENV !== "production"
    && (isInternalMigrationPreviewEnabled() || await isWorkspaceProductAdmin(workspaceId));
}
