import { spawnSync } from "node:child_process";

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
    const expectedDatabase = process.env.REVORY_AI_SAAS_SYNTHETIC_DATABASE ?? "";
    let actualDatabase = "";
    let directDatabase;
    try { actualDatabase = new URL(process.env.DATABASE_URL).pathname.slice(1); }
    catch { throw new Error("AI SaaS preview requires a valid isolated DATABASE_URL before migrations."); }
    if (!/^revory_ai_(sandbox|homolog)_[a-f0-9]{12}$/.test(expectedDatabase)
      || actualDatabase !== expectedDatabase) {
      throw new Error("Vercel preview requires its exact isolated synthetic database before migrations.");
    }
    try { directDatabase = new URL(process.env.DATABASE_URL_UNPOOLED ?? ""); }
    catch { throw new Error("AI SaaS preview requires a direct isolated DATABASE_URL_UNPOOLED before migrations."); }
    const pooledDatabase = new URL(process.env.DATABASE_URL);
    if (directDatabase.pathname.slice(1) !== expectedDatabase
      || directDatabase.hostname !== pooledDatabase.hostname.replace("-pooler.", ".")
      || directDatabase.username !== pooledDatabase.username
      || directDatabase.password !== pooledDatabase.password) {
      throw new Error("Vercel preview direct migration URL must match the isolated synthetic database and credentials.");
    }
    migrationDatabaseUrl = directDatabase.toString();
  }

  console.log(
    `[revory-release] Applying pending Prisma migrations for the ${vercelEnvironment} environment before building.`,
  );
  // Neon rejected Prisma's session advisory lock even on the direct endpoint.
  // This exception is limited to the isolated Preview database; deploys stay serial.
  run("npx", ["prisma", "migrate", "deploy"], {
    DATABASE_URL: migrationDatabaseUrl,
    ...(vercelEnvironment === "preview" ? { PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "1" } : {}),
  });
} else {
  console.log(
    "[revory-release] Non-Vercel build detected; production migration deployment was not requested.",
  );
}

run("npx", ["next", "build"]);
