import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { prisma } from "@/db/prisma";
import { verifyPassword } from "@/services/auth/password-crypto";
import { checkDurableAuthRateLimit, recordAuthAttempt } from "@/services/security/auth-rate-limit";

const isGoogleConfigured = Boolean(
  process.env.AUTH_GOOGLE_CLIENT_ID && process.env.AUTH_GOOGLE_CLIENT_SECRET,
);

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET?.trim();

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== "development") {
    throw new Error("AUTH_SECRET is required outside local development.");
  }

  return "revory-local-auth-secret";
}

const providers = [
  ...(isGoogleConfigured
    ? [
        GoogleProvider({
          clientId: process.env.AUTH_GOOGLE_CLIENT_ID!,
          clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET!,
        }),
      ]
    : []),
  CredentialsProvider({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    name: "Email and password",
    async authorize(credentials, request) {
      const email = credentials?.email?.trim().toLowerCase() ?? "";
      const password = credentials?.password ?? "";

      if (!email || !password) {
        return null;
      }

      const forwarded = String(request.headers?.["x-forwarded-for"] ?? request.headers?.["x-real-ip"] ?? "unknown");
      const ipAddress = forwarded.split(",")[0]?.trim().slice(0, 80) || "unknown";
      const rateLimit = await checkDurableAuthRateLimit(email, ipAddress);
      if (rateLimit.blocked) return null;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user?.passwordHash || user.status !== "ACTIVE") {
        await recordAuthAttempt(rateLimit.key, false);
        return null;
      }

      const passwordMatches = await verifyPassword(password, user.passwordHash);

      if (!passwordMatches) {
        await recordAuthAttempt(rateLimit.key, false);
        return null;
      }

      await recordAuthAttempt(rateLimit.key, true);

      return {
        email: user.email,
        id: user.id,
        name: user.fullName,
      };
    },
  }),
];

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
  },
  providers,
  callbacks: {
    async jwt({ account, token }) {
      if (account?.provider) {
        token.authProvider = account.provider;
      }

      const subject = token.sub ?? "";
      const email = typeof token.email === "string" ? token.email.trim().toLowerCase() : "";
      const localUser = subject || email ? await prisma.user.findFirst({
        select: { sessionVersion: true, status: true },
        where: { OR: [...(subject ? [{ id: subject }, { authSubject: subject }] : []), ...(email ? [{ email }] : [])] },
      }) : null;
      if (localUser) {
        if (localUser.status !== "ACTIVE") token.sessionRevoked = true;
        else if (typeof token.sessionVersion === "number" && token.sessionVersion !== localUser.sessionVersion) token.sessionRevoked = true;
        else {
          token.sessionRevoked = false;
          token.sessionVersion = localUser.sessionVersion;
        }
      }

      return token;
    },
    session({ session, token }) {
      session.sessionRevoked = token.sessionRevoked === true;
      if (session.user) {
        session.user.authProvider =
          typeof token.authProvider === "string" ? token.authProvider : undefined;
        session.user.id = token.sessionRevoked === true ? "" : token.sub ?? "";
        session.user.email =
          typeof token.email === "string"
            ? token.email
            : session.user.email ?? null;
        session.user.name =
          typeof token.name === "string" ? token.name : session.user.name ?? null;
      }

      return session;
    },
  },
};

export function getAuthSession() {
  return getServerSession(authOptions);
}
