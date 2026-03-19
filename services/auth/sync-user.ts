import "server-only";

import { UserStatus, type User as LocalUser } from "@prisma/client";
import { auth, clerkClient, type User as ClerkUser } from "@clerk/nextjs/server";

import { prisma } from "@/db/prisma";

function resolvePrimaryEmail(clerkUser: ClerkUser) {
  const primaryVerifiedEmail =
    clerkUser.primaryEmailAddress?.verification?.status === "verified"
      ? clerkUser.primaryEmailAddress.emailAddress
      : null;

  const firstVerifiedEmail =
    clerkUser.emailAddresses.find((emailAddress) => emailAddress.verification?.status === "verified")
      ?.emailAddress ?? null;

  const primaryEmail = clerkUser.primaryEmailAddress?.emailAddress ?? null;
  const firstAvailableEmail = clerkUser.emailAddresses[0]?.emailAddress ?? null;

  return primaryVerifiedEmail ?? firstVerifiedEmail ?? primaryEmail ?? firstAvailableEmail;
}

function resolveFullName(firstName: string | null, lastName: string | null) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName.length > 0 ? fullName : null;
}

export async function syncAuthenticatedUser(): Promise<LocalUser | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  const email = resolvePrimaryEmail(clerkUser);

  if (!email) {
    throw new Error("Authenticated Clerk user is missing a usable email address.");
  }

  const fullName = resolveFullName(clerkUser.firstName, clerkUser.lastName);

  return prisma.user.upsert({
    where: {
      clerkUserId: clerkUser.id,
    },
    update: {
      email,
      fullName,
      status: UserStatus.ACTIVE,
    },
    create: {
      clerkUserId: clerkUser.id,
      email,
      fullName,
      status: UserStatus.ACTIVE,
    },
  });
}
