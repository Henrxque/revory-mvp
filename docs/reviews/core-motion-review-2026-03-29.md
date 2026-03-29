# Core Motion Review

## Objective

Make the lead-to-booking motion feel more explicit and more clearly perceived as the functional center of REVORY Seller, without rebuild, scope expansion, or product drift into CRM, inbox, or heavy ops.

## Alignment verdict

The implementation is aligned with REVORY Seller. The product now reads more clearly as a premium booking acceleration system, not as a source/import/schedule utility. The center of gravity shifted toward `lead received -> guided flow -> short triage -> lead advance -> booking`, while imports and source health were demoted to supporting roles that feed the motion.

## Findings

- The dashboard previously kept revenue first, but too much of the supporting read still leaned toward source/import context.
- Imports were honest and well-structured, but still risked reading as a product center instead of a feed into Seller motion.
- Setup and activation already had the right pillars, but the progression from lead intake to booking outcome needed to be more visually explicit.
- The product still needed a stronger explanation that motion comes first and operational detail stays secondary.

## Scope adjustments

- Preserved shell, design system, wireframe structure, and existing route architecture.
- Did not add CRM surfaces, inbox behavior, pipeline views, analytics expansion, or new backend objects.
- Strengthened perceived motion through hierarchy, labels, sequencing, and explanatory blocks only.
- Kept source and schedule context in the app, but repositioned them as inputs and outcomes around the booking motion.

## Copy adjustments

- Dashboard hero now leads with `Lead-to-booking motion`.
- Dashboard headline and support copy now explain that revenue and booked outcomes come from visible lead motion.
- Source area now reads as `Source feed`, not as the center of the product.
- Imports now describe sources as a feed for the booking path rather than the main product experience.
- Setup and activation already strengthened the motion language, and now read consistently with the dashboard.

## Files impacted by the core-motion pass

- `src/app/(app)/app/dashboard/page.tsx`
- `src/app/(app)/app/imports/page.tsx`
- `components/imports/ImportsFlowGrid.tsx`
- `src/app/(app)/app/setup/page.tsx`
- `src/app/(app)/app/setup/[step]/page.tsx`

## What was implemented

- Added a dedicated `Lead-to-booking motion` section to the dashboard.
- Introduced a visible motion progression across stages:
  - Lead received
  - Guided flow started
  - Short triage
  - Lead advance
  - Booking
- Reframed dashboard support metrics around lead base, booked outcomes, and motion honesty.
- Demoted source/import language so it supports motion instead of competing with it.
- Kept secondary signals clearly marked as secondary until the product has enough real coverage to show them honestly.

## Validation

- `npm run typecheck`
- `npx eslint "src/app/(app)/app/dashboard/page.tsx" "src/app/(app)/app/imports/page.tsx" "components/imports/ImportsFlowGrid.tsx" "src/app/(app)/app/setup/page.tsx" "src/app/(app)/app/setup/[step]/page.tsx"`
- `npm run build`

## Clear verdict

**Approved.**

The product now communicates lead-to-booking motion more clearly as the core of REVORY Seller while staying narrow, premium, and self-service.
