import fs from "node:fs";
import path from "node:path";

const publicFiles = [
  "src/app/page.tsx", "src/app/layout.tsx", "src/app/start/page.tsx",
  "src/app/privacy/page.tsx", "src/app/terms/page.tsx",
  "src/app/sign-in/[[...sign-in]]/page.tsx", "src/app/sign-up/[[...sign-up]]/page.tsx",
];
const forbidden = [/\bQuoteSignal\b/i,/\bMedSpa(?:s)?\b/i,/\bclinic(?:s)?\b/i,/\bappointment(?:s)?\b/i,/\bpatient(?:s)?\b/i,/\btreatment(?:s)?\b/i,/\bno[ -]?show(?:s)?\b/i,/\bbooking(?:s)?\b/i];
const futureTerms = [/change orders?/i,/invoices?/i,/underbilling/i,/margin(?:-risk)?/i];
const content = publicFiles.map((file)=>({file,text:fs.readFileSync(path.join(process.cwd(),file),"utf8")}));
for (const {file,text} of content) for (const pattern of forbidden) if(pattern.test(text)) throw new Error(`${file} contains forbidden public term ${pattern}`);
const landing=content.find(({file})=>file==="src/app/page.tsx")?.text??"";
for(const pattern of futureTerms){const match=landing.match(pattern);if(match){const window=landing.slice(Math.max(0,(match.index??0)-260),(match.index??0)+360);if(!/roadmap|gated|not sold|unavailable for sale|require Sprints/i.test(window))throw new Error(`Future claim ${pattern} is not visibly gated`)}}
for(const required of ["high-ticket contractors","Quote Recovery Audit","$799","$399","Data Quality","not guaranteed revenue","Revenue Realization is gated"])if(!landing.includes(required))throw new Error(`Landing missing required copy: ${required}`);
if(/dangerouslySetInnerHTML|revory-landing-reference\.html|replaceAll\("QuoteSignal"/i.test(landing))throw new Error("Landing still depends on historical markup transformation.");
console.log("Sprint 4.1 public copy and brand guard: PASS");
