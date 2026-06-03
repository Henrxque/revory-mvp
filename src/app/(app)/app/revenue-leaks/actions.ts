"use server";

import { revalidatePath } from "next/cache";
import type { RevenueLeakStatus } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { getAppContext } from "@/services/app/get-app-context";

export type RevenueLeakStatusActionState = {
  message: string;
  ok: boolean;
};

export async function acknowledgeRevenueLeakAction(
  revenueLeakId: string,
): Promise<RevenueLeakStatusActionState> {
  return updateRevenueLeakStatus({
    id: revenueLeakId,
    nextStatus: "ACKNOWLEDGED",
    successMessage: "Revenue leak signal acknowledged.",
  });
}

export async function dismissRevenueLeakAction(
  revenueLeakId: string,
): Promise<RevenueLeakStatusActionState> {
  return updateRevenueLeakStatus({
    id: revenueLeakId,
    nextStatus: "DISMISSED",
    successMessage: "Revenue leak signal dismissed from the active read.",
  });
}

async function updateRevenueLeakStatus(input: {
  id: string;
  nextStatus: Extract<RevenueLeakStatus, "ACKNOWLEDGED" | "DISMISSED">;
  successMessage: string;
}): Promise<RevenueLeakStatusActionState> {
  const appContext = await getAppContext();

  if (!appContext) {
    return {
      message: "Your REVORY session expired before this signal could be updated.",
      ok: false,
    };
  }

  const leak = await prisma.revenueLeak.findUnique({
    select: {
      id: true,
      status: true,
      workspaceId: true,
    },
    where: {
      id: input.id,
    },
  });

  if (!leak || leak.workspaceId !== appContext.workspace.id) {
    return {
      message: "REVORY could not find this revenue leak signal in your workspace.",
      ok: false,
    };
  }

  if (leak.status === "RESOLVED" || leak.status === "DISMISSED") {
    return {
      message: "This signal is already closed and was not reopened automatically.",
      ok: false,
    };
  }

  await prisma.revenueLeak.update({
    data: {
      status: input.nextStatus,
    },
    where: {
      id: leak.id,
    },
  });

  revalidatePath("/app/revenue-leaks");
  revalidatePath("/app/dashboard");

  return {
    message: input.successMessage,
    ok: true,
  };
}
