"use server";

import { revalidatePath } from "next/cache";

import { getAppContext } from "@/services/app/get-app-context";
import { canUseBillingPlanFeature } from "@/services/billing/workspace-billing";
import { createManualLeadBookingOpportunity } from "@/services/lead-booking/create-manual-lead-booking-opportunity";

type CreateManualLeadQuickAddInput = {
  email: string;
  fullName: string;
  phone: string;
  sourceLabel: string;
};

type CreateManualLeadQuickAddResult =
  | {
      clientName: string;
      message: string;
      ok: true;
      opportunityId: string;
      status: "BLOCKED" | "BOOKED" | "CLOSED" | "OPEN" | "READY";
    }
  | {
      message: string;
      ok: false;
    };

export async function createManualLeadQuickAdd(
  input: CreateManualLeadQuickAddInput,
): Promise<CreateManualLeadQuickAddResult> {
  const appContext = await getAppContext();

  if (!appContext) {
    return {
      message: "Your REVORY session expired before this evidence input could create a booking-risk read.",
      ok: false,
    };
  }

  if (
    !canUseBillingPlanFeature(
      appContext.workspace.planKey,
      "MANUAL_LEAD_QUICK_ADD",
    )
  ) {
    return {
      message: "Manual evidence add is included with Growth. Basic stays import-first.",
      ok: false,
    };
  }

  try {
    const result = await createManualLeadBookingOpportunity({
      activationSetup: appContext.activationSetup,
      email: input.email,
      fullName: input.fullName,
      phone: input.phone,
      sourceLabel: input.sourceLabel,
      workspaceId: appContext.workspace.id,
    });

    revalidatePath("/app/imports");
    revalidatePath("/app/dashboard");

    return {
      clientName: result.clientName,
      message: `${result.clientName} was added to today's booking-risk read.`,
      ok: true,
      opportunityId: result.opportunityId,
      status: result.status,
    };
  } catch (error) {
    return {
      message:
        error instanceof Error && error.message
          ? error.message
          : "REVORY could not create this manual booking-risk read right now.",
      ok: false,
    };
  }
}
