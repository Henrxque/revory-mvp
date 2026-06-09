# REVORY Sprint 09 - Legacy Naming and Copy Sweep

## Summary

Final launch sweep passed with minor safe copy fixes.

The remaining user-facing product promise now reads as REVORY, a Revenue Leak Detector for premium MedSpas. The sweep found no launch-blocking public use of `REVORY Seller`, `booking acceleration`, `booked visibility`, `booking visibility`, `booked proof`, `booking proof`, `proof summary`, `observed revenue`, `generated revenue`, `recovered revenue`, `lost revenue`, `confirmed loss`, `AI detected leaks` or `automatic recovery` after the fixes in this pass.

Remaining `CRM`, `inbox` and `BI` occurrences in public surfaces are acceptable negation/disclaimer language that protects category safety.

## Files Inspected

- `src/**`
- `components/**`
- `services/**`
- `types/**`
- `lib/**`
- `scripts/**`
- `README.md`
- `AGENTS.md`
- `docs/*.md`
- `docs/sprints/*.md`
- Historical review docs were sampled and classified as historical rather than launch copy.

## Must Fix Now

### Setup source note

- File: `src/app/(app)/app/setup/[step]/page.tsx`
- Found: `fastest path to booked visibility`
- Classification: Must fix now.
- Fix: changed to `fastest path to clinic data visibility`.
- Reason: `booked visibility` is Seller-era language and makes setup feel booking-first instead of leak-read/data-read first.

### Dashboard executive read copy

- File: `services/dashboard/get-dashboard-overview.ts`
- Found: repeated `Observed revenue` copy and label.
- Classification: Must fix now.
- Fix: changed to `appointment revenue evidence` and `Revenue evidence`.
- Reason: `observed revenue` sounds like an old revenue/proof dashboard promise. The launch product should keep the read tied to appointment evidence and estimated risk.

### Dashboard visible explanatory copy

- File: `src/app/(app)/app/dashboard/page.tsx`
- Found: `observed revenue, appointment evidence, freshness and support context`.
- Classification: Must fix now.
- Fix: changed to `appointment revenue evidence, freshness and support context`.
- Reason: more precise and less proof-era.

### Old executive proof sheet copy

- File: `components/proof/ExecutiveProofSummarySheet.tsx`
- Found: `observed revenue`.
- Classification: Must fix now if the component becomes visible again; safe to fix now.
- Fix: changed to `appointment revenue evidence`.
- Reason: old proof-era component can remain as implementation substrate, but visible copy should not drift.

### Old executive proof read copy

- File: `services/proof/get-executive-proof-summary-read.ts`
- Found: `Observed revenue in current read` and `Observed revenue read`.
- Classification: Must fix now if read is reused; safe to fix now.
- Fix: changed to `Appointment revenue evidence in current read` and `Revenue evidence read`.
- Reason: same product-truth correction.

### Imports opportunity copy

- File: `src/app/(app)/app/imports/page.tsx`
- Found: `not confirmed lost revenue`.
- Classification: Must fix now.
- Fix: changed to `not confirmed financial loss`.
- Reason: even as a negation, `lost revenue` is a sharper accounting claim than needed.

## Internal Technical Debt

### Proof-era file and function names

- Examples:
  - `components/proof/ExecutiveProofSummarySheet.tsx`
  - `components/proof/ExecutiveProofSummaryCard.tsx`
  - `services/proof/get-executive-proof-summary-read.ts`
  - `EXECUTIVE_PROOF_SHARE`
- Classification: Internal technical debt.
- Decision: do not rename before launch.
- Reason: behavior is correct and renaming technical substrate could create avoidable billing/share regression.

### Lead booking seller voice helper

- File: `services/lead-booking/get-lead-intake-routing-read.ts`
- Found: `formatLeadBookingSellerVoice` import and `seller-voice-labels` technical name.
- Classification: Internal technical debt.
- Decision: leave as-is.
- Reason: not visible as public positioning in this sweep. Renaming helper/files is lower ROI than launch validation.

### Legacy LLM QA script

- File: `scripts/qa-llm-fallback-structured-output.mjs`
- Found: Seller-era fixture strings such as `Seller guidance`, `Booked proof`, `Booking Inputs -> booked proof -> revenue view`.
- Classification: Internal technical debt.
- Decision: leave as-is for this launch copy sweep.
- Reason: this is an old fallback QA fixture, not current public UI. It should be retired or rewritten in a future technical debt pass if the script remains relevant.

## Historical Docs

Historical docs intentionally retain old terminology with disclaimers:

- `docs/revory-seller-project-documentation.md`
- `docs/reviews/**`
- earlier Sprint 01-08 reports that discuss removed legacy copy

Classification: Historical doc.

Decision: do not rewrite broadly. These docs are not current source of truth. `docs/source-of-truth.md` remains the current product reference.

## Acceptable Negation / Disclaimer

The following terms remain in user-facing or public surfaces as category guardrails:

- `CRM`
- `inbox`
- `BI`
- `BI suite`

Examples:

- Terms clarify REVORY is not a CRM, inbox, scheduling system, healthcare BI suite, RCM, clinical/diagnostic software or managed consulting.
- Landing/reference copy says REVORY does not become CRM, inbox or BI bloat.
- Onboarding/imports explain the product avoids CRM sprawl and inbox/follow-up automation.

Classification: Acceptable negation/disclaimer.

Decision: keep.

Reason: these mentions reduce category misunderstanding and do not position REVORY as those products.

## Requires Founder Decision

No launch-blocking founder decision was found in this sweep.

Potential future decision:

- Whether to retire or rename proof-era technical substrate after launch.
- Whether to rewrite old LLM fallback QA fixtures around the new leak-first language.

Neither is required for MVP launch if current visible surfaces remain aligned.

## Search Terms Used

- `REVORY Seller`
- `Seller`
- `booking acceleration`
- `booked visibility`
- `booking visibility`
- `booked proof`
- `booking proof`
- `proof summary`
- `observed revenue`
- `generated revenue`
- `recovered revenue`
- `lost revenue`
- `confirmed loss`
- `AI detected leaks`
- `automatic recovery`
- `CRM`
- `inbox`
- `BI suite`

## Final Recommendation

Approved for launch copy readiness with technical debt noted.

The product no longer visibly sells the old REVORY Seller promise in primary user-facing surfaces. Remaining legacy language is either historical, internal technical naming, old QA fixture debt, or explicit negation/disclaimer that protects category safety.
