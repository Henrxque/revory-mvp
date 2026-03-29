# Activation Integrity Review

## Objective

Reframe the current setup and activation flow so it reads as the real beginning of the REVORY Seller booking machine, not as loose administrative setup.

## Alignment verdict

The flow is now aligned with the REVORY Seller 2.0 thesis. The setup no longer centers imports or generic workspace configuration as the perceived product core. Main Offer, Lead Source, Booking Path, and Deal Value now read as the active booking pillars that shape lead-to-booking motion and revenue visibility.

## Findings

- The previous setup language was visually strong but still read too much like workspace administration.
- The activation step grouped everything as generic setup review, which diluted the importance of the booking pillars.
- The setup checkpoint page surfaced configured and pending items, but it did not make the booking engine logic explicit enough.
- Supporting items such as brand voice and go-live state were visually too close to the core booking levers.

## Scope adjustments

- Kept the existing shell, wizard structure, step routing, and current persistence model.
- Reframed the flow through copy, grouping, hierarchy, and activation summaries instead of opening new modules.
- Elevated the four booking pillars into first-class cards on the setup checkpoint page.
- Moved brand voice and go-live state into a lighter support layer instead of treating them as equal operational pillars.
- Tightened the activation step so it explicitly shows what gets locked for go-live.

## Copy adjustments

- `Guided setup` became `Activation integrity` in the wizard rail.
- Step framing now uses `Booking pillar`, `Activation effect`, `Pillar role`, and `What this unlocks next`.
- `Set Your Deal Value` became `Set Your Revenue Baseline`.
- `Choose Your Brand Voice` became `Choose Your Booking Voice`.
- `Review and Activate` became `Activate Seller`.
- `/app/setup` now speaks in terms of booking pillars, activation integrity, and controlled go-live instead of generic configured/pending admin state.

## Files changed

- `services/onboarding/wizard-steps.ts`
- `components/onboarding/OnboardingStepLayout.tsx`
- `src/app/(app)/app/setup/[step]/page.tsx`
- `src/app/(app)/app/setup/page.tsx`
- `components/app/AppSidebar.tsx`

## Technical note

- `averageDealValue` already existed in the Prisma schema but the generated Prisma Client was stale. The client was regenerated so the activation flow types now match the schema again.
- `AppSidebar` had an overly narrow inferred nav-group type. That was normalized with an explicit group type to restore clean typechecking.

## Evidence

- The setup checkpoint now shows the four booking pillars as the dominant activation surface.
- The activation step now separates `Booking pillars locked for go-live` from supporting context.
- Each onboarding step now explains how that choice affects booking performance rather than only explaining setup.
- The flow remains narrow, self-service, premium, and MedSpa-first without adding new feature weight.

## Validation

- `npx prisma generate`
- `npm run typecheck`
- `npx eslint "components/app/AppSidebar.tsx" "services/onboarding/wizard-steps.ts" "components/onboarding/OnboardingStepLayout.tsx" "src/app/(app)/app/setup/page.tsx" "src/app/(app)/app/setup/[step]/page.tsx"`
- `npm run build`

## Clear verdict

**Approved.**

The activation flow now reads as the start of the REVORY Seller machine: one main offer, one lead source, one booking path, one revenue baseline, then activation into a live booking-first system. No rebuild was introduced, no CRM drift was added, and the premium shell stayed intact.
