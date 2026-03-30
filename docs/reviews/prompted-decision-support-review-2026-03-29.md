# Prompted Decision Support Reviewer

Date: 2026-03-29
Stage: Sprint 06 prompted decision support
Product: REVORY Seller

## Intent of this step

Make the new intelligence layer feel more obviously useful in the product without turning it into:

- open conversation
- autonomous assistant
- inbox behavior
- general-purpose copilot

The chosen direction was to refine the existing support layer into a more explicit recommendation pattern:

- `Next best action`
- `Detected objection`
- `Recommended path`

This keeps the product legible in demo, predictable for the founder, and visibly intelligent for the customer.

## What was implemented

### 1. The recommendation card now reads like assisted decision-making

Updated:

- `components/ui/RevoryDecisionSupportCard.tsx`
- `types/decision-support.ts`

Before:

- the layer used the more generic headings `Recommendation` and `Primary objection`

After:

- the layer now explicitly shows:
  - `Next best action`
  - `Detected objection`
  - `Recommended path`

Why this matters:

- the user can understand the immediate move faster
- the surface feels closer to conversion intelligence and less like generic advisory text
- the structure stays closed and highly controlled

### 2. Dashboard reads now point to a clear commercial move

Updated:

- `services/decision-support/build-dashboard-decision-support.ts`

The dashboard support layer now describes a real decision sequence, for example:

- `Booking Inputs -> booked proof -> revenue view`
- `Refresh booked proof -> keep revenue and calendar aligned`
- `Revenue -> proof -> one clear next move`

Why this matters:

- the dashboard is the most demo-sensitive surface in the product
- the recommendation now feels more like guided commercial intelligence than generic commentary
- it stays fully tied to real booked proof and revenue state

### 3. Booking Inputs reads now feel like controlled conversion guidance

Updated:

- `services/decision-support/build-import-decision-support.ts`

The layer now makes the file-fit read more explicit as action guidance, for example:

- `Official mapping -> final review -> visibility update`
- `Guided mapping -> final review -> visibility update`
- `Appointments upload -> booked proof -> revenue view`

Why this matters:

- the user sees a clear path instead of a vague recommendation
- the layer helps the user move toward booked proof faster
- the interface still avoids free-form AI interaction

### 4. Activation reads now reinforce the closed playbook

Updated:

- `services/decision-support/build-activation-step-read.ts`

Each activation step now ends with a visibly narrow path recommendation such as:

- `One main offer -> lead entry -> one booking path`
- `Lead enters -> email handoff -> booked appointment`
- `Configured value per booking -> visible bookings -> revenue read`
- `Activation complete -> booked proof -> revenue view`

Why this matters:

- it reinforces that REVORY Seller runs on a closed playbook
- the user sees guided progression rather than static setup text
- the founder gets a more predictable and demo-friendly surface

## Why this adds commercial value without inflating scope

This implementation adds value because it improves:

- speed of interpretation
- clarity of the next move
- perception of intelligence
- confidence in the guided path

It does **not** add:

- free text conversation
- autonomous execution
- new route or module
- complex AI state
- operational sprawl

The layer stays:

- narrow
- premium
- booking-first
- revenue-aware
- predictable

## Technical validation

- `npm run lint` -> passed
- `npm run typecheck` -> passed
- `npm run build` -> passed

## Verdict

**Approved**

Reason:

- The recommendation layer now reads like real prompted decision support instead of generic support copy.
- It adds visible conversion intelligence in the active product path.
- It preserves the MVP shape and avoids drift into chatbot, inbox, or general copilot behavior.
