import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

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
  const db = new PrismaClient({ datasourceUrl: url, log: [] });
  try {
    const applied = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      return tx.$queryRawUnsafe('SELECT migration_name, checksum, finished_at, rolled_back_at FROM public._prisma_migrations');
    });
    verifyMigrationManifest(expected, applied);
    console.log(`[revory-release] Verified ${expected.length} reviewed migrations using runtime read access; no DDL credential is present in this build.`);
  } catch { throw new Error("Database migration verification failed; details suppressed."); }
  finally { await db.$disconnect(); }
}
