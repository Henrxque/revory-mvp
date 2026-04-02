# Intent Classification LLM Review

Date: 2026-04-01
Stage: Sprint 07 intent classification and objection detection
Product: REVORY Seller

## Intent of the stage

Introduce real bounded LLM classification into REVORY Seller without opening chat, inbox behavior, vague categories, or long AI explanations.

The implementation target was:

- controlled intent enums
- controlled objection enums
- one simple confidence band
- short structured output only
- direct connection to existing recommendation logic
- no extra visual weight in the product

## Files Changed

- [intent-classification.ts](/C:/Users/hriqu/Documents/revory-mvp/types/intent-classification.ts)
- [request-bounded-structured-output.ts](/C:/Users/hriqu/Documents/revory-mvp/services/llm/request-bounded-structured-output.ts)
- [request-bounded-intent-classification.ts](/C:/Users/hriqu/Documents/revory-mvp/services/llm/request-bounded-intent-classification.ts)
- [request-bounded-decision-support-patch.ts](/C:/Users/hriqu/Documents/revory-mvp/services/llm/request-bounded-decision-support-patch.ts)
- [apply-intent-classification.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/apply-intent-classification.ts)
- [get-activation-step-read.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/get-activation-step-read.ts)
- [get-dashboard-decision-support.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/get-dashboard-decision-support.ts)
- [imports/page.tsx](/C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/page.tsx)

## What Was Implemented

### 1. Controlled enums for intent and objection

New shared enum layer:

- [intent-classification.ts](/C:/Users/hriqu/Documents/revory-mvp/types/intent-classification.ts)

Implemented intent codes:

- `LOCK_MAIN_OFFER`
- `CHOOSE_LEAD_ENTRY`
- `LOCK_BOOKING_PATH`
- `SET_VALUE_PER_BOOKING`
- `COMPLETE_ACTIVATION`
- `START_BOOKED_PROOF`
- `REVIEW_BOOKED_PROOF`
- `OPEN_REVENUE_VIEW`
- `REFRESH_BOOKED_PROOF`
- `ADD_LEAD_BASE_SUPPORT`

Implemented objection codes:

- `NO_ACTIVE_BLOCKER`
- `MULTI_OFFER_RISK`
- `LEAD_ENTRY_MISSING`
- `BOOKING_PATH_MISSING`
- `VALUE_PER_BOOKING_MISSING`
- `PROOF_NOT_VISIBLE`
- `PROOF_SOURCE_NEEDS_REVIEW`
- `LEAD_BASE_ONLY`
- `SUPPORT_SHOULD_STAY_SECONDARY`
- `THIN_BOOKING_CALENDAR`

Confidence band:

- `low`
- `medium`
- `high`

### 2. Real bounded classification runtime

New central structured-output helper:

- [request-bounded-structured-output.ts](/C:/Users/hriqu/Documents/revory-mvp/services/llm/request-bounded-structured-output.ts)

New classification adapter:

- [request-bounded-intent-classification.ts](/C:/Users/hriqu/Documents/revory-mvp/services/llm/request-bounded-intent-classification.ts)

What the runtime now returns:

- `intent`
- `objection`
- `confidenceBand`
- `rationale`

Properties of the runtime:

- strict JSON schema
- exact enum validation
- short rationale only
- timeout and retry inherited from the bounded LLM layer
- no free-form output

### 3. Classification now drives recommendation logic

New mapper:

- [apply-intent-classification.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/apply-intent-classification.ts)

What it does:

- uses `intent` and `objection` to choose the recommendation template already expected by the product
- updates `nextBestAction`, `detectedObjection`, and `recommendedPath` before the short phrasing layer runs
- ignores low-confidence classifications and falls back to deterministic behavior

This keeps the product predictable:

- enums influence recommendation logic
- low-confidence reads do not take over the flow
- the wording layer only refines the selected path

## Where It Is Live

### Activation Path

Connected in:

- [get-activation-step-read.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/get-activation-step-read.ts)

What is now real:

- each activation step gets a bounded intent and primary objection classification
- that classification can shape the step recommendation before the short phrasing patch is applied

Examples:

- `template` can classify toward `LOCK_MAIN_OFFER`
- `source` can classify toward `CHOOSE_LEAD_ENTRY` or `START_BOOKED_PROOF`
- `deal_value` can classify toward `SET_VALUE_PER_BOOKING`
- final activation can classify toward `START_BOOKED_PROOF` when proof is still the real next move

### Revenue View

Connected in:

- [get-dashboard-decision-support.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/get-dashboard-decision-support.ts)

What is now real:

- the dashboard can classify whether the real intent is:
  - `START_BOOKED_PROOF`
  - `REVIEW_BOOKED_PROOF`
  - `REFRESH_BOOKED_PROOF`
  - `ADD_LEAD_BASE_SUPPORT`
  - `OPEN_REVENUE_VIEW`

- it can also classify whether the main objection is:
  - missing proof
  - proof source needing review
  - lead base only
  - thin booking calendar
  - or no active blocker

This directly shapes the revenue-side recommendation without changing the dashboard structure.

### Booking Inputs

Connected in:

- [imports/page.tsx](/C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/page.tsx)

What is now real:

- the Booking Inputs hero uses bounded intent classification to choose the right hero framing and next move
- it now classifies between:
  - `START_BOOKED_PROOF`
  - `REVIEW_BOOKED_PROOF`
  - `OPEN_REVENUE_VIEW`
  - `REFRESH_BOOKED_PROOF`
  - `ADD_LEAD_BASE_SUPPORT`

This keeps the page more aligned to proof readiness without adding a new card or extra explanation.

## Why This Stays Bounded

The implementation does not:

- open conversation
- expose raw classification labels in the UI
- ask the user for prompts
- invent new categories
- let the model control routing
- let the model control proof truth or revenue math

The model only classifies inside allowed enums, and only medium/high confidence classifications are allowed to shape recommendation logic.

## Before / After

### Before

- the LLM phrasing layer could improve copy
- there was no explicit structured intent classification
- there was no explicit objection enum layer
- recommendation logic remained mostly deterministic before copy refinement

### After

- REVORY has a real enum-based intent classification flow
- REVORY has a real enum-based objection detection flow
- the output is short, structured, and validated
- confidence is explicit and simple
- recommendation logic now reacts to classification before phrasing polish is applied

## Deliberate Scope Choice

The classification is visible in logic, not as a new UI explanation layer.

That was intentional:

- the product should feel smarter, not more self-explanatory
- the UI should not start labeling itself with AI concepts
- the recommendation layer should stay lightweight and premium

## Technical Validation

- `npm run lint` passed
- `npm run build` passed
- `npm run typecheck` passed on rerun after the same transient `.next/types/validator.ts` noise seen in prior rounds

## Verdict

Approved.

Sprint 07 now has real bounded intent classification and objection detection in the active flow, with controlled enums, simple confidence bands, and direct connection to booking-path recommendation logic.

This is the right shape for REVORY Seller: more intelligent in decision quality, but still narrow, quiet, predictable, and commercially aligned.
