import "server-only";

import { getAtRiskClassification } from "@/services/at-risk/get-at-risk-classification";
import { getConfirmationClassification } from "@/services/confirmation/get-confirmation-classification";
import { buildOperationalSurface } from "@/services/operations/build-operational-surface";
import { getRecoveryOpportunityClassification } from "@/services/recovery/get-recovery-opportunity-classification";
import { getReminderClassification } from "@/services/reminder/get-reminder-classification";
import { getReviewRequestEligibilityClassification } from "@/services/review-request/get-review-request-eligibility-classification";
import type { RevoryOperationalSurface } from "@/types/operations";

export async function getOperationalSurface(
  workspaceId: string,
  hasAppointmentBase: boolean,
  now = new Date(),
): Promise<RevoryOperationalSurface> {
  const [atRisk, confirmation, recovery, reminder, reviewRequest] =
    await Promise.all([
      getAtRiskClassification(workspaceId, now),
      getConfirmationClassification(workspaceId, now),
      getRecoveryOpportunityClassification(workspaceId, now),
      getReminderClassification(workspaceId, now),
      getReviewRequestEligibilityClassification(workspaceId, now),
    ]);

  return await buildOperationalSurface({
    atRisk,
    confirmation,
    hasAppointmentBase,
    recovery,
    reminder,
    reviewRequest,
  });
}
