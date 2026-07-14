import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { UserStatus } from "@prisma/client";

import { prisma } from "@/db/prisma";
import {
  getTransactionalEmailConfig,
  sendEmailVerificationEmail,
} from "@/services/email/transactional-email";
import { checkRateLimit } from "@/services/security/rate-limit";

const EMAIL_VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;
const EMAIL_VERIFICATION_TOKEN_ATTEMPT_WINDOW_MS = 1000 * 60 * 15;

function hashVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createVerificationToken() {
  return randomBytes(32).toString("base64url");
}

function buildVerificationUrl(token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";

  return `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;
}

export function isEmailVerificationDeliveryConfigured() {
  return getTransactionalEmailConfig().configured;
}

export async function requestEmailVerification(input: {
  email: string;
  userId: string;
}) {
  const token = createVerificationToken();
  const verificationUrl = buildVerificationUrl(token);

  await prisma.user.update({
    data: {
      emailVerificationExpiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS),
      emailVerificationTokenHash: hashVerificationToken(token),
    },
    where: {
      id: input.userId,
    },
  });

  const sent = await sendEmailVerificationEmail({
    email: input.email,
    verificationUrl,
  });

  if (!sent && process.env.NODE_ENV !== "production") {
    console.info("[revory-auth] local email verification link", {
      email: input.email,
      verificationUrl,
    });
  }

  return {
    deliveryConfigured: isEmailVerificationDeliveryConfigured(),
    sent,
  };
}

export async function verifyEmailWithToken(token: string) {
  const normalizedToken = token.trim();
  const tokenHash = hashVerificationToken(normalizedToken);
  const rateLimit = await checkRateLimit({
    key: `email-verify:${tokenHash}`,
    limit: 10,
    windowMs: EMAIL_VERIFICATION_TOKEN_ATTEMPT_WINDOW_MS,
  });

  if (rateLimit.limited) {
    return {
      message: "Too many verification attempts. Wait a few minutes before trying again.",
      ok: false as const,
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      emailVerificationTokenHash: tokenHash,
    },
  });

  if (!user?.emailVerificationExpiresAt || user.emailVerificationExpiresAt.getTime() < Date.now()) {
    return {
      message: "This verification link is expired or invalid.",
      ok: false as const,
    };
  }

  await prisma.user.update({
    data: {
      emailVerificationExpiresAt: null,
      emailVerificationTokenHash: null,
      emailVerifiedAt: new Date(),
      status: UserStatus.ACTIVE,
    },
    where: {
      id: user.id,
    },
  });

  return {
    message: "Email confirmed. You can sign in to REVORY now.",
    ok: true as const,
  };
}
