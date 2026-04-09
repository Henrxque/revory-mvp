import "server-only";

import { prisma } from "@/db/prisma";

type UpsertMedSpaProfileInput = Readonly<{
  brandName: string;
  businessType?: string | null;
  workspaceId: string;
}>;

export async function upsertMedSpaProfile({
  brandName,
  businessType = "MedSpa",
  workspaceId,
}: UpsertMedSpaProfileInput) {
  return prisma.medSpaProfile.upsert({
    where: {
      workspaceId,
    },
    update: {
      brandName,
      businessType,
    },
    create: {
      brandName,
      businessType,
      timezone: "America/New_York",
      workspaceId,
    },
  });
}
