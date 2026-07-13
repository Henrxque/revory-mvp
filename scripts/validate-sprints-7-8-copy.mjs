import fs from "node:fs";

const landing = fs.readFileSync("src/app/page.tsx", "utf8");
const realization = fs.readFileSync("src/app/(app)/app/revenue-realization/page.tsx", "utf8");
const imports = fs.readFileSync("components/imports/CanonicalImportPanel.tsx", "utf8");

for (const required of ["implemented locally", "Controlled sale", "commercial configuration"]) {
  if (!landing.includes(required)) throw new Error(`Landing is missing gated Revenue Realization copy: ${required}`);
}
for (const required of [
  "never guesses links",
  "ambiguous links and incomplete inputs suppress the claim",
  "not confirmed accounting loss or guaranteed recovery",
  "No silent linking",
]) {
  if (!realization.includes(required)) throw new Error(`Reconciliation UI is missing product-truth copy: ${required}`);
}
if (!imports.includes("do not unlock Revenue Realization pricing")) {
  throw new Error("Intake UI must keep Revenue Realization pricing behind its commercial gate.");
}
if (/revenue realization (?:is )?(?:live|available for sale)|(?:offers|delivers|is) guaranteed recovery|(?:is|shows) confirmed loss/i.test(`${landing}\n${realization}\n${imports}`)) {
  throw new Error("Sprints 7-8 active copy contains an unsupported commercial or financial claim.");
}
console.log("Sprints 7-8 copy-to-capability guard: PASS");
