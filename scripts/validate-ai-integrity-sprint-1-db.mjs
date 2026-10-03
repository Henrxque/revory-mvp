import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) process.loadEnvFile(".env");
const base = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1", "::1"].includes(base.hostname)) {
  throw new Error("Disposable database tests require a local PostgreSQL URL.");
}

const databaseName = `revory_sprint1_${randomBytes(6).toString("hex")}`;
const testUrl = new URL(base);
testUrl.pathname = `/${databaseName}`;
testUrl.searchParams.set("schema", "public");
const admin = new PrismaClient({ datasourceUrl: base.toString() });
let created = false;

function run(args, label) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
    encoding: "utf8",
    timeout: 180_000,
  });
  if (result.status !== 0) throw new Error(`${label} failed: ${result.stderr || result.stdout || result.error}`);
  process.stdout.write(result.stdout);
}

try {
  await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
  created = true;
  run(["node_modules/prisma/build/index.js", "migrate", "deploy"], "Disposable migration deploy");
  run([
    "--experimental-transform-types",
    "--loader", "./scripts/ts-runtime-loader.mjs",
    process.argv[2] ?? "scripts/validate-ai-integrity-sprint-1-db.ts",
  ], "Disposable AI Integrity integration test");
} finally {
  if (created) {
    if (!/^revory_sprint1_[a-f0-9]{12}$/.test(databaseName)) throw new Error("Unsafe disposable database name.");
    await admin.$executeRawUnsafe(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  }
  await admin.$disconnect();
}
