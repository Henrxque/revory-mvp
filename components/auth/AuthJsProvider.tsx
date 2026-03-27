"use client";

import { SessionProvider } from "next-auth/react";

type AuthJsProviderProps = Readonly<{
  children: React.ReactNode;
}>;

export function AuthJsProvider({ children }: AuthJsProviderProps) {
  return <SessionProvider>{children}</SessionProvider>;
}
