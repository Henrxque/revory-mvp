# Dormant Regression Watchlist Reviewer

Date: 2026-03-29
Stage: Sprint 05 dormant watchlist cleanup
Product: REVORY Seller

## Scope reviewed

- `services/operations/operational-templates.ts`
- `components/dashboard/OperationalTemplatePreviewGrid.tsx`

## What was found

The Sprint 04 watchlist was still valid in dormant template code.

Residual user-facing language still leaned operational in two places:

- Recovery templates still used `Follow-up`, `Follow-up template`, and follow-up-led guidance copy.
- The dormant preview grid still used `Booking Playbook`, `Guided preparation`, and `live outreach delivery`.

I did not find these surfaces wired into the routed MVP path, so this remained a future-regression risk rather than a live demo blocker.

## What was changed

### 1. Recovery template reframed away from legacy ops language

In `services/operations/operational-templates.ts`:

- `Follow-up` became `Return to booking`
- `Follow-up template` became `Return-to-booking template`
- recovery description was rewritten to stay narrow, honest, and Seller-safe
- recovery next-step guidance now uses `return-to-booking` language instead of `follow-up` or `rebooking engine`

### 2. Dormant template-state labels were neutralized

In `services/operations/operational-templates.ts`:

- `Prepared base` became `Guidance ready`
- `Prepared base, with blockers` became `Guidance ready, with blockers`
- `Needs setup first` became `Needs path cleanup`
- `Preparation in place` became `Guidance in place`
- `Visible in model` became `Visible in guidance`

This keeps the template layer understandable without reading like an ops board or delivery system.

### 3. Preview grid framing was contained

In `components/dashboard/OperationalTemplatePreviewGrid.tsx`:

- `Guided preparation` became `Guided base`
- `Booking Playbook` became `Controlled Preview`
- the support copy now frames the surface as a secondary guided base with controlled preview, not a live delivery layer

## Regression-risk check

I re-scanned the operational/template area for the exact dormant watchlist terms:

- `Follow-up`
- `Booking Playbook`
- `Prepared base`
- `Needs setup first`
- `Preparation in place`
- `Visible in model`

No remaining matches were found in the reviewed dormant template files.

## Technical validation

- `npm run lint` -> passed
- `npm run typecheck` -> passed
- `npm run build` -> passed

## Final verdict

**Approved**

Reason:

- The dormant watchlist risk from Sprint 04 was neutralized surgically.
- No new module, flow, or routed-surface expansion was introduced.
- The active MVP path stayed untouched while future regression risk was materially reduced.
