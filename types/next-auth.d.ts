import type { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    sessionRevoked?: boolean;
    user: {
      authProvider?: string;
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    authProvider?: string;
    sessionRevoked?: boolean;
    sessionVersion?: number;
  }
}
