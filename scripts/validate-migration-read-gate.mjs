import assert from "node:assert/strict";
import { verifyMigrationManifest } from "./lib/verify-deployed-migrations.mjs";
const expected = [{ name: "m1", checksum: "a", rawChecksum: "b" }];
for (const checksum of ["a", "b"]) verifyMigrationManifest(expected, [{ migration_name: "m1", checksum, finished_at: new Date(), rolled_back_at: null }]);
for (const rows of [[], [{ migration_name: "m1", checksum: "x", finished_at: new Date() }], [{ migration_name: "m1", checksum: "a", finished_at: null }], [{ migration_name: "m1", checksum: "a", finished_at: new Date(), rolled_back_at: new Date() }]]) assert.throws(() => verifyMigrationManifest(expected, rows));
assert.throws(() => verifyMigrationManifest(expected, [{ migration_name: "m1", checksum: "a", finished_at: new Date() }, { migration_name: "m2", finished_at: null, rolled_back_at: null }]));
console.log("Migration read gate: PASS (match, line endings, missing, drift, unfinished and rollback).");
