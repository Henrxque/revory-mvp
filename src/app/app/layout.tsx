import { syncAuthenticatedUser } from "@/services/auth/sync-user";

type AuthenticatedAppLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function AuthenticatedAppLayout({
  children,
}: AuthenticatedAppLayoutProps) {
  await syncAuthenticatedUser();

  return children;
}
