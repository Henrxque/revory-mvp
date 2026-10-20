import "server-only";
import { prisma } from "@/db/prisma";
import { openSourceCredential, sealSourceCredential, isSourceCredentialStorageConfigured, type SourceCredentialScope } from "./credential-vault";

// Operator-only service. Dry-run decrypts and checks every selected envelope,
// but only returns counts/versions. Never expose through a customer route.
export async function rewrapSourceCredentials(options: { apply?: boolean; limit?: number } = {}) {
  const active = process.env.REVORY_AI_CONNECTION_ACTIVE_KEY ?? "";
  if (!isSourceCredentialStorageConfigured() || !/^[a-zA-Z0-9_-]{1,40}$/.test(active)) throw new Error("Credential storage is unavailable.");
  const rows = await prisma.aiIntegritySourceCredential.findMany({
    where: { keyVersion: { not: active } }, orderBy: { id: "asc" },
    take: Math.max(1, Math.min(options.limit ?? 100, 100)),
    include: { connection: { select: { generation: true, provider: true } } },
  });
  let rotated = 0, conflicts = 0;
  for (const row of rows) {
    const provider = row.connection.provider;
    if (provider !== "OPENAI" && provider !== "STRIPE") throw new Error("Unsupported credential scope.");
    const scope: SourceCredentialScope = { workspaceId: row.workspaceId, connectionId: row.connectionId, provider, generation: row.connection.generation };
    const plaintext = openSourceCredential(row, scope);
    const sealed = sealSourceCredential(plaintext, scope);
    if (options.apply) {
      const result = await prisma.aiIntegritySourceCredential.updateMany({
        where: { id: row.id, workspaceId: row.workspaceId, keyVersion: row.keyVersion, authTag: row.authTag,
          connection: { generation: row.connection.generation } },
        data: sealed,
      });
      rotated += result.count; conflicts += 1 - result.count;
    }
  }
  const remaining = await prisma.aiIntegritySourceCredential.count({ where: { keyVersion: { not: active } } });
  return { mode: options.apply ? "APPLY" : "DRY_RUN", checked: rows.length, rotated, conflicts, remaining, activeVersion: active };
}
