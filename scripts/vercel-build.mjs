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
