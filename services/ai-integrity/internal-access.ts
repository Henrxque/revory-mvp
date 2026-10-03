import "server-only";

import { isInternalMigrationPreviewEnabled } from "@/services/app/internal-preview";
import { isWorkspaceProductAdmin } from "@/services/app/product-admin";
import { isAiIntegrityExperienceEnabled } from "./experience";

export async function canUseAiIntegrityIntakePreview(workspaceId: string) {
  return process.env.NODE_ENV !== "production"
    && (isAiIntegrityExperienceEnabled() || isInternalMigrationPreviewEnabled() || await isWorkspaceProductAdmin(workspaceId));
}
