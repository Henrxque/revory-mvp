import fs from "node:fs";

const files = [
  "src/app/(app)/app/revenue-realization/page.tsx",
  "src/app/(app)/app/revenue-realization/report/page.tsx",
  "src/app/(app)/app/revenue-realization/findings/[id]/page.tsx",
];
const source = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");

for (const required of [
  "not confirmed accounting loss",
  "not added",
  "No financial value",
  "ambiguous links",
  "without AI",
]) {
  if (!source.toLowerCase().includes(required.toLowerCase())) {
    throw new Error(`Sprint 9 evidence surfaces are missing product-truth copy: ${required}`);
  }
}
if (/REVORY guarantees? (?:revenue|recovery)|(?:this|REVORY) (?:is|shows?|proves?) (?:a )?confirmed (?:loss|leak)|automatically (?:rebills|recovers)/i.test(source)) {
  throw new Error("Sprint 9 active copy contains an unsupported financial or automation claim.");
}
console.log("Sprint 9 copy-to-capability and non-additive financial labeling: PASS");
