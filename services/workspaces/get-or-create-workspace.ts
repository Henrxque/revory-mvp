import "server-only";

import {
  Prisma,
  WorkspaceStatus,
  type User,
  type Workspace,
} from "@prisma/client";

import { prisma } from "@/db/prisma";

function buildInitialWorkspaceName(user: User) {
  if (user.fullName) {
    return `${user.fullName}'s Workspace`;
  }

  return "REVORY Workspace";
}

function buildInitialWorkspaceSlug(user: User) {
  return `revory-${user.id.slice(0, 12)}`;
}

export async function getOrCreateWorkspace(user: User): Promise<Workspace> {
  const existingWorkspace = await prisma.workspace.findFirst({
    where: {
      ownerUserId: user.id,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existingWorkspace) {
    return existingWorkspace;
  }

  const slug = buildInitialWorkspaceSlug(user);

  try {
    return await prisma.workspace.create({
      data: {
        name: buildInitialWorkspaceName(user),
        slug,
        ownerUserId: user.id,
        status: WorkspaceStatus.DRAFT,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return prisma.workspace.findUniqueOrThrow({
        where: {
          slug,
        },
      });
    }

    throw error;
  }
}
