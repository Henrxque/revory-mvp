import "server-only";

import { prisma } from "@/db/prisma";

function configuredAdminEmails() {
  return new Set(
    (process.env.REVORY_PRODUCT_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isProductAdminEmail(email: string | null | undefined) {
  return Boolean(email && configuredAdminEmails().has(email.trim().toLowerCase()));
}

export async function isWorkspaceProductAdmin(workspaceId: string) {
  if (!process.env.REVORY_PRODUCT_ADMIN_EMAILS?.trim()) return false;
  const workspace = await prisma.workspace.findUnique({
    select: { owner: { select: { email: true } } },
    where: { id: workspaceId },
  });
  return isProductAdminEmail(workspace?.owner.email);
}
