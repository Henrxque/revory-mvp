import "server-only";

import type { Prisma } from "@prisma/client";

import { ACCOUNT_CREATION_LEGAL_VERSIONS, CHECKOUT_LEGAL_VERSIONS } from "@/content/revory-legal";
import { prisma } from "@/db/prisma";

export type LegalAcceptanceEvent =
  | "ACCOUNT_CREATED"
  | "CHECKOUT_STARTED"
  | "MATERIAL_UPDATE_ACCEPTED";

export async function recordLegalAcceptance(input: {
  context?: Prisma.InputJsonObject;
  event: LegalAcceptanceEvent;
  locale?: "en" | "pt-BR";
  userId: string;
  workspaceId?: string | null;
}) {
  return prisma.legalAcceptance.create({
    data: {
      contextJson: input.context ?? {},
      documentVersionsJson:
        input.event === "CHECKOUT_STARTED"
          ? CHECKOUT_LEGAL_VERSIONS
          : ACCOUNT_CREATION_LEGAL_VERSIONS,
      event: input.event,
      locale: input.locale ?? "en",
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
    },
  });
}

export async function hasCurrentAccountLegalAcceptance(userId: string) {
  const recent = await prisma.legalAcceptance.findMany({
    orderBy: { acceptedAt: "desc" },
    select: { documentVersionsJson: true },
    take: 20,
    where: {
      event: { in: ["ACCOUNT_CREATED", "CHECKOUT_STARTED", "MATERIAL_UPDATE_ACCEPTED"] },
      userId,
    },
  });

  return recent.some((acceptance) => {
    const versions = acceptance.documentVersionsJson;
    if (!versions || typeof versions !== "object" || Array.isArray(versions)) return false;
    return (
      versions.terms === ACCOUNT_CREATION_LEGAL_VERSIONS.terms &&
      versions.privacy === ACCOUNT_CREATION_LEGAL_VERSIONS.privacy
    );
  });
}
