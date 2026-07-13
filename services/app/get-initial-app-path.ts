import "server-only";

import { prisma } from "@/db/prisma";
import type { AppContext } from "@/services/app/get-app-context";

export async function getInitialAppPath(appContext: AppContext) {
  const canonicalRecordCount = await prisma.canonicalRecord.count({
    where: { workspaceId: appContext.workspace.id, isActive: true },
  });

  return canonicalRecordCount > 0 ? "/app/dashboard" : "/app/imports";
}
