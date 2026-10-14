# REVORY UX quick win — 2026-10-14

Founder feedback: the premium visual identity is intact, but a first-time user could not identify what to do next. This update improves the protected synthetic Preview on the Sprint 11 branch.

## Changes

- Home prioritizes the latest saved report, with a separate next-step card based on existing access, files and links. File counts do not imply comparable periods or validated attribution.
- Navigation uses Home & reports, Add your data, Link customers and Create a report.
- Intake explains each source and can load the exact bundled fictional CSV into the existing review flow. It still requires column review, quality validation and confirmation before storage. Real files remain blocked by the existing Preview policy.
- File settings move into a disclosure. Period boundaries remain explicitly UTC and exclusive at the end.
- Report setup preselects only unambiguous original files. Mixed periods, unknown IDs, duplicate imports and wrong source kinds cannot be silently selected. Reviewed identity-page selections travel to setup in query parameters and resolve only within workspace-scoped data.
- Calendar values convert to explicit UTC without interpreting the user's computer timezone. Export dates, completeness and settling delay remain user-reviewed inputs; upload time is not substituted for source completeness.
- Browser verification exposed a pre-existing sample hash mismatch between Windows CRLF and deployed LF files. The Preview allowlist now normalizes only newline spelling and still rejects changed/extra data. Both newline formats are covered by Sprint 10 gate tests.
- Report explains the comparison, the two source quantities, a next review action and unavailable conclusions. Exports and optional synthetic feedback remain accessible in disclosures.
- Brand tokens, auth, scope checks, deterministic rules, evidence and purchase requirements remain in place. No migration or new connector.

## Verification

- TypeScript and targeted ESLint.
- `node --experimental-transform-types --loader ./scripts/ts-runtime-loader.mjs scripts/validate-ai-integrity-ux.ts`: selection ambiguity, cross-period and scoped-ID checks, duplicate exclusion and UTC conversion.
- Protected Preview browser verification and screenshots recorded after deployment.

This is a bounded UX improvement. It does not provide a persistent onboarding wizard, automatic source closure, real customer validation or a public release. Preparation still requires the customer to have an internal usage export; missing data must remain explicit.
