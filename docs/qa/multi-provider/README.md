# Multi-provider controlled proof — 26 October 2026

These are **local fixture results**, not real Anthropic/Google account validation, completed purchases, customer feedback or a production release. The founder has no usage data in those accounts. No provider generation requests, external reads, live payments or customer-system changes were made for these tests.

## Verified

| Check | Result and boundary |
| --- | --- |
| Provider contracts/security | PASS: exact Anthropic decimal cents/cache categories; pagination/revocation; Google Developer/Vertex dimensions; unavailable metric versus permission failure; separate credits; fixed project-bound capped SELECT; forbidden generation/host/SQL/job rejection; scoped encrypted credentials. |
| Disposable PostgreSQL | PASS with migration 40: four encrypted connections; five selected batches; three provider reports; one consumed scan grant; four exact usage differences; immutable 4.3 replay and no credential exports. Duplicate-provider and foreign-batch inputs are rejected; incomplete closure suppresses the affected provider without inventing zero for it or hiding supported comparisons for others. |
| Recurring Monitor | PASS: three controlled periods, same-scope changes, suppression on removed provider, authorization and minimum Google lag. Existing Monitor DB regression also passed. |
| Historical reports | PASS: existing connected-report DB regression preserves 4.2 behavior and 4.1 reproduction. Existing sprint 4 deterministic/adversarial and sprint 8 temporal checks passed. |
| Authenticated browser → API → database → report | PASS at 1440px and 390px: guided Anthropic/Gemini/Vertex setup, five-batch report submission, scope and unknown provider visible, no page errors or horizontal overflow. |
| Static validation | Changed/new TypeScript files pass ESLint. Production build passes with an ephemeral local AUTH_SECRET; no production secret is copied. |

Machine-readable assertions: [controlled integration](controlled-integration.json), [browser proof](browser-proof.json), [verification summary](verification.json).

Visual review: [connections desktop](gemini-connection-desktop.png), [connections mobile](gemini-connection-mobile.png), [report desktop](multi-provider-report-desktop.png), [report mobile](multi-provider-report-mobile.png). Screenshots contain fixture data and empty credential fields.

## Reproduction

Run `npm ci`, `npm run qa:ai-multi-provider`, `npm run qa:ai-integrity-sprint-4`, and `npm run qa:ai-integrity-sprint-8`.

Database commands require a loopback-only disposable PostgreSQL base URL through `DATABASE_URL`:

```powershell
npm run qa:ai-multi-provider:db
npm run qa:ai-multi-provider:browser
node scripts/validate-ai-integrity-sprint-1-db.mjs scripts/validate-ai-connected-report-db.ts
node scripts/validate-ai-integrity-sprint-1-db.mjs scripts/validate-ai-monitor-db.ts
```

The database harness creates and drops its own randomly named database. The browser helper runs a local server, uses a synthetic session and shuts down only its spawned server. Never point these commands at production or a customer database.

## Still required

Nonempty official account payloads and independent export equivalence for Anthropic, Gemini Developer API and Vertex; remote isolated migration/staging; real permissions, lag, IAM and credential rotation checks; reviewed privacy disclosures; explicit publication authority. See the [release gate](../../operations/REVORY_MULTI_PROVIDER_VALIDATION_AND_RELEASE.md).

Gemini Developer API usage is output-only when its documented metric exists. Missing usage remains unknown. Google billing export provenance/completeness is owner-reviewed, billing may lag beyond 48h, and credits/adjustments can suppress cost attribution. No comprehensive margin or recovered-money claim follows from these fixtures.

## Automatic remote Preview

The Git integration attempted Preview `dpl_4CKHxDJ8PHwTyL7p9PFYxjQNmth2` for implementation commit `412ae37`. It stopped at the existing deployment guard in `scripts/vercel-build.mjs:28`: `DATABASE_URL is required before a Vercel deployment can verify and apply Prisma migrations.` No remote migration ran. The local production build passed; remote staging remains unavailable until an isolated database and branch-specific environment are reviewed/configured. The guard was preserved and no secrets were changed to bypass it. [Sanitized evidence](remote-preview.json).
