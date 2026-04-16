"use server";

import { revalidatePath } from "next/cache";
import { LeadBookingOpportunityStatus } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { getAppContext } from "@/services/app/get-app-context";

export async function recordLeadBookingHandoff(opportunityId: string) {
  const appContext = await getAppContext();

  if (!appContext) {
    throw new Error("Your REVORY session expired before the booking handoff could open.");
  }

  const opportunity = await prisma.leadBookingOpportunity.findUnique({
    select: {
      id: true,
      status: true,
      workspaceId: true,
    },
    where: {
      id: opportunityId,
    },
  });

  if (!opportunity || opportunity.workspaceId !== appContext.workspace.id) {
    throw new Error("REVORY could not find this booking handoff.");
  }

  if (opportunity.status !== LeadBookingOpportunityStatus.READY) {
    throw new Error("This opportunity is not ready for booking handoff.");
  }

  const handoffOpenedAt = new Date();

  await prisma.leadBookingOpportunity.update({
    data: {
      handoffOpenedAt,
    },
    where: {
      id: opportunity.id,
    },
  });

  revalidatePath("/app/imports");

  return {
    handoffOpenedAt: handoffOpenedAt.toISOString(),
  };
}
