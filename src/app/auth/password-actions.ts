"use server";

import { UserStatus } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { hashPassword, isPasswordStrongEnough } from "@/services/auth/password-crypto";
import {
  isPasswordResetDeliveryConfigured,
  requestPasswordReset,
  resetPasswordWithToken,
} from "@/services/auth/password-reset";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeName(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized.length > 0 ? normalized : null;
}

export async function createEmailPasswordAccount(input: {
  email: string;
  fullName: string;
  password: string;
}) {
  const email = normalizeEmail(input.email);
  const fullName = normalizeName(input.fullName);

  if (!email || !email.includes("@")) {
    return {
      message: "Use a valid work email.",
      ok: false as const,
    };
  }

  if (!isPasswordStrongEnough(input.password)) {
    return {
      message: "Use at least 10 characters for the password.",
      ok: false as const,
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    return {
      message: "An account already exists for this email. Sign in or reset the password.",
      ok: false as const,
    };
  }

  const user = await prisma.user.create({
    data: {
      authProvider: "credentials",
      email,
      fullName,
      passwordHash: await hashPassword(input.password),
      passwordUpdatedAt: new Date(),
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.user.update({
    data: {
      authSubject: user.id,
    },
    where: {
      id: user.id,
    },
  });

  return {
    message: "Account created. Opening REVORY now.",
    ok: true as const,
  };
}

export async function requestPasswordResetAction(input: { email: string }) {
  const result = await requestPasswordReset(input.email);

  if (!result.deliveryConfigured) {
    return {
      message:
        "Password reset is wired, but email delivery still needs launch email credentials.",
      ok: false as const,
    };
  }

  return {
    message: "If an email/password account exists, a reset link has been sent.",
    ok: true as const,
  };
}

export async function resetPasswordAction(input: {
  password: string;
  token: string;
}) {
  return resetPasswordWithToken(input);
}

export async function getPasswordResetReadiness() {
  return {
    configured: isPasswordResetDeliveryConfigured(),
  };
}
