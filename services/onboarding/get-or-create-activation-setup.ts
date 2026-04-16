import "server-only";

import { Prisma, type ActivationSetup, type Workspace } from "@prisma/client";

import { prisma } from "@/db/prisma";

export async function getOrCreateActivationSetup(
  workspace: Workspace,
): Promise<ActivationSetup> {
  const existingSetup = await prisma.activationSetup.findUnique({
    where: {
      workspaceId: workspace.id,
    },
  });

  if (existingSetup) {
    return existingSetup;
  }

  try {
    return await prisma.activationSetup.create({
      data: {
        workspaceId: workspace.id,
        currentStep: "template",
        isCompleted: false,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return prisma.activationSetup.findUniqueOrThrow({
        where: {
          workspaceId: workspace.id,
        },
      });
    }

    throw error;
  }
}
