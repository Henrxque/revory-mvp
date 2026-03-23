import { AppointmentStatus } from "@prisma/client";

import { buildAtRiskClassification } from "@/services/at-risk/build-at-risk-classification";

const now = new Date("2026-03-22T12:00:00.000Z");

const result = buildAtRiskClassification(
  [
    {
      client: {
        email: "soon@example.com",
        firstName: "Ashley",
        fullName: "Ashley Monroe",
        id: "client-1",
        lastName: "Monroe",
      },
      estimatedRevenue: 320,
      id: "appointment-tight-window",
      providerName: "Dr. Cole",
      scheduledAt: new Date("2026-03-22T16:00:00.000Z"),
      serviceName: "Hydrafacial",
      status: AppointmentStatus.SCHEDULED,
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
      id: "appointment-reminder-blocked",
      providerName: "Nurse Anne",
      scheduledAt: new Date("2026-03-23T06:00:00.000Z"),
      serviceName: "Botox consultation",
      status: AppointmentStatus.SCHEDULED,
    },
    {
      client: {
        email: null,
        firstName: "Celia",
        fullName: "Celia Frost",
        id: "client-3",
        lastName: "Frost",
      },
      estimatedRevenue: 400,
      id: "appointment-confirmation-watch",
      providerName: "Dr. Vale",
      scheduledAt: new Date("2026-03-23T18:00:00.000Z"),
      serviceName: "Laser package",
      status: AppointmentStatus.SCHEDULED,
    },
    {
      client: {
        email: "later@example.com",
        firstName: "Dana",
        fullName: "Dana Hart",
        id: "client-4",
        lastName: "Hart",
      },
      estimatedRevenue: 220,
      id: "appointment-not-at-risk",
      providerName: "Dr. Lee",
      scheduledAt: new Date("2026-03-25T12:00:00.000Z"),
      serviceName: "Peel",
      status: AppointmentStatus.SCHEDULED,
    },
    {
      client: {
        email: "completed@example.com",
        firstName: "Ella",
        fullName: "Ella Moon",
        id: "client-5",
        lastName: "Moon",
      },
      estimatedRevenue: 250,
      id: "appointment-completed",
      providerName: "Dr. Fox",
      scheduledAt: new Date("2026-03-22T18:00:00.000Z"),
      serviceName: "Injectables",
      status: AppointmentStatus.COMPLETED,
    },
  ],
  now,
);

console.log(
  JSON.stringify(
    {
      atRiskCount: result.atRiskCount,
      attentionNowCount: result.attentionNowCount,
      blockedContactCount: result.blockedContactCount,
      itemSummaries: result.items.map((item) => ({
        appointmentId: item.appointmentId,
        attentionLevel: item.attentionLevel,
        primaryReasonCode: item.primaryReasonCode,
      })),
      tightWindowCount: result.tightWindowCount,
      totalFutureScheduledAppointments: result.totalFutureScheduledAppointments,
      watchlistCount: result.watchlistCount,
    },
    null,
    2,
  ),
);
