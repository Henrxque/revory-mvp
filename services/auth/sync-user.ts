import "server-only";

import { cache } from "react";
import { UserStatus, type User as LocalUser } from "@prisma/client";

import { getAuthSession } from "@/auth";
import { prisma } from "@/db/prisma";

function normalizeEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase() ?? null;

  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeFullName(name: string | null | undefined) {
  const normalized = name?.trim() ?? null;

  return normalized && normalized.length > 0 ? normalized : null;
}

export const syncAuthenticatedUser = cache(async (): Promise<LocalUser | null> => {
  const session = await getAuthSession();
  const sessionUser = session?.user;
  const authSubject = sessionUser?.id ?? null;
  const email = normalizeEmail(sessionUser?.email);

  if (!authSubject || !email) {
    return null;
  }

  const fullName = normalizeFullName(sessionUser?.name);

  const existingByAuthSubject = await prisma.user.findUnique({
    where: {
      authSubject,
    },
  });

  if (existingByAuthSubject) {
    const shouldUpdate =
      existingByAuthSubject.authProvider !== "google" ||
      existingByAuthSubject.email !== email ||
      existingByAuthSubject.fullName !== fullName ||
      existingByAuthSubject.status !== UserStatus.ACTIVE;

    if (!shouldUpdate) {
      return existingByAuthSubject;
    }

    return prisma.user.update({
      where: {
        id: existingByAuthSubject.id,
      },
      data: {
        authProvider: "google",
        email,
        fullName,
        status: UserStatus.ACTIVE,
      },
    });
  }

  const existingByEmail = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingByEmail) {
    const shouldUpdate =
      existingByEmail.authProvider !== "google" ||
      existingByEmail.authSubject !== authSubject ||
      existingByEmail.fullName !== fullName ||
      existingByEmail.status !== UserStatus.ACTIVE;

    if (!shouldUpdate) {
      return existingByEmail;
    }

    return prisma.user.update({
      where: {
        id: existingByEmail.id,
      },
      data: {
        authProvider: "google",
        authSubject,
        fullName,
        status: UserStatus.ACTIVE,
      },
    });
  }

  return prisma.user.create({
    data: {
      authProvider: "google",
      authSubject,
      email,
      fullName,
      status: UserStatus.ACTIVE,
    },
  });
});
