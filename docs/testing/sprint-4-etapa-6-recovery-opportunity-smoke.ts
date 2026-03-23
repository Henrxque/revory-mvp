import { AppointmentStatus } from "@prisma/client";

import { buildRecoveryOpportunityClassification } from "@/services/recovery/build-recovery-opportunity-classification";

const now = new Date("2026-03-22T12:00:00.000Z");

const result = buildRecoveryOpportunityClassification(
  [
    {
      client: {
        email: "recover@example.com",
        firstName: "Ashley",
        fullName: "Ashley Monroe",
        id: "client-1",
        lastName: "Monroe",
      },
      estimatedRevenue: 320,
      id: "appointment-canceled-open",
      providerName: "Dr. Cole",
      scheduledAt: new Date("2026-03-21T16:00:00.000Z"),
      serviceName: "Hydrafacial",
      status: AppointmentStatus.CANCELED,
    },
    {
      client: {
        email: null,
        firstName: "Bianca",
        fullName: "Bianca Vega",
        id: "client-2",
        lastName: "Vega",
      },
      estimatedRevenue: 180,
      id: "appointment-no-show-blocked",
      providerName: "Nurse Anne",
      scheduledAt: new Date("2026-03-20T10:00:00.000Z"),
      serviceName: "Botox consultation",
      status: AppointmentStatus.NO_SHOW,
    },
    {
      client: {
        email: "rebooked@example.com",
        firstName: "Celia",
        fullName: "Celia Frost",
        id: "client-3",
        lastName: "Frost",
      },
      estimatedRevenue: 400,
      id: "appointment-canceled-rebooked",
      providerName: "Dr. Vale",
      scheduledAt: new Date("2026-03-22T09:00:00.000Z"),
      serviceName: "Laser package",
      status: AppointmentStatus.CANCELED,
    },
  ],
  [
    {
      clientId: "client-3",
      scheduledAt: new Date("2026-03-25T12:00:00.000Z"),
    },
  ],
  now,
);

console.log(
  JSON.stringify(
    {
      blockedMissingEmailCount: result.blockedMissingEmailCount,
      canceledOpportunityCount: result.canceledOpportunityCount,
      itemSummaries: result.items.map((item) => ({
        appointmentId: item.appointmentId,
        primaryReasonCode: item.reasons[0]?.code ?? null,
        recoveryState: item.recoveryState,
      })),
      noShowOpportunityCount: result.noShowOpportunityCount,
      opportunityCount: result.opportunityCount,
      readyForRecoveryCount: result.readyForRecoveryCount,
      totalDisruptedAppointmentsInWindow: result.totalDisruptedAppointmentsInWindow,
    },
    null,
    2,
  ),
);
