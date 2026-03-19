import "server-only";

import type { ActivationSetup, Workspace } from "@prisma/client";

import { prisma } from "@/db/prisma";

export async function getOrCreateActivationSetup(
  workspace: Workspace,
): Promise<ActivationSetup> {
  return prisma.activationSetup.upsert({
    where: {
      workspaceId: workspace.id,
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      currentStep: "template",
      isCompleted: false,
    },
  });
}
