import "server-only";

import type { ActivationSetup, Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";

export async function updateActivationSetup(
  workspaceId: string,
  data: Prisma.ActivationSetupUpdateInput,
): Promise<ActivationSetup> {
  return prisma.activationSetup.update({
    where: {
      workspaceId,
    },
    data,
  });
}
