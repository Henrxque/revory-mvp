import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import { AppointmentStatus } from "@prisma/client";

import { prisma } from "@/db/prisma";

export type BookedProofRead = {
  hasBookedProofVisible: boolean;
  visibleBookedAppointments: number;
};

const getBookedProofReadCached = unstable_cache(async (
  workspaceId: string,
): Promise<BookedProofRead> => {
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
}, ["booked-proof-read"], {
  revalidate: 10,
});

export const getBookedProofRead = cache(async (
  workspaceId: string,
): Promise<BookedProofRead> => getBookedProofReadCached(workspaceId));
