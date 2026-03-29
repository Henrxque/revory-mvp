# Product Alignment Risk Review: OperationalSurface

Date: 2026-03-29
Stage: Sprint 04
Product: REVORY Seller

## Decision

Containment was the safer choice.

`OperationalSurface` is not on the current routed MVP path, and its previous structure still carried too much queue-like and operations-heavy framing. Instead of trying to rescue that entire surface into a broader pseudo-dashboard, the component was narrowed into a contained guidance layer that is explicitly secondary to activation, Booking Inputs, and the revenue view.

## Alignment verdict

The risk is now materially reduced. The surface no longer reads like a hidden operational board waiting to come back. It now behaves like a controlled fallback layer: narrow, honest, and clearly subordinate to the live REVORY Seller experience.

## What was changed

### 1. Removed ops-heavy dashboard structure from the component

Removed from `OperationalSurface`:

- category grid that read like an operational board
- priority list that read like a queue
- timing / insight / next-action card stacks that pushed the surface toward inbox or CRM behavior
- template preview section attached to this surface

Why:

- Those sections created too much structural pressure toward a heavier operations product, even when some copy tried to disclaim it.

### 2. Reframed the surface as contained support, not a live operating area

New framing:

- `Contained Guidance`
- `Seller keeps this read narrow.`
- explicit copy that says REVORY Seller should lead with activation, Booking Inputs, and the revenue view
- explicit containment note that this should stay secondary if it ever returns to active use

Why:

- This protects the MVP from future narrative regression if the component gets reused.

### 3. Kept only safe, narrow summary signals

The new version now keeps only:

- booked proof state
- count of guided next reads
- blocker count
- one contained decision block
- one CTA to Booking Inputs when booked proof does not exist yet

Why:

- These signals preserve usefulness without reopening queue logic, delivery-engine language, or a heavier operational mental model.

## Evidence

Main implementation:

- `components/dashboard/OperationalSurface.tsx`

Key containment cues:

- `Contained Guidance`
- `Seller keeps this read narrow.`
- `This layer stays intentionally secondary. Live REVORY Seller should lead with activation, Booking Inputs, and the revenue view, not with an operational board.`
- `This surface stays intentionally contained until booked visibility exists.`

Context note:

- `OperationalSurface` still exists in code, but it remains outside the routed MVP path at the moment.
- This implementation makes future accidental reuse materially safer.

## Scope adjustments

- No new module
- No new routed dashboard
- No new queue logic
- No CRM-style expansion
- No giant refactor of the operations services layer

## Validation evidence

- `npm run lint` -> passed
- `npm run typecheck` -> passed
- `npm run build` -> passed

## Verdict

Approved.

The safer Sprint 04 move was containment, and that is what was implemented. `OperationalSurface` no longer carries the same narrative risk it carried at Sprint 03 closeout, and it is much less likely to reintroduce an ops-heavy reading into the REVORY Seller MVP.
