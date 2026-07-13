import fs from "node:fs";

const landing = fs.readFileSync("src/app/page.tsx", "utf8");
const realization = fs.readFileSync("src/app/(app)/app/revenue-realization/page.tsx", "utf8");
const imports = fs.readFileSync("components/imports/CanonicalImportPanel.tsx", "utf8");

for (const required of ["implemented locally", "Sprint 9", "commercial gates"]) {
  if (!landing.includes(required)) throw new Error(`Landing is missing gated Revenue Realization copy: ${required}`);
}
for (const required of [
  "external IDs only",
  "suppresses the calculated output",
  "not a released finding or guaranteed loss",
  "No silent linking",
]) {
  if (!realization.includes(required)) throw new Error(`Reconciliation UI is missing product-truth copy: ${required}`);
}
if (!imports.includes("do not create premium findings")) {
  throw new Error("Intake UI must not imply that Sprint 7 imports create premium findings.");
}
if (/revenue realization (?:is )?(?:live|available for sale)|(?:offers|delivers|is) guaranteed recovery|(?:is|shows) confirmed loss/i.test(`${landing}\n${realization}\n${imports}`)) {
  throw new Error("Sprints 7-8 active copy contains an unsupported commercial or financial claim.");
}
console.log("Sprints 7-8 copy-to-capability guard: PASS");
