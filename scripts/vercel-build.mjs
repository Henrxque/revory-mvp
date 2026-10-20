import { spawnSync } from "node:child_process";
import { dedicatedMigrationDatasource } from "./lib/migration-datasource.mjs";
import { verifyDeployedMigrations } from "./lib/verify-deployed-migrations.mjs";
import { previewDatabaseTarget } from "./lib/preview-database-target.mjs";

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    env: { ...process.env, ...extraEnv },
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const vercelEnvironment = process.env.VERCEL_ENV?.trim().toLowerCase() ?? "";
const isVercelDeployment =
  vercelEnvironment === "production" || vercelEnvironment === "preview";

if (isVercelDeployment) {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error(
      "DATABASE_URL is required before a Vercel deployment can verify and apply Prisma migrations.",
    );
  }

  // Fail before migrate deploy whenever this branch is built as a Vercel preview.
  // A project-wide Preview DATABASE_URL must never be trusted implicitly.
  let migrationDatabaseUrl = process.env.DATABASE_URL;
  if (vercelEnvironment === "preview") {
    migrationDatabaseUrl = previewDatabaseTarget(process.env);
  }

  // Runtime may use a CRUD-only SQL role; migrations use a separate operator
  // credential. Reject target drift before running any migration.
  if (process.env.REVORY_MIGRATION_DATABASE_URL) {
    migrationDatabaseUrl = dedicatedMigrationDatasource(process.env.DATABASE_URL, process.env.REVORY_MIGRATION_DATABASE_URL);
  }

  if (process.env.REVORY_DATABASE_MIGRATIONS_EXTERNAL === "true") {
    if (process.env.REVORY_MIGRATION_DATABASE_URL) throw new Error("External migration mode must not carry a migration credential.");
    await verifyDeployedMigrations(process.env.DATABASE_URL);
  } else {
  console.log(
    `[revory-release] Applying pending Prisma migrations for the ${vercelEnvironment} environment before building.`,
  );
  // Neon rejected Prisma's session advisory lock even on the direct endpoint.
  // This exception is limited to the isolated Preview database; deploys stay serial.
  run("npx", ["prisma", "migrate", "deploy"], {
    DATABASE_URL: migrationDatabaseUrl,
    ...(vercelEnvironment === "preview" ? { PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "1" } : {}),
  });
  }
} else {
  console.log(
    "[revory-release] Non-Vercel build detected; production migration deployment was not requested.",
  );
}

run("npx", ["next", "build"]);
