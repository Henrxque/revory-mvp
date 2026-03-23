import { AppointmentStatus } from "@prisma/client";

import { buildReminderClassification } from "@/services/reminder/build-reminder-classification";

const now = new Date("2026-03-22T12:00:00.000Z");

const result = buildReminderClassification(
  [
    {
      client: {
        email: "ashley@example.com",
        firstName: "Ashley",
        fullName: "Ashley Monroe",
        id: "client-1",
        lastName: "Monroe",
      },
      estimatedRevenue: 320,
      id: "appointment-ready",
      providerName: "Dr. Cole",
      scheduledAt: new Date("2026-03-23T08:00:00.000Z"),
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
      id: "appointment-missing-email",
      providerName: "Nurse Anne",
      scheduledAt: new Date("2026-03-23T10:00:00.000Z"),
      serviceName: "Botox consultation",
      status: AppointmentStatus.SCHEDULED,
    },
    {
      client: {
        email: "later@example.com",
        firstName: "Celia",
        fullName: "Celia Frost",
        id: "client-3",
        lastName: "Frost",
      },
      estimatedRevenue: null,
      id: "appointment-later",
      providerName: null,
      scheduledAt: new Date("2026-03-25T12:00:00.000Z"),
      serviceName: "Laser package",
      status: AppointmentStatus.SCHEDULED,
    },
    {
      client: {
        email: "past@example.com",
        firstName: "Dana",
        fullName: "Dana Hart",
        id: "client-4",
        lastName: "Hart",
      },
      estimatedRevenue: 220,
      id: "appointment-past",
      providerName: "Dr. Lee",
      scheduledAt: new Date("2026-03-22T08:00:00.000Z"),
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
      scheduledAt: new Date("2026-03-23T09:00:00.000Z"),
      serviceName: "Injectables",
      status: AppointmentStatus.COMPLETED,
    },
  ],
  now,
);

console.log(
  JSON.stringify(
    {
      blockedMissingEmailCount: result.blockedMissingEmailCount,
      itemStates: result.items.map((item) => ({
        appointmentId: item.appointmentId,
        state: item.reminderState,
      })),
      needsAttentionCount: result.needsAttentionCount,
      readyForReminderCount: result.readyForReminderCount,
      scheduledLaterCount: result.scheduledLaterCount,
      totalFutureScheduledAppointments: result.totalFutureScheduledAppointments,
    },
    null,
    2,
  ),
);
