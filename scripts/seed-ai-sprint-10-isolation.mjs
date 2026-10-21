import assert from "node:assert/strict";
import { randomBytes, scrypt } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";

assert.equal(process.env.REVORY_SYNTHETIC_SEED_ACK, "SPRINT_10_ISOLATION_ONLY");
const database = new URL(process.env.DATABASE_URL ?? "").pathname.slice(1);
assert.match(database, /^revory_ai_(sandbox|homolog)_[a-f0-9]{12}$/);

const prisma = new PrismaClient();
const email = "ai-isolation@revory.local";
const slug = "ai-isolation-sprint-10";
const password = randomBytes(24).toString("base64url");
const salt = randomBytes(16).toString("base64url");
const derived = await promisify(scrypt)(password, salt, 64);
const passwordHash = `scrypt$${salt}$${derived.toString("base64url")}`;

try {
  const existing = await prisma.user.findUnique({ where: { email } });
  assert.equal(existing, null, "The isolation test user already exists; refusing to rotate its password.");
  const user = await prisma.user.create({
    data: {
      email,
      fullName: "Synthetic Isolation Tester",
      authProvider: "credentials",
      emailVerifiedAt: new Date(),
      passwordHash,
      ownedWorkspaces: { create: { name: "Isolation Test AI", slug } },
    },
    select: { id: true, ownedWorkspaces: { select: { id: true } } },
  });
  await mkdir(".tmp", { recursive: true });
  await writeFile(".tmp/sprint10-isolation-account.json", JSON.stringify({ email, password, userId: user.id, workspaceId: user.ownedWorkspaces[0].id }), { mode: 0o600 });
  console.log(JSON.stringify({ database, email, workspaceCreated: true }));
} finally {
  await prisma.$disconnect();
}
