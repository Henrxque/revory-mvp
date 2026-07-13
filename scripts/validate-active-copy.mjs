import fs from "node:fs";

const activeFiles = [
  "src/app/page.tsx",
  "src/app/start/page.tsx",
  "src/app/demo/page.tsx",
  "src/app/sign-in/[[...sign-in]]/page.tsx",
  "src/app/sign-up/[[...sign-up]]/page.tsx",
  "src/app/(app)/app/layout.tsx",
  "src/app/(app)/app/dashboard/page.tsx",
  "src/app/(app)/app/imports/page.tsx",
  "src/app/(app)/app/revenue-leaks/page.tsx",
  "src/app/(app)/app/revenue-leaks/[id]/page.tsx",
  "src/app/(app)/app/history/page.tsx",
  "src/app/(app)/app/settings/page.tsx",
  "components/app/AppSidebar.tsx",
  "components/imports/CanonicalImportPanel.tsx",
];
const forbidden = /\b(?:QuoteSignal|MedSpa|clinics?|appointments?|patients?|treatments?|bookings?|no[ -]?shows?)\b/i;

function extractVisibleCopy(source) {
  const strings = [...source.matchAll(/(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g)].map((match) => match[2]);
  const jsxText = [...source.matchAll(/>([^<{][^<]*)</g)].map((match) => match[1]);
  return [...strings, ...jsxText].join("\n");
}

for (const file of activeFiles) {
  const visibleCopy = extractVisibleCopy(fs.readFileSync(file, "utf8"));
  const match = visibleCopy.match(forbidden);
  if (match) throw new Error(`${file} contains prohibited active copy: ${match[0]}`);
}
console.log("Active public and authenticated contractor copy guard: PASS");
