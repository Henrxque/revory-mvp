"use server";

import { UserStatus } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { requestEmailVerification } from "@/services/auth/email-verification";
import { hashPassword, isPasswordStrongEnough } from "@/services/auth/password-crypto";
import {
  isPasswordResetDeliveryConfigured,
  requestPasswordReset,
  resetPasswordWithToken,
} from "@/services/auth/password-reset";
import { checkRateLimit } from "@/services/security/rate-limit";

const AUTH_EMAIL_WINDOW_MS = 1000 * 60 * 15;
const AUTH_EMAIL_ATTEMPT_LIMIT = 5;

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

  const rateLimit = await checkRateLimit({
    key: `signup:${email}`,
    limit: AUTH_EMAIL_ATTEMPT_LIMIT,
    windowMs: AUTH_EMAIL_WINDOW_MS,
  });

  if (rateLimit.limited) {
    return {
      message: "Too many signup attempts. Wait a few minutes before trying again.",
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
    if (existingUser.status === UserStatus.PENDING_VERIFICATION && existingUser.passwordHash) {
      const verification = await requestEmailVerification({
        email: existingUser.email,
        userId: existingUser.id,
      });

      return {
        message: verification.sent
          ? "A verification email was sent again. Confirm your email before signing in."
          : "Account exists, but REVORY could not send the verification email. Check email setup and try again.",
        ok: verification.sent as boolean,
        requiresVerification: true as const,
      };
    }

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
      status: UserStatus.PENDING_VERIFICATION,
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

  const verification = await requestEmailVerification({
    email: user.email,
    userId: user.id,
  });

  return {
    message: verification.sent
      ? "Account created. Check your email to confirm your REVORY account."
      : "Account created, but REVORY could not send the verification email. Check email setup and try again.",
    ok: verification.sent as boolean,
    requiresVerification: true as const,
  };
}

export async function requestPasswordResetAction(input: { email: string }) {
  const email = normalizeEmail(input.email);
  const rateLimit = await checkRateLimit({
    key: `password-reset:${email || "unknown"}`,
    limit: AUTH_EMAIL_ATTEMPT_LIMIT,
    windowMs: AUTH_EMAIL_WINDOW_MS,
  });

  if (rateLimit.limited) {
    return {
      message: "Too many reset requests. Wait a few minutes before trying again.",
      ok: false as const,
    };
  }

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
