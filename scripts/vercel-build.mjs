import { spawnSync } from "node:child_process";
import { dedicatedMigrationDatasource } from "./lib/migration-datasource.mjs";
import { verifyDeployedMigrations } from "./lib/verify-deployed-migrations.mjs";

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

  if (process.env.REVORY_DATABASE_MIGRATIONS_EXTERNAL === "true") {
    if (process.env.REVORY_MIGRATION_DATABASE_URL) throw new Error("External migration mode must not carry a migration credential.");
    await verifyDeployedMigrations(process.env.DATABASE_URL);
  } else {
  const migrationUrl = process.env.REVORY_MIGRATION_DATABASE_URL
    ? dedicatedMigrationDatasource(process.env.DATABASE_URL, process.env.REVORY_MIGRATION_DATABASE_URL)
    : process.env.DATABASE_URL;
  console.log(
    `[revory-release] Applying pending Prisma migrations for the ${vercelEnvironment} environment before building.`,
  );
  run("npx", ["prisma", "migrate", "deploy"], { DATABASE_URL: migrationUrl });
  }
} else {
  console.log(
    "[revory-release] Non-Vercel build detected; production migration deployment was not requested.",
  );
}

run("npx", ["next", "build"]);
