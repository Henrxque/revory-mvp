import assert from "node:assert/strict";

import { buildAssistedImportPayloadFromCsv } from "../../services/imports/build-assisted-import-payload";

function runDuplicateRawHeadersCase() {
  const csv = [
    "appointment_external_id,client_email,client_email,scheduled_at,status,client_full_name",
    "apt_1,ana@example.com,alt@example.com,2026-03-21T10:00:00Z,SCHEDULED,Ana Silva",
  ].join("\n");

  const payload = buildAssistedImportPayloadFromCsv("appointments", csv);

  assert.equal(payload.preview.hasDuplicateSourceHeaders, true);
  assert.deepEqual(payload.preview.duplicateSourceHeaders, ["client_email"]);
  assert.equal(payload.preview.canImport, false);
}

function runCasingSpacingAndPunctuationCase() {
  const csv = [
    " Appointment External Id , Client Full Name , scheduled.at , STATUS , Client Email ",
    "apt_2,Beatriz Costa,2026-03-22T11:00:00Z,SCHEDULED,bea@example.com",
  ].join("\n");

  const payload = buildAssistedImportPayloadFromCsv("appointments", csv);
  const matchedColumns = payload.preview.mappingOptions
    .filter((option) => option.matchStatus === "matched_with_confidence")
    .map((option) => option.targetColumn);

  assert.equal(payload.preview.canImport, true);
  assert.ok(matchedColumns.includes("appointment_external_id"));
  assert.ok(matchedColumns.includes("client_full_name"));
  assert.ok(matchedColumns.includes("scheduled_at"));
  assert.ok(matchedColumns.includes("status"));
  assert.ok(matchedColumns.includes("client_email"));
}

function runNeedsConfirmationCase() {
  const csv = [
    "appt identifier,client mobile number,service performed,scheduled visit,status text",
    "apt_3,+5511988887777,Hydra Glow,2026-03-23T12:00:00Z,SCHEDULED",
  ].join("\n");

  const payload = buildAssistedImportPayloadFromCsv("appointments", csv);

  assert.equal(payload.preview.suggestedCount, 5);
  assert.equal(payload.preview.unresolvedCount, 0);
  assert.equal(payload.preview.canImport, false);
}

function runPayloadReadinessCase() {
  const csv = [
    "full_name,email,last visit date",
    "Carlos Mendes,carlos@example.com,2026-03-10T15:00:00Z",
  ].join("\n");

  const payload = buildAssistedImportPayloadFromCsv("clients", csv);

  assert.equal(payload.templateKey, "clients");
  assert.ok(Array.isArray(payload.detectedHeaders));
  assert.ok(Array.isArray(payload.preview.mappingOptions));
  assert.equal(typeof payload.preview.canImport, "boolean");
  assert.equal(typeof payload.mapping, "object");
}

runDuplicateRawHeadersCase();
runCasingSpacingAndPunctuationCase();
runNeedsConfirmationCase();
runPayloadReadinessCase();

console.log("assisted-import-edge-cases-smoke: ok");
