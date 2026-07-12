# Sprint 4 — Quote Recovery experience

Status: implementation complete locally; exit gate not signed off because the automated authenticated browser harness could not establish a local NextAuth QA session.

## Implemented

- Contractor-native executive dashboard with estimated, financial and operational bases separated.
- Top-three priority opportunities, full filtered opportunity list and source-lineage detail.
- Workspace-authorized dispositions for acknowledge, reviewed/resolved and dismissed false positive.
- Data Quality coverage and honest empty states without synthetic metrics.
- Formula-injection-safe CSV export and responsive route structure.
- Legacy dashboard and leak components remain as migration substrate but are no longer the active routes.

## Evidence and exit

Typecheck, ESLint and production build pass. `scripts/verify-sprint-4-browser.mjs` creates isolated fixtures and checks desktop/mobile, detail and export, but the already-running local NextAuth server rejected both programmatic QA authentication methods. The UI exit gate therefore remains **not yet passed** rather than being signed off without browser evidence.
