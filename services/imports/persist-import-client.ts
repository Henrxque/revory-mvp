import "server-only";

import { Prisma, type Client } from "@prisma/client";

import { prisma } from "@/db/prisma";

type PersistImportedClientInput = {
  dataSourceId: string;
  email: string | null;
  externalId: string | null;
  fullName: string;
  lastVisitAt?: Date | null;
  notes?: string | null;
  phone: string | null;
  tags?: string[];
  totalVisits?: number | null;
  workspaceId: string;
};

type PersistImportedClientResult = {
  client: Client;
  operation: "created" | "updated";
};

function buildClientUpdateData(input: PersistImportedClientInput): Prisma.ClientUpdateInput {
  return {
    dataSource: {
      connect: {
        id: input.dataSourceId,
      },
    },
    fullName: input.fullName,
    ...(input.externalId
      ? {
          externalId: input.externalId,
        }
      : {}),
    ...(input.email
      ? {
          email: input.email,
        }
      : {}),
    ...(input.phone
      ? {
          phone: input.phone,
        }
      : {}),
    ...(input.lastVisitAt
      ? {
          lastVisitAt: input.lastVisitAt,
        }
      : {}),
    ...(typeof input.totalVisits === "number"
      ? {
          totalVisits: input.totalVisits,
        }
      : {}),
    ...(input.notes
      ? {
          notes: input.notes,
        }
      : {}),
    ...(input.tags && input.tags.length > 0
      ? {
          tagsJson: input.tags,
        }
      : {}),
  };
}

function buildClientCreateData(input: PersistImportedClientInput): Prisma.ClientCreateInput {
  return {
    workspace: {
      connect: {
        id: input.workspaceId,
      },
    },
    dataSource: {
      connect: {
        id: input.dataSourceId,
      },
    },
    externalId: input.externalId,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    lastVisitAt: input.lastVisitAt ?? null,
    totalVisits: input.totalVisits ?? null,
    notes: input.notes ?? null,
    tagsJson: input.tags ?? [],
  };
}

async function findExistingClientByFallback(
  tx: Prisma.TransactionClient,
  input: PersistImportedClientInput,
) {
  if (input.email) {
    const existingByEmail = await tx.client.findFirst({
      orderBy: {
        createdAt: "asc",
      },
      where: {
        workspaceId: input.workspaceId,
        email: input.email,
      },
    });

    if (existingByEmail) {
      return existingByEmail;
    }
  }

  if (input.phone) {
    return tx.client.findFirst({
      orderBy: {
        createdAt: "asc",
      },
      where: {
        workspaceId: input.workspaceId,
        phone: input.phone,
      },
    });
  }

  return null;
}

export async function persistImportedClient(
  tx: Prisma.TransactionClient,
  input: PersistImportedClientInput,
): Promise<PersistImportedClientResult> {
  if (input.externalId) {
    const existingByExternalId = await tx.client.findUnique({
      where: {
        workspaceId_externalId: {
          externalId: input.externalId,
          workspaceId: input.workspaceId,
        },
      },
    });

    if (existingByExternalId) {
      const client = await tx.client.update({
        data: buildClientUpdateData(input),
        where: {
          id: existingByExternalId.id,
        },
      });

      return {
        client,
        operation: "updated",
      };
    }

    const client = await tx.client.create({
      data: buildClientCreateData(input),
    });

    return {
      client,
      operation: "created",
    };
  }

  const existingClient = await findExistingClientByFallback(tx, input);

  if (existingClient) {
    const client = await tx.client.update({
      data: buildClientUpdateData(input),
      where: {
        id: existingClient.id,
      },
    });

    return {
      client,
      operation: "updated",
    };
  }

  const client = await tx.client.create({
    data: buildClientCreateData(input),
  });

  return {
    client,
    operation: "created",
  };
}

export async function persistImportedClientWithTransaction(
  input: PersistImportedClientInput,
): Promise<PersistImportedClientResult> {
  return prisma.$transaction((tx) => persistImportedClient(tx, input));
}
