import "server-only";

import { cache } from "react";
import type { ActivationSetup, User, Workspace } from "@prisma/client";

import { syncAuthenticatedUser } from "@/services/auth/sync-user";
import { getOrCreateActivationSetup } from "@/services/onboarding/get-or-create-activation-setup";
import { getOrCreateWorkspace } from "@/services/workspaces/get-or-create-workspace";

export type AppContext = {
  activationSetup: ActivationSetup;
  user: User;
  workspace: Workspace;
};

export const getAppContext = cache(async (): Promise<AppContext | null> => {
  const user = await syncAuthenticatedUser();

  if (!user) {
    return null;
  }

  const workspace = await getOrCreateWorkspace(user);
  const activationSetup = await getOrCreateActivationSetup(workspace);

  return {
    activationSetup,
    user,
    workspace,
  };
});
