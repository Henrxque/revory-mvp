import assert from "node:assert/strict";

import { PrismaClient } from "@prisma/client";

const requiredAcknowledgement = "READ_ONLY_ISOLATED_RESTORE";
assert.equal(
  process.env.REVORY_RESTORE_CHECK_ACK,
  requiredAcknowledgement,
  `Set REVORY_RESTORE_CHECK_ACK=${requiredAcknowledgement} only after creating an isolated provider restore.`,
);

const sourceUrl = process.env.REVORY_RESTORE_SOURCE_DATABASE_URL?.trim();
const restoreUrl = process.env.REVORY_RESTORE_TARGET_DATABASE_URL?.trim();
assert.ok(sourceUrl, "REVORY_RESTORE_SOURCE_DATABASE_URL is required.");
assert.ok(restoreUrl, "REVORY_RESTORE_TARGET_DATABASE_URL is required.");

function databaseIdentity(connectionString) {
  const parsed = new URL(connectionString);
  assert.match(parsed.protocol, /^postgres(?:ql)?:$/, "Only PostgreSQL restore checks are supported.");
  return {
    database: parsed.pathname.replace(/^\//, ""),
    host: parsed.hostname,
    port: parsed.port || "5432",
  };
}

const sourceIdentity = databaseIdentity(sourceUrl);
const restoreIdentity = databaseIdentity(restoreUrl);
assert.notDeepEqual(
  restoreIdentity,
  sourceIdentity,
  "Restore target resolves to the source database. Refusing to continue.",
);
assert.notEqual(
  restoreIdentity.host,
  sourceIdentity.host,
  "Restore target must use a distinct isolated database endpoint.",
);

function requiredTimestamp(name) {
  const value = process.env[name]?.trim();
  assert.ok(value && !Number.isNaN(Date.parse(value)), `${name} must be a valid ISO timestamp.`);
  return new Date(value);
}

const backupCapturedAt = requiredTimestamp("REVORY_BACKUP_CAPTURED_AT");
const restoreStartedAt = requiredTimestamp("REVORY_RESTORE_STARTED_AT");
const restoreCompletedAt = requiredTimestamp("REVORY_RESTORE_COMPLETED_AT");
assert.ok(restoreStartedAt >= backupCapturedAt, "Restore start cannot predate the backup.");
assert.ok(restoreCompletedAt >= restoreStartedAt, "Restore completion cannot predate its start.");

const source = new PrismaClient({ datasourceUrl: sourceUrl });
const restore = new PrismaClient({ datasourceUrl: restoreUrl });

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function tableNames(client) {
  const rows = await client.$queryRawUnsafe(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name",
  );
  return rows.map((row) => String(row.table_name));
}

async function rowCounts(client, tables) {
  const counts = new Map();
  for (const table of tables) {
    const rows = await client.$queryRawUnsafe(
      `SELECT COUNT(*)::bigint AS count FROM ${quoteIdentifier("public")}.${quoteIdentifier(table)}`,
    );
    counts.set(table, BigInt(rows[0]?.count ?? 0));
  }
  return counts;
}

try {
  await Promise.all([source.$connect(), restore.$connect()]);
  const [sourceTables, restoreTables] = await Promise.all([
    tableNames(source),
    tableNames(restore),
  ]);

  assert.deepEqual(
    restoreTables,
    sourceTables,
    "The isolated restore does not contain the same public table structure as the source.",
  );

  const [sourceCounts, restoreCounts] = await Promise.all([
    rowCounts(source, sourceTables),
    rowCounts(restore, restoreTables),
  ]);
  const mismatchedTables = sourceTables.filter(
    (table) => sourceCounts.get(table) !== restoreCounts.get(table),
  );

  if (process.env.REVORY_REQUIRE_EXACT_RESTORE_COUNTS === "true") {
    assert.deepEqual(
      mismatchedTables,
      [],
      "Exact row-count verification failed for the isolated restore.",
    );
  }

  const total = (counts) =>
    [...counts.values()].reduce((sum, count) => sum + count, 0n);
  const rpoMinutes = Math.round(
    (restoreStartedAt.getTime() - backupCapturedAt.getTime()) / 60_000,
  );
  const rtoMinutes = Math.round(
    (restoreCompletedAt.getTime() - restoreStartedAt.getTime()) / 60_000,
  );

  console.log(JSON.stringify({
    exactCountMatches: sourceTables.length - mismatchedTables.length,
    countMismatches: mismatchedTables.length,
    restoreRows: total(restoreCounts).toString(),
    sourceRows: total(sourceCounts).toString(),
    status: "PASS",
    structuralMatch: true,
    tablesChecked: sourceTables.length,
    measuredRpoMinutes: rpoMinutes,
    measuredRtoMinutes: rtoMinutes,
  }, null, 2));
} finally {
  await Promise.allSettled([source.$disconnect(), restore.$disconnect()]);
}
