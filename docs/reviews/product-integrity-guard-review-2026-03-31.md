# Product Integrity Guard

Date: 2026-03-31
Stage: Sprint 06 playbook integrity hardening
Product: REVORY Seller

## Objective

Reinforce the closed-rail nature of the new intelligence layer so the product keeps feeling:

- narrow
- premium
- predictable
- self-service
- protected from hidden operator work

The focus of this pass was not to add more intelligence, but to make the existing decision-support layer visibly safer and more disciplined.

## Risk review

After Sprint 06, the new recommendation layer was already useful, but it still had one residual integrity risk:

- it could be read as smart guidance without making the fallback discipline explicit enough

That created a subtle perception gap:

- the customer could read the system as “smart enough to figure it out”
- the founder could still wonder whether edge cases were implicitly being pushed into hidden manual handling

## What was implemented

### 1. Guardrail and fallback are now explicit in the recommendation layer

Updated:

- `types/decision-support.ts`
- `components/ui/RevoryDecisionSupportCard.tsx`

The decision-support card now includes two additional integrity blocks:

- `Closed rail`
- `Fallback`

This makes the product explicit about two things:

- the recommendation stays inside a bounded playbook
- when confidence drops, the product pauses or falls back to the supported next step instead of implying hidden manual rescue

### 2. Dashboard recommendation now declares its limits

Updated:

- `services/decision-support/build-dashboard-decision-support.ts`

What changed:

- the dashboard now states that it recommends only from visible proof already inside the workspace
- it explicitly says that if proof is missing or stale, REVORY falls back to the same narrow move: Booking Inputs / refresh booked proof
- it explicitly avoids implying autonomous analysis, hidden operator service, or broader branching logic

Why this matters:

- the most commercial surface is now also the most disciplined
- revenue intelligence looks guided, not open-ended

### 3. Booking Inputs recommendation now shows safe stop conditions

Updated:

- `services/decision-support/build-import-decision-support.ts`

What changed:

- low-confidence or ambiguous files now explicitly state that REVORY stops at mapping review and keeps the live workspace unchanged
- the card now states that file read stays inside one closed path: review -> final review -> visibility update
- fallback makes clear that weak proof does not open a hidden cleanup queue or operator layer

Why this matters:

- edge cases now read as bounded product behavior
- the product no longer risks implying invisible manual rescue in the import lane

### 4. Activation recommendation now reinforces a closed playbook

Updated:

- `services/decision-support/build-activation-step-read.ts`

What changed:

- each activation step now declares both the closed rail and the fallback
- examples:
  - one-offer mode stays one-offer mode
  - lead entry stays on the supported shortlist
  - channel stays on one booking destination
  - voice stays on preset posture rather than open generation
  - activation falls back to Booking Inputs when proof is still missing

Why this matters:

- the system now reads as guided software, not as an AI layer improvising its way through setup

## Product integrity impact

This pass improves product integrity in four important ways:

### 1. Closed playbook is now visible

The user no longer has to infer that the system is bounded.
The surface now says it directly.

### 2. Fallback is now productized

Fallback is no longer implicit.
It is now explained as:

- pause
- keep current state
- return to the supported path

This is much safer than any suggestion of hidden manual intervention.

### 3. Edge cases stay honest

Ambiguity, low confidence, and missing proof now clearly resolve to:

- do less
- stay narrow
- wait for the next supported move

instead of implying that REVORY will “figure it out somehow.”

### 4. The founder stays protected

The UI now makes it clearer that:

- no hidden operations queue exists
- no invisible human fallback is required
- no free-form AI behavior opens behind the scenes

## Scope discipline

This hardening pass did **not** add:

- new modules
- new workflow branches
- chat UI
- inbox logic
- manual-service fallback
- deep settings or configuration

It only tightened the integrity language and fallback behavior of the already-shipped decision-support layer.

## Technical validation

- `npm run lint` -> passed
- `npm run typecheck` -> passed
- `npm run build` -> passed

## Verdict

**Approved**

Reason:

- The recommendation layer now feels smarter without feeling looser.
- Fallback is explicit, bounded, and productized.
- Edge cases no longer risk implying hidden manual ops.
- REVORY Seller stays on closed rails, with higher trust and better founder protection.
