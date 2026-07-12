# Sprint 4.1 — REVORY Landing Copy & Brand Correction

Status: passed locally on 2026-07-12.

## Delivered

- Replaced the historical HTML transformation pipeline with a canonical React landing.
- Repositioned hero, workflow, current signals, FAQ, pricing, CTA and metadata for high-ticket contractors.
- Kept the US$799 Quote Recovery Audit primary and the US$399 Starter visibly gated.
- Marked invoices, change orders, underbilling and margin as Revenue Realization roadmap only.
- Used Instrument Serif only for impact headings, DM Sans for copy/navigation/cards, and the canonical `#141516`, `#252729`, `#43B39B` system.
- Added a public-copy guard that rejects QuoteSignal, MedSpa, clinic, appointment, patient, treatment, no-show and booking language.
- Restored the premium centered hero composition without restoring historical copy or markup transforms.
- Kept both hero CTAs above the initial desktop and mobile fold, added verified anchor navigation and restored accent glow on marketing cards.
- Replaced repeated signal checkmarks with six distinct evidence-oriented icons.
- Compressed the commercial selection screen into a one-page desktop checkout while preserving explicit offer gates.

## Evidence

- `qa:sprint-4-1`: PASS.
- `qa:sprint-4-1:browser`: PASS on 1440×1000 and 390×844, including navigation, initial-fold CTA, hover glow and one-page desktop checkout assertions.
- No browser console error or framework overlay.

## Exit

**Passed.** The public landing now tells only the current Quote Recovery story and explicitly gates Revenue Realization.
