# Bounded LLM Integration Review

Date: 2026-04-01

## Scope

Sprint 07 should introduce real LLM usage only where it increases commercial clarity inside the existing REVORY Seller flow.

This review audited the current bounded guidance surfaces and selected the minimum real LLM use cases that:

- stay inside the current shell and card pattern
- keep the product narrow, premium, booking-first, and revenue-first
- do not create chat, inbox, agent behavior, or hidden operations
- preserve deterministic fallbacks everywhere

## Surfaces Audited

- [RevoryDecisionSupportCard.tsx](/C:/Users/hriqu/Documents/revory-mvp/components/ui/RevoryDecisionSupportCard.tsx)
- [build-dashboard-decision-support.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/build-dashboard-decision-support.ts)
- [build-import-decision-support.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/build-import-decision-support.ts)
- [build-activation-step-read.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/build-activation-step-read.ts)
- [dashboard/page.tsx](/C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/dashboard/page.tsx)
- [imports/page.tsx](/C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/imports/page.tsx)
- [setup/[step]/page.tsx](/C:/Users/hriqu/Documents/revory-mvp/src/app/(app)/app/setup/[step]/page.tsx)
- [CsvUploadCard.tsx](/C:/Users/hriqu/Documents/revory-mvp/components/imports/CsvUploadCard.tsx)
- [ImportsFlowGrid.tsx](/C:/Users/hriqu/Documents/revory-mvp/components/imports/ImportsFlowGrid.tsx)
- [get-initial-app-path.ts](/C:/Users/hriqu/Documents/revory-mvp/services/app/get-initial-app-path.ts)

## Current State

The product already has a strong bounded-intelligence shape, but it is still deterministic.

What exists today:

- one short recommendation card reused across activation, Booking Inputs, and Revenue View
- one primary blocker
- one next move
- one recommended path
- a short signal list
- explicit fallback behavior

Why this matters:

- Sprint 07 does not need a new AI surface
- the safest path is to let LLM fill a small structured payload behind the current card
- the UI should continue looking like product guidance, not like an AI feature

## Candidate Use Cases

| Use case | Surface | Decision | Why |
| --- | --- | --- | --- |
| Step-level activation recommendation phrasing | Activation Path | Approve now | High user value, tiny input, easy deterministic fallback, no open-ended behavior |
| Import blocker summarization | Booking Inputs | Approve now | The upload flow already has structured mapping states; LLM can compress them into clearer short guidance |
| Revenue/proof next-move phrasing | Revenue View | Approve now | High demo value, narrow scope, bounded to current proof and revenue state |
| Template recommendation from workspace setup | Activation Path | Future sprint | Plausible value, but still low ROI until real client context is richer |
| Mapping suggestion generation from header semantics | Booking Inputs | Future sprint | Useful later, but more risk of silent wrongness than the current bounded value justifies |
| Objection-response copy generation for outreach | Anywhere | Block | Opens copywriter/copilot behavior and drifts toward agent/inbox product logic |
| Free-form assistant or "ask REVORY" chat | Anywhere | Block | Breaks product thesis and creates support/inbox expectations |
| Autonomous next-step orchestration across surfaces | Shell-level | Block | Too much hidden behavior and too much explanation burden |

## Approved Now

### 1. Activation micro-recommendation

Goal:

- make each activation step feel a bit smarter without adding new choice complexity

Input:

- current step key
- selected template
- selected source type
- selected booking path
- selected value per booking
- selected recommended mode

Output:

- `summary`
- `main_blocker`
- `shortest_path`
- up to 2 short supporting signals

Recommended shape:

```ts
type ActivationLlmRead = {
  summary: string;
  mainBlocker: string;
  shortestPath: string;
  signals: string[];
};
```

Fallback:

- existing deterministic builder in [build-activation-step-read.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/build-activation-step-read.ts)

Strategic reason:

- activation already has a closed playbook and fixed step order
- LLM can improve phrasing quality without making decisions on behalf of the user
- this keeps activation premium and concise

Guardrails:

- max 1 short sentence per field
- no new options
- no strategy language beyond the current step
- no tone that implies hidden automation

### 2. Import blocker compression

Goal:

- turn structured mapping and proof-read states into cleaner, more commercial guidance inside Booking Inputs

Input:

- template key: `appointments` or `clients`
- detected headers
- missing required fields
- duplicate headers
- duplicate targets
- identity-path status
- confirmation readiness
- proof visibility status
- official-fit vs guided-fit status

Output:

- `summary`
- `main_blocker`
- `shortest_path`
- `what_needs_review`

Recommended shape:

```ts
type ImportLlmRead = {
  summary: string;
  mainBlocker: string;
  shortestPath: string;
  whatNeedsReview: string;
};
```

Fallback:

- existing deterministic builder in [build-import-decision-support.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/build-import-decision-support.ts)

Strategic reason:

- Booking Inputs is where the product most benefits from better wording
- the underlying state is already structured and bounded
- this reduces internal-feeling jargon without changing flow logic

Guardrails:

- never suggest manual operations outside the visible flow
- never invent missing data
- never present lead base as booked proof
- keep `appointments` language tied to proof and `clients` tied to support

### 3. Revenue View next-move phrasing

Goal:

- make the revenue/proof relationship feel more convincing and more native in demo

Input:

- booked appointment count
- visible proof status
- source support status
- configured value per booking
- estimated revenue value
- main offer status
- booking path status

Output:

- `summary`
- `main_blocker`
- `shortest_path`
- `revenue_read`

Recommended shape:

```ts
type DashboardLlmRead = {
  summary: string;
  mainBlocker: string;
  shortestPath: string;
  revenueRead: string;
};
```

Fallback:

- existing deterministic builder in [build-dashboard-decision-support.ts](/C:/Users/hriqu/Documents/revory-mvp/services/decision-support/build-dashboard-decision-support.ts)

Strategic reason:

- the dashboard is the most commercial screen in the app
- better short phrasing here improves demo strength without expanding product behavior
- the data is already bounded and revenue-first

Guardrails:

- never imply observed revenue if the system is using configured fallback
- never detach revenue language from booked proof visibility
- no extra analytics
- no forecasting language

## Leave For Future Sprint

### Template recommendation from richer workspace context

Why not now:

- value exists, but current activation is already narrow and deterministic
- the product does not yet hold enough rich clinic context to justify real LLM cost here

Condition to reopen:

- only after richer onboarding signals exist and the recommendation clearly improves conversion quality without adding choice burden

### Mapping suggestion generation from header semantics

Why not now:

- this is the first point where LLM wrongness can silently damage data integrity
- the current guided mapping flow already works as a predictable system

Condition to reopen:

- only after strong validation, confidence thresholds, and explicit confirmation UX are in place

## Blocked

### Objection-response generation

Reason:

- turns REVORY Seller toward copy assistant or sales copilot territory
- creates pressure for editable text, approval loops, and hidden manual ops

### Open chat or ask-anything assistant

Reason:

- breaks the narrow product thesis immediately
- introduces inbox/chatbot expectations the MVP should avoid

### Autonomous orchestration across the app

Reason:

- too much hidden logic
- too much explanation burden
- undermines the product's honesty and predictability

## Recommended Integration Pattern

Sprint 07 should not add a new UI module.

Use this pattern instead:

1. Keep [RevoryDecisionSupportCard.tsx](/C:/Users/hriqu/Documents/revory-mvp/components/ui/RevoryDecisionSupportCard.tsx) as the only visible surface.
2. Add one thin server-side LLM adapter that receives a tiny structured prompt.
3. Ask the model for one compact JSON object only.
4. Validate shape and field lengths.
5. Fall back immediately to the current deterministic builders if:
   - request fails
   - latency is too high
   - output is malformed
   - confidence threshold is not met

## Operational Boundaries

To stay aligned with the REVORY Seller thesis, Sprint 07 should enforce:

- no user-authored AI prompt field
- no conversation memory
- no cross-surface agent state
- no long generations
- no multi-paragraph output
- no decisions without visible product state supporting them
- no LLM dependency for routing, revenue math, or proof truth

## Suggested Priority

### Approve now

1. Activation micro-recommendation
2. Import blocker compression
3. Revenue View next-move phrasing

### Future sprint

1. Template recommendation from richer workspace context
2. Mapping suggestion generation from header semantics

### Block

1. Objection-response generation
2. Open chat assistant
3. Autonomous orchestration

## Verdict

Approved with tight boundaries.

Sprint 07 should introduce real LLM only as a hidden phrasing layer behind the current guidance contract. The right move is not to make REVORY Seller look more “AI-powered”. The right move is to make the existing guided product feel slightly sharper, slightly more contextual, and still completely bounded.

If Sprint 07 stays inside the three approved use cases above, the product can become more intelligent without becoming less premium, less predictable, or less narrow.
