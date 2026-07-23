import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const publicKeys = ["terms", "privacy", "refunds", "dpa", "security", "subprocessors", "cookies", "responsible-disclosure"];
for (const route of publicKeys) {
  assert(exists(`src/app/${route}/page.tsx`), `Missing English legal route: ${route}`);
  assert(exists(`src/app/pt-br/${route}/page.tsx`), `Missing pt-BR legal route: ${route}`);
}

const config = read("content/revory-legal.ts");
for (const token of ["legalRevision", "ACCOUNT_CREATION_LEGAL_VERSIONS", "CHECKOUT_LEGAL_VERSIONS", "68.046.497/0001-12"]) {
  assert(config.includes(token), `Central legal config is missing ${token}`);
}

const docs = read("content/revory-legal-documents.ts");
assert.equal((docs.match(/title: "39\. /g) ?? []).length, 2, "Terms must contain 39 sections in both locales.");
for (const phrase of ["does not sell personal data", "não vende dados pessoais", "reviewed mapping", "mapeamento revisado", "without undue delay", "sem demora indevida"]) {
  assert(docs.includes(phrase), `Legal documents are missing: ${phrase}`);
}

const dpa = read("content/revory-dpa-documents.ts");
for (const annex of ["Annex I", "Annex II", "Annex III", "Annex IV", "Anexo I", "Anexo II", "Anexo III", "Anexo IV"]) {
  assert(dpa.includes(annex), `DPA is missing ${annex}`);
}

const acceptanceService = read("services/legal/acceptance.ts");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260722000100_legal_acceptance_evidence/migration.sql");
assert(acceptanceService.includes("documentVersionsJson"));
assert(schema.includes("model LegalAcceptance"));
assert(migration.includes('CREATE TABLE "legal_acceptances"'));

const signup = read("components/auth/AuthOptionsPanel.tsx");
assert(signup.includes("By creating an account, you agree to the"));
assert(signup.includes('href="/terms"'));
assert(signup.includes('href="/privacy"'));
const reacceptGate = read("components/legal/LegalReacceptGate.tsx");
assert(reacceptGate.includes("MATERIAL_UPDATE") === false, "The UI should use plain-language copy, not an internal event code.");
assert(reacceptGate.includes('name="legalAccepted"'));
assert(read("src/app/(app)/app/layout.tsx").includes("hasCurrentAccountLegalAcceptance"));

const checkout = read("src/app/api/billing/checkout/route.ts");
assert(checkout.includes("legalTermsVersion"));
assert(checkout.includes("CHECKOUT_STARTED"));
assert(read("services/data-portability/workspace-export.ts").includes("legalAcceptances"), "Workspace export must include workspace-scoped legal acceptance evidence.");

const footer = read("src/app/page.tsx");
for (const href of ["/dpa", "/cookies", "/responsible-disclosure", "/pt-br/terms"]) {
  assert(footer.includes(`href="${href}"`), `Landing footer is missing ${href}`);
}

const subprocessors = read("content/revory-subprocessors.ts");
for (const provider of ["Vercel", "Neon", "Stripe", "Resend", "Google", "OpenAI"]) {
  assert(subprocessors.includes(`provider: "${provider}"`), `Missing actual provider ${provider}`);
}
assert(!subprocessors.includes("Clerk"), "Inactive Clerk must not be represented as a current subprocessor.");

console.log("Legal implementation QA passed: bilingual routes, versioning, clickwrap evidence, DPA annexes and provider boundaries are present.");
