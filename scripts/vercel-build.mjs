import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    env: process.env,
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
  if (vercelEnvironment === "preview") {
    const expectedDatabase = process.env.REVORY_AI_SAAS_SYNTHETIC_DATABASE ?? "";
    let actualDatabase = "";
    try { actualDatabase = new URL(process.env.DATABASE_URL).pathname.slice(1); }
    catch { throw new Error("AI SaaS preview requires a valid isolated DATABASE_URL before migrations."); }
    if (!/^revory_ai_(sandbox|homolog)_[a-f0-9]{12}$/.test(expectedDatabase)
      || actualDatabase !== expectedDatabase) {
      throw new Error("Vercel preview requires its exact isolated synthetic database before migrations.");
    }
  }

  console.log(
    `[revory-release] Applying pending Prisma migrations for the ${vercelEnvironment} environment before building.`,
  );
  run("npx", ["prisma", "migrate", "deploy"]);
} else {
  console.log(
    "[revory-release] Non-Vercel build detected; production migration deployment was not requested.",
  );
}

run("npx", ["next", "build"]);
