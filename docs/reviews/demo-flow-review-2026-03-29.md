# Demo Flow Reviewer

Date: 2026-03-29
Stage: Sprint 05 demo flow readiness
Product: REVORY Seller

## Objective

Refine the routed MVP path so the product reads in a cleaner commercial sequence during demo:

- activation locks the Seller path
- Booking Inputs makes booked proof visible
- Revenue View closes with a commercially believable read

## Routed path reviewed

- `/app`
- `/app/setup`
- `/app/setup/[step]`
- `/app/imports`
- `/app/dashboard`
- Shell-level supporting copy across the routed path

## What was found

### 1. App entry still dropped activated workspaces directly into the dashboard

That shortcut was fine for product access, but it weakened demo sequencing when booked proof was still missing. The path could open on revenue before the commercial proof underneath was visible.

### 2. Setup completion copy still treated dashboard and Booking Inputs as equally good next moves

That made the flow feel less guided than it should. After activation is complete, the honest next step is not always the dashboard. If booked proof is still missing, Booking Inputs should be the obvious move.

### 3. Booking Inputs explained its own job well, but not its place in the broader read strongly enough

The page was already outcome-first, but it did not make the bridge to the revenue view explicit enough for a demo sequence.

### 4. The dashboard still had a small sequencing leak

Before the final adjustment, some top-level dashboard states still treated any import signal as if the commercial read were already strong enough. That risked overstating readiness when only support context existed without true booked proof.

## What was changed

### App entry sequencing

- `/app` now routes activated workspaces to `/app/imports` until booked proof is actually visible from the appointments lane
- Once booked proof exists, `/app` routes to `/app/dashboard` again

This keeps the default path aligned with the strongest commercial story instead of forcing the user into a weaker opening state.

### Setup sequencing

- Setup now checks whether booked proof already exists
- When activation is complete but booked proof is still missing, the hero and next-move panel now point clearly to Booking Inputs
- When booked proof already exists, setup returns to the cleaner “open revenue view” guidance
- CTA labels were tightened to `Add booked proof`, `Open Revenue View`, and `Review Booking Inputs`

### Booking Inputs sequencing

- The hero now frames Booking Inputs as the bridge between activation and revenue view
- A dynamic status chip clarifies whether revenue view is still next or already supported
- When booked proof already exists, the page now offers a direct `Open Revenue View` CTA
- Support cards were reframed around `Booked proof first`, `Lead-base support`, and `Revenue handoff`
- Upload helper text now makes the appointments file clearly primary and the clients file clearly secondary

### Dashboard sequencing

- Top hero framing now uses `Revenue view` consistently
- Empty-state CTA language now says `Add booked proof` instead of the looser `View Booking Inputs`
- The main dashboard state now keys off real booked proof rather than generic import presence
- The revenue read only presents itself as connected when booked appointments are actually visible

### Onboarding shell coherence

- The onboarding shell now explicitly signals the sequence from activation pillars to booked proof to revenue view
- Guardrail copy was tightened so the flow feels narrower and more commercially directed

## Validation

- `npm run lint` -> passed
- `npm run typecheck` -> passed
- `npm run build` -> passed

## Verdict

**Approved**

The routed MVP path now reads more naturally in demo without adding screens, changing architecture, or inflating scope. REVORY Seller feels more presentable because the surfaces no longer compete for “what comes next.” Activation leads into booked proof, and booked proof leads into revenue view with better honesty and stronger commercial sequencing.
