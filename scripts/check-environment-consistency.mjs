import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const cwd = process.cwd();
const prisma = new PrismaClient();

const requiredEnvKeys = ["DATABASE_URL", "NEXT_PUBLIC_APP_URL", "AUTH_SECRET"];
const degradationKeys = [
  "REVORY_FORCE_ATTRIBUTION_DEGRADED",
  "REVORY_FORCE_MOMENTUM_DEGRADED",
  "REVORY_FORCE_UPCOMING_DEGRADED",
];
const criticalColumns = [
  {
    column: "hasLeadBaseSupport",
    table: "clients",
    usage: "dashboard attribution and renewal support",
  },
  {
    column: "estimatedRevenue",
    table: "appointments",
    usage: "revenue read and momentum support",
  },
  {
    column: "averageDealValue",
    table: "activation_setups",
    usage: "value-per-booking fallback",
  },
  {
    column: "billingStatus",
    table: "workspaces",
    usage: "plan gating and commercial access",
  },
  {
    column: "planKey",
    table: "workspaces",
    usage: "plan read and billing hierarchy",
  },
];

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const entries = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    const trimmed = rawValue.trim();
    const value = trimmed.replace(/^"/, "").replace(/"$/, "");

    entries[key] = value;
  }

  return entries;
}

const dotEnv = readEnvFile(path.join(cwd, ".env"));
const dotEnvLocal = readEnvFile(path.join(cwd, ".env.local"));

function resolveEnvValue(key) {
  if (typeof process.env[key] === "string" && process.env[key].trim().length > 0) {
    return process.env[key].trim();
  }

  if (typeof dotEnvLocal[key] === "string" && dotEnvLocal[key].trim().length > 0) {
    return dotEnvLocal[key].trim();
  }

  if (typeof dotEnv[key] === "string" && dotEnv[key].trim().length > 0) {
    return dotEnv[key].trim();
  }

  return "";
}

function getMigrationFolderNames() {
  const migrationsPath = path.join(cwd, "prisma", "migrations");

  if (!fs.existsSync(migrationsPath)) {
    return [];
  }

  return fs
    .readdirSync(migrationsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function getColumnPresence(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
    `,
    table,
    column,
  );

  return Array.isArray(rows) && rows.length > 0;
}

async function main() {
  const errors = [];
  const warnings = [];

  const envStatus = requiredEnvKeys.map((key) => ({
    key,
    present: Boolean(resolveEnvValue(key)),
  }));

  for (const entry of envStatus) {
    if (!entry.present) {
      errors.push(`Missing required env: ${entry.key}`);
    }
  }

  const degradationFlags = degradationKeys
    .map((key) => ({
      key,
      value: resolveEnvValue(key),
    }))
    .filter((entry) => entry.value === "1");

  if (degradationFlags.length > 0) {
    warnings.push(
      `Forced degradation flags active: ${degradationFlags.map((entry) => entry.key).join(", ")}`,
    );
  }

  let databaseReachable = false;
  let appliedMigrations = [];
  let criticalColumnStatus = [];

  try {
    await prisma.$connect();
    await prisma.$queryRawUnsafe("SELECT 1");
    databaseReachable = true;

    appliedMigrations = await prisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at, rolled_back_at
      FROM "_prisma_migrations"
      ORDER BY migration_name ASC
    `);

    criticalColumnStatus = await Promise.all(
      criticalColumns.map(async (entry) => ({
        ...entry,
        present: await getColumnPresence(entry.table, entry.column),
      })),
    );
  } catch (error) {
    errors.push(
      `Database connectivity failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    await prisma.$disconnect();
  }

  const appliedMigrationNames = new Set(
    appliedMigrations
      .filter((entry) => entry.finished_at && !entry.rolled_back_at)
      .map((entry) => entry.migration_name),
  );
  const pendingMigrations = getMigrationFolderNames().filter(
    (migrationName) => !appliedMigrationNames.has(migrationName),
  );

  if (pendingMigrations.length > 0) {
    errors.push(`Pending migrations: ${pendingMigrations.join(", ")}`);
  }

  const missingColumns = criticalColumnStatus.filter((entry) => !entry.present);

  if (missingColumns.length > 0) {
    errors.push(
      `Missing critical columns: ${missingColumns
        .map((entry) => `${entry.table}.${entry.column}`)
        .join(", ")}`,
    );
  }

  const status = {
    checkedAt: new Date().toISOString(),
    databaseReachable,
    degradationFlags,
    envStatus,
    errors,
    pendingMigrations,
    protocolReady: errors.length === 0,
    criticalColumnStatus,
    warnings,
  };

  console.log("[revory-env] Environment consistency protocol");
  console.log(
    `[revory-env] Database reachable: ${databaseReachable ? "yes" : "no"} | Pending migrations: ${pendingMigrations.length}`,
  );

  if (warnings.length > 0) {
    for (const warning of warnings) {
      console.log(`[revory-env] Warning: ${warning}`);
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[revory-env] Error: ${error}`);
    }
  } else {
    console.log("[revory-env] Protocol ready: local environment is consistent for trusted reruns.");
  }

  console.log(JSON.stringify(status, null, 2));

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

await main();
