import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/db/prisma";
import { hashPassword, isPasswordStrongEnough } from "@/services/auth/password-crypto";
import { getTransactionalEmailConfig, sendPasswordResetEmail } from "@/services/email/transactional-email";
import { checkRateLimit } from "@/services/security/rate-limit";

const RESET_TOKEN_TTL_MS = 1000 * 60 * 45;
const RESET_TOKEN_ATTEMPT_WINDOW_MS = 1000 * 60 * 15;

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createResetToken() {
  return randomBytes(32).toString("base64url");
}

export function isPasswordResetDeliveryConfigured() {
  return getTransactionalEmailConfig().configured;
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = normalizedEmail
    ? await prisma.user.findUnique({ where: { email: normalizedEmail } })
    : null;

  if (!user?.passwordHash || user.status === "DISABLED") {
    return { deliveryConfigured: isPasswordResetDeliveryConfigured(), sent: false };
  }

  const token = createResetToken();
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "http://localhost:3000"}/reset-password?token=${encodeURIComponent(token)}`;

  await prisma.user.update({
    data: {
      passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      passwordResetTokenHash: hashResetToken(token),
    },
    where: {
      id: user.id,
    },
  });

  const sent = await sendPasswordResetEmail({
    email: user.email,
    resetUrl,
  });

  if (!sent && process.env.NODE_ENV !== "production") {
    console.info("[revory-auth] local password reset link", {
      email: user.email,
      resetUrl,
    });
  }

  return { deliveryConfigured: isPasswordResetDeliveryConfigured(), sent };
}

export async function resetPasswordWithToken(input: {
  password: string;
  passwordConfirmation: string;
  token: string;
}) {
  if (input.password !== input.passwordConfirmation) {
    return {
      message: "Passwords do not match.",
      ok: false as const,
    };
  }

  const normalizedToken = input.token.trim();
  const tokenHash = hashResetToken(normalizedToken);
  const rateLimit = await checkRateLimit({
    key: `password-reset-token:${tokenHash}`,
    limit: 10,
    windowMs: RESET_TOKEN_ATTEMPT_WINDOW_MS,
  });

  if (rateLimit.limited) {
    return {
      message: "Too many reset attempts. Wait a few minutes before trying again.",
      ok: false as const,
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      passwordResetTokenHash: tokenHash,
    },
  });

  if (
    !user?.passwordResetExpiresAt ||
    user.status === "DISABLED" ||
    user.passwordResetExpiresAt.getTime() < Date.now()
  ) {
    return {
      message: "This reset link is expired or invalid.",
      ok: false as const,
    };
  }

  if (!isPasswordStrongEnough(input.password)) {
    return {
      message: "Use at least 10 characters for the new password.",
      ok: false as const,
    };
  }

  await prisma.user.update({
    data: {
      authProvider: user.authProvider === "google" ? "google+credentials" : "credentials",
      passwordHash: await hashPassword(input.password),
      passwordResetExpiresAt: null,
      passwordResetTokenHash: null,
      passwordUpdatedAt: new Date(),
      sessionVersion: { increment: 1 },
    },
    where: {
      id: user.id,
    },
  });

  return {
    message: "Password updated. You can sign in now.",
    ok: true as const,
  };
}
