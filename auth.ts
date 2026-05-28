import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { prisma } from "@/db/prisma";
import { verifyPassword } from "@/services/auth/password-crypto";

const isGoogleConfigured = Boolean(
  process.env.AUTH_GOOGLE_CLIENT_ID && process.env.AUTH_GOOGLE_CLIENT_SECRET,
);

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
    async authorize(credentials) {
      const email = credentials?.email?.trim().toLowerCase() ?? "";
      const password = credentials?.password ?? "";

      if (!email || !password) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user?.passwordHash || user.status !== "ACTIVE") {
        return null;
      }

      const passwordMatches = await verifyPassword(password, user.passwordHash);

      if (!passwordMatches) {
        return null;
      }

      return {
        email: user.email,
        id: user.id,
        name: user.fullName,
      };
    },
  }),
];

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? "revory-local-auth-secret",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
  },
  providers,
  callbacks: {
    jwt({ account, token }) {
      if (account?.provider) {
        token.authProvider = account.provider;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.authProvider =
          typeof token.authProvider === "string" ? token.authProvider : undefined;
        session.user.id = token.sub ?? "";
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
