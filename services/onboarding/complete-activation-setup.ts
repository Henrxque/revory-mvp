import "server-only";

import { WorkspaceStatus, type ActivationSetup, type Workspace } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { getOnboardingDataSource } from "@/services/onboarding/upsert-onboarding-data-source";

type ActivationCompletionResult =
  | {
      activationSetup: ActivationSetup;
      workspace: Workspace;
      ok: true;
    }
  | {
      ok: false;
    };

export async function completeActivationSetup(
  workspaceId: string,
): Promise<ActivationCompletionResult> {
  const [activationSetup, workspace, onboardingDataSource] = await Promise.all([
    prisma.activationSetup.findUnique({
      where: {
        workspaceId,
      },
    }),
    prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
    }),
    getOnboardingDataSource(workspaceId),
  ]);

  if (!activationSetup || !workspace) {
    return { ok: false };
  }

  if (
    !activationSetup.selectedTemplate ||
    !activationSetup.averageDealValue ||
    !activationSetup.recommendedModeKey ||
    !activationSetup.primaryChannel ||
    !onboardingDataSource
  ) {
    return { ok: false };
  }

  const activatedAt = activationSetup.activatedAt ?? new Date();

  const [updatedActivationSetup, updatedWorkspace] = await prisma.$transaction([
    prisma.activationSetup.update({
      where: {
        workspaceId,
      },
      data: {
        activatedAt,
        currentStep: "activation",
        isCompleted: true,
      },
    }),
    prisma.workspace.update({
      where: {
        id: workspaceId,
      },
      data: {
        activeModeKey: activationSetup.recommendedModeKey,
        status: WorkspaceStatus.ACTIVE,
      },
    }),
  ]);

  return {
    activationSetup: updatedActivationSetup,
    ok: true,
    workspace: updatedWorkspace,
  };
}
