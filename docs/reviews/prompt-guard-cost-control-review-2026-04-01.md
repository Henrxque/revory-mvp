# Prompt Guard and Cost Control Review

Date: 2026-04-01
Stage: Sprint 07 bounded LLM runtime foundation
Product: REVORY Seller

## Intent

This stage implemented the minimum real LLM runtime for REVORY Seller without turning the product into chat, inbox, agent behavior, or a fragile dependency.

The target was:

- one central adapter
- one rigid output contract
- one short retry policy
- one deterministic fallback path
- minimal logging
- no scattered calls across the app

## Files Changed

- [request-bounded-decision-support-patch.ts](/C:/Users/hriqu/Documents/revory-mvp/services/llm/request-bounded-decision-support-patch.ts)
- [decision-support-llm.ts](/C:/Users/hriqu/Documents/revory-mvp/types/decision-support-llm.ts)
- [apply-decision-support-patch.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/apply-decision-support-patch.ts)
- [get-activation-step-read.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/get-activation-step-read.ts)
- [get-dashboard-decision-support.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/get-dashboard-decision-support.ts)
- [page.tsx](/C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/setup/[step]/page.tsx)
- [page.tsx](/C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/dashboard/page.tsx)
- [build-activation-step-read.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/build-activation-step-read.ts)
- [.env.example](/C:/Users/hriqu/Documents/revory-mvp/.env.example)

## What Was Implemented

### 1. One central LLM adapter

New runtime entry point:

- [request-bounded-decision-support-patch.ts](/C:/Users/hriqu/Documents/revory-mvp/services/llm/request-bounded-decision-support-patch.ts)

What it does:

- sends one short request to the OpenAI Responses API
- requests one strict JSON object only
- keeps the response bounded to five short fields:
  - `title`
  - `summary`
  - `detectedObjection`
  - `nextBestAction`
  - `recommendedPath`

Why this matters:

- the UI never depends on free-form model text
- the product keeps the same guidance shape it already had
- the LLM becomes a phrasing layer, not a new feature surface

### 2. Rigid contracts and strong validation

New shared type:

- [decision-support-llm.ts](/C:/Users/hriqu/Documents/revory-mvp/types/decision-support-llm.ts)

New patch applier:

- [apply-decision-support-patch.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/apply-decision-support-patch.ts)

Validation rules now enforced:

- exact object shape
- required fields only
- max lengths per field
- whitespace normalization
- malformed JSON fallback
- schema mismatch fallback

Why this matters:

- no long or drifting outputs can leak into the product
- the model is not allowed to change the structure of the UI contract

### 3. Timeout, retry, and fallback discipline

The adapter now enforces:

- timeout: `2500ms` by default
- retry: one short retry only
- `store: false`
- `max_output_tokens: 220`

Fallback behavior:

- if the key is missing, the request fails, the model times out, the model returns invalid JSON, or the schema does not validate, REVORY falls back immediately to the deterministic builders already used by the product

Why this matters:

- the flow never depends on LLM success to stay alive
- latency and spend stay bounded
- the user never gets blocked by the model

### 4. Minimal debug logging

The adapter now logs only what is useful:

- one warning per fallback reason and use case
- one development-only success info log with latency and attempt count

Why this matters:

- enough signal to debug prompt/runtime issues
- no observability sprawl for the current MVP stage

## Where The Real Runtime Is Live

### Activation Path

New server wrapper:

- [get-activation-step-read.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/get-activation-step-read.ts)

Wired into:

- [page.tsx](/C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/setup/[step]/page.tsx)

Result:

- activation keeps the same guidance card
- the LLM can sharpen phrasing
- deterministic fallback still owns the flow

### Revenue View

New server wrapper:

- [get-dashboard-decision-support.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/get-dashboard-decision-support.ts)

Wired into:

- [page.tsx](/C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/dashboard/page.tsx)

Result:

- the dashboard hero support line and guidance block can now use bounded LLM phrasing
- the revenue read remains anchored to the same booked-proof and revenue logic as before

## What Was Deliberately Not Opened Yet

Booking Inputs was not given a live client-side LLM call in this stage.

Reason:

- that surface changes more frequently during file selection, header review, and mapping confirmation
- wiring live client requests there right now would create more prompt volume, more jitter, and more cost pressure than the current stage justifies
- the shared adapter and shared patch contract were implemented first so imports can plug into the same bounded architecture later without inventing a second path

This was an explicit product and cost-control choice, not a gap accidentally left behind.

## Before / After

### Before

- decision support was deterministic only
- there was no central LLM runtime
- there was no strict schema enforcement for model output
- there was no unified timeout/retry/fallback policy
- there was no bounded debug signal for model behavior

### After

- REVORY has one central bounded LLM adapter
- the model can only return one short structured patch
- activation and dashboard use that runtime behind the existing product surfaces
- failure always falls back to the current deterministic guidance
- cost and latency stay constrained by default

## Small Honesty Fix Carried With The Stage

Adjusted in:

- [build-activation-step-read.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/build-activation-step-read.ts)

Fix:

- the `deal_value` fallback tone now correctly treats `Value pending` as future state instead of accidentally using the accented state

## Cost Guardrails

The implementation now keeps cost bounded through:

- one model call path
- one short schema
- no long outputs
- no conversation memory
- no user-authored prompt box
- no multi-step agent loop
- no LLM dependency for routing, proof truth, or revenue math

## Technical Validation

- `npm run lint` passed
- `npm run typecheck` passed
- `npm run build` passed

## Verdict

Approved.

Sprint 07 now has a real bounded LLM runtime, but it is still disciplined enough for REVORY Seller. The model is centralized, schema-locked, timeout-bound, retry-limited, and fully optional at runtime because deterministic fallback continues to own product continuity.

This is the right stage shape for REVORY: real LLM value, no AI theater, no agent drift, and no hidden dependency that can break the flow.
