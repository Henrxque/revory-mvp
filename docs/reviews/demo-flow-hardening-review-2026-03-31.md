# Demo Flow Hardening Review

## Context

Sprint 06 introduced a minimal decision-support layer into the active REVORY Seller path. The goal of this pass was not to expand intelligence, but to harden demo readability after that addition so the product feels smarter without feeling noisier, heavier, or more self-referential.

## Surfaces reviewed

- Dashboard revenue view
- Booking Inputs / CSV upload flow
- Activation step surfaces
- Shared decision-support card

## What was found

The new recommendation layer was functionally aligned with the product thesis, but it was starting to explain its own control model too explicitly inside prospect-facing surfaces.

Main demo risks before cleanup:

- `Guided recommendation` and `Controlled Read / Controlled Support` made the layer sound more like an AI feature being introduced than a native product read.
- `Detected objection` sounded more abstract and sales-scripted than the rest of the interface.
- Separate `Closed rail` and `Fallback` blocks gave the card extra vertical weight and drew attention to system discipline instead of business value.
- Several support summaries in activation/import/dashboard talked about the intelligence layer itself instead of reinforcing the booking and revenue story.

## What was changed

### Shared card refinement

File: `components/ui/RevoryDecisionSupportCard.tsx`

- Reframed the card language from `Detected objection` to `Main blocker`.
- Reframed `Recommended path` to `Shortest path`.
- Compressed `Closed rail` and `Fallback` into one subtle footer treatment instead of two standalone support blocks.
- Preserved the premium visual system and the same controlled-read structure, but reduced the amount of explanation the user needs during demo.

### Dashboard guidance refinement

File: `services/decision-support/build-dashboard-decision-support.ts`

- Renamed the badge to `Seller guidance`.
- Reframed the eyebrow to `Revenue read`.
- Shortened summaries and guardrail/fallback notes so the read feels commercial first and procedural second.
- Kept the commercial recommendation intact: booked proof first when missing, refresh proof when stale, keep the revenue read narrow when healthy.

### Booking Inputs guidance refinement

File: `services/decision-support/build-import-decision-support.ts`

- Renamed the badge to `Seller guidance`.
- Reframed the lane reads to `Booked proof read` and `Lead-base read`.
- Shortened guardrail and fallback language to keep the card focused on file fit, proof strength, and next move.
- Preserved the closed-rail behavior while removing wording that made the layer feel like a self-explaining AI system.

### Activation guidance refinement

File: `services/decision-support/build-activation-step-read.ts`

- Renamed the badge to `Seller guidance`.
- Reframed the eyebrow to `Activation read`.
- Removed explicit meta-language about intelligence where it was unnecessary.
- Replaced `AI posture` with `Voice scope` to keep the setup focused on product behavior rather than AI framing.
- Preserved activation honesty and closed-rail language without turning the setup into an explanation of the AI layer.

## Before / after

Before:

- The product looked controlled, but the recommendation layer sometimes announced that control too loudly.
- Demo attention could drift toward “what this AI block is doing” instead of “what the product helps me do next.”

After:

- The layer reads like native Seller guidance.
- The next move is faster to understand.
- The commercial story stays dominant: booked proof, booking path, revenue read, next move.
- Closed-rail integrity remains visible, but no longer steals attention from the business value.

## Validation evidence

- `npm run lint` passed
- `npm run build` passed
- `npm run typecheck` failed once before build because of the known transient `.next/types/validator.ts` issue
- `npm run typecheck` passed on the final rerun after build

## Verdict

**Approved.**

The Sprint 06 intelligence layer now strengthens demo flow instead of competing with it. REVORY Seller feels more intelligent, but still narrow, premium, predictable, booking-first, and revenue-first.
