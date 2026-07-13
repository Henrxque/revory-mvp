# Sprint 4 — Quote Recovery experience

Status: **PASS locally** on 2026-07-12 with isolated authenticated browser evidence.

## Implemented

- Contractor-native executive dashboard with estimated, financial and operational bases separated.
- Top-three priority opportunities, full filtered opportunity list and source-lineage detail.
- Workspace-authorized dispositions for acknowledge, reviewed/resolved and dismissed false positive.
- Data Quality coverage and honest empty states without synthetic metrics.
- Formula-injection-safe CSV export and responsive route structure.
- Legacy dashboard and leak components remain as migration substrate but are no longer the active routes.

## Evidence and exit

`scripts/verify-sprint-4-browser.mjs` starts a dedicated local Next.js instance, requires a loopback PostgreSQL URL, creates an isolated credentials user/workspace, uses the real sign-in UI, imports canonical alternate-header files and verifies Data Quality, dashboard, evidence detail, disposition, formula-safe export and mobile layout. The fixture and isolated build output are removed after the run. The gate passes with `npm run qa:sprint-4:browser`.
