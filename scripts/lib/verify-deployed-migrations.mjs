import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

export function verifyRuntimeBoundary(role) {
  const flags = ["superuser", "createDatabase", "createRole", "bypassRls", "replication", "adminMembership", "readAllMembership", "writeAllMembership", "schemaCreate", "migrationWrite"];
  if (!role || !role.role?.startsWith("revory_runtime_") || role.ownedTables !== 0 || flags.some(flag => role[flag] !== false)) {
    throw new Error("Runtime database access boundary verification failed. Use the dedicated limited runtime role.");
  }
}

export function verifyMigrationManifest(expected, applied) {
  for (const migration of expected) {
    const row = applied.find(row => row.migration_name === migration.name && row.finished_at && !row.rolled_back_at);
    if (!row || ![migration.checksum, migration.rawChecksum, migration.windowsChecksum].includes(row.checksum)) throw new Error("Database migration verification failed. Apply reviewed migrations through the operator procedure first.");
  }
  if (applied.some(row => !row.finished_at && !row.rolled_back_at)) throw new Error("Database has an unfinished migration.");
}
export async function verifyDeployedMigrations(url, directory = "prisma/migrations") {
  const expected = readdirSync(directory, { withFileTypes: true }).filter(x => x.isDirectory()).map(x => ({
    name: x.name, checksum: createHash("sha256").update(readFileSync(join(directory,x.name,"migration.sql"), "utf8").replace(/\r\n/g,"\n")).digest("hex"),
    windowsChecksum: createHash("sha256").update(readFileSync(join(directory,x.name,"migration.sql"), "utf8").replace(/\r\n/g,"\n").replace(/\n/g,"\r\n")).digest("hex"),
    rawChecksum: createHash("sha256").update(readFileSync(join(directory,x.name,"migration.sql"))).digest("hex"),
  }));
  const verificationUrl = new URL(url);
  if (!verificationUrl.searchParams.has("connect_timeout")) verificationUrl.searchParams.set("connect_timeout", "20");
  const db = new PrismaClient({ datasourceUrl: verificationUrl.toString(), log: [] });
  try {
    const { applied, role } = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      const [role] = await tx.$queryRawUnsafe(`SELECT current_user AS role,
        rolsuper AS superuser, rolcreatedb AS "createDatabase", rolcreaterole AS "createRole",
        rolbypassrls AS "bypassRls", rolreplication AS replication,
        pg_has_role(current_user,'neon_superuser','MEMBER') AS "adminMembership",
        pg_has_role(current_user,'pg_read_all_data','MEMBER') AS "readAllMembership",
        pg_has_role(current_user,'pg_write_all_data','MEMBER') AS "writeAllMembership",
        has_schema_privilege(current_user,'public','CREATE') AS "schemaCreate",
        (has_table_privilege(current_user,'public._prisma_migrations','INSERT') OR
         has_table_privilege(current_user,'public._prisma_migrations','UPDATE') OR
         has_table_privilege(current_user,'public._prisma_migrations','DELETE')) AS "migrationWrite",
        (SELECT count(*)::int FROM pg_tables WHERE schemaname='public' AND tableowner=current_user) AS "ownedTables"
        FROM pg_roles WHERE rolname=current_user`);
      const applied = await tx.$queryRawUnsafe('SELECT migration_name, checksum, finished_at, rolled_back_at FROM public._prisma_migrations');
      return { applied, role };
    }, { maxWait: 20000, timeout: 20000 });
    verifyRuntimeBoundary(role);
    verifyMigrationManifest(expected, applied);
    console.log(`[revory-release] Verified ${expected.length} reviewed migrations using runtime read access; no DDL credential is present in this build.`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Runtime database access boundary")) throw error;
    const code = error?.code ?? error?.errorCode;
    throw new Error(`Database migration verification failed${/^P\d{4}$/.test(code ?? "") ? ` (${code})` : ""}; details suppressed.`);
  }
  finally { await db.$disconnect(); }
}
