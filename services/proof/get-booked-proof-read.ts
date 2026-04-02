import "server-only";

import { AppointmentStatus } from "@prisma/client";

import { prisma } from "@/db/prisma";

export type BookedProofRead = {
  hasBookedProofVisible: boolean;
  visibleBookedAppointments: number;
};

export async function getBookedProofRead(
  workspaceId: string,
): Promise<BookedProofRead> {
  const visibleBookedAppointments = await prisma.appointment.count({
    where: {
      status: {
        in: [AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED],
      },
      workspaceId,
    },
  });

  return {
    hasBookedProofVisible: visibleBookedAppointments > 0,
    visibleBookedAppointments,
  };
}
