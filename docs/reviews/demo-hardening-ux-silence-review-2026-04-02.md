# Demo Hardening and UX Silence Review

Date: 2026-04-02
Stage: Sprint 08
Verdict: Approved

## Scope

This pass reviewed the active bounded-LLM surfaces in the routed MVP path:

- Revenue View
- Booking Inputs
- Activation step surfaces
- shared decision-support card

The goal was not to redesign the product or expand AI. The goal was to reduce perceived latency, keep the intelligence layer visually quiet, and preserve premium demo readability.

## What Was Found

### 1. LLM was still sitting on the critical render path

Before this pass:

- Revenue View awaited `getDashboardDecisionSupport(...)` before rendering the page.
- Booking Inputs awaited intent classification before rendering the hero.
- Activation step pages awaited `getActivationStepRead(...)` before rendering the step.

This was a real demo risk because Sprint 08 runtime validation had already shown real LLM latency in the ~1.6s to ~1.7s range on successful calls. Even though that runtime is acceptable for bounded support, it is too expensive to put directly in front of the first read of the page.

### 2. Booking Inputs still had one avoidable copy leak

The imports variant of the shared decision-support card showed two tiles both labeled `Next move`, even though the second tile was actually showing path framing.

### 3. The guidance layer still had a little too much chrome

The footer treatment in the shared decision-support card still looked like a separate explanatory box. It worked, but it pulled a bit too much attention for a layer that should feel embedded and quiet.

## What Was Changed

### Revenue View

File: `/C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/dashboard/page.tsx`

Before:

- Hero summary and right-side next-move panel waited on the LLM-backed read.

After:

- The hero now renders immediately from deterministic fallback via `buildDashboardDecisionSupport(...)`.
- The right-side `Next move` support panel now streams behind `Suspense`, with the deterministic read as the fallback shell.

Result:

- The first commercial read is immediate.
- LLM refinement still exists, but it is no longer allowed to delay the hero.

### Booking Inputs

File: `/C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/page.tsx`

Before:

- Hero title, summary, CTA label and next move were all blocked by intent classification.

After:

- Hero title, summary and CTA now render immediately from the deterministic fallback.
- The LLM stays active only in the smaller `Next move` support area inside the right-side aside.
- The guidance layer still refines the reading, but only after the proof-first hero is already visible.

Result:

- Booking Inputs feels more proof-first and less AI-shaped.
- The page no longer makes the user wait on intelligence before understanding the state.

### Activation Step Surfaces

File: `/C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/setup/[step]/page.tsx`

Before:

- Each activation step awaited the LLM-backed activation read before the step finished rendering.

After:

- Activation steps now render from deterministic fallback first via `buildActivationStepRead(...)`.
- The decision-support card streams behind `Suspense`, keeping activation readable even when the provider takes longer.

Result:

- Activation stays discrete.
- The guidance remains helpful, but no longer behaves like a render gate.

### Shared Guidance Card

File: `/C:/Users/hriqu/Documents/revory-mvp/components/ui/RevoryDecisionSupportCard.tsx`

Before:

- Imports variant used `Next move` twice.
- Activation used a special label set (`Keep tight`, `From here`) that felt less uniform.
- Footer note sat inside an extra bordered box.

After:

- The second imports tile now reads `Shortest path`.
- The card now uses a tighter, unified label system: `Next move`, `Main blocker`, `Shortest path`.
- The footer note was softened into a quieter top-border text row instead of a separate block.

Result:

- Less cognitive friction.
- Better cross-surface consistency.
- Less “AI layer explaining itself”.

## Files Changed

- `/C:/Users/hriqu/Documents/revory-mvp/components/ui/RevoryDecisionSupportCard.tsx`
- `/C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/dashboard/page.tsx`
- `/C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/page.tsx`
- `/C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/setup/[step]/page.tsx`

## Why This Improves Demo Strength

- The first read of each surface is now deterministic and immediate.
- The LLM remains bounded, useful and present, but no longer feels responsible for making the page exist.
- Booking Inputs reads more like proof support and less like AI-guided orchestration.
- Activation remains quiet.
- Revenue View remains commercially legible and does not wait on a support layer before showing the core story.

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`

All passed.

## Final Read

This pass improved the product in the correct direction for demo:

- more silent
- more premium
- more resilient to runtime latency
- less visually dependent on AI

The bounded intelligence layer is still there, but now it behaves more like a natural property of REVORY Seller and less like a visible subfeature.
