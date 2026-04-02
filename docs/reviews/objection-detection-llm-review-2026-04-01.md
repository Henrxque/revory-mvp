# Objection Detection LLM Review

Date: 2026-04-01
Stage: Sprint 07 template selection and reply-block microadaptation
Product: REVORY Seller

## Intent

This stage added bounded LLM assistance to template selection and short reply-block adaptation without opening a copywriter surface, prompt editor, or free-form seller behavior.

The implementation stayed inside four rules:

- templates remain fixed playbooks
- LLM picks from controlled options only
- only one short reply block can vary
- default template behavior always remains available

## Files Changed

- [operational-template.ts](/C:/Users/hriqu/Documents/revory-mvp/types/operational-template.ts)
- [get-template-selection-assist.ts](/C:/Users/hriqu/Documents/revory-mvp/services/operations/get-template-selection-assist.ts)
- [operational-templates.ts](/C:/Users/hriqu/Documents/revory-mvp/services/operations/operational-templates.ts)
- [build-operational-surface.ts](/C:/Users/hriqu/Documents/revory-mvp/services/operations/build-operational-surface.ts)
- [get-operational-surface.ts](/C:/Users/hriqu/Documents/revory-mvp/services/operations/get-operational-surface.ts)
- [OperationalTemplatePreviewGrid.tsx](/C:/Users/hriqu/Documents/revory-mvp/components/dashboard/OperationalTemplatePreviewGrid.tsx)

## What Was Implemented

### 1. Real bounded template selection

New service:

- [get-template-selection-assist.ts](/C:/Users/hriqu/Documents/revory-mvp/services/operations/get-template-selection-assist.ts)

What it does:

- receives the existing controlled template candidates
- asks the LLM to choose exactly one recommended template
- restricts the choice to the fixed template keys already in the product:
  - `confirmation`
  - `reminder`
  - `recovery`
  - `review_request`

Returned structured output:

- `recommendedTemplateKey`
- `objectionCode`
- `confidenceBand`
- `replyBlock`

### 2. Controlled objection detection for template choice

Implemented objection enums:

- `NO_ACTIVE_OBJECTION`
- `CONTACT_PATH_BLOCKED`
- `SCHEDULE_CHANGE_RISK`
- `ATTENDANCE_DROP_RISK`
- `RETURN_TO_BOOKING_RESISTANCE`
- `FEEDBACK_FRICTION`

Why this matters:

- the model cannot answer with vague labels
- the output stays tied to concrete booking-path friction
- recommendation remains deterministic when confidence is weak

### 3. Microadaptation only on the reply block

The LLM is not allowed to rewrite the whole template.

Instead:

- the base template body stays fixed
- only the last active reply line can change
- the adapted line is capped and validated
- the rest of the template remains default

This keeps the system premium and predictable:

- no long copy generation
- no full-message improvisation
- no hidden conversation logic

### 4. Default fallback preserved

Fallback behavior:

- if LLM is unavailable or invalid, the product uses the deterministic default template ranking
- the recommended template falls back to the best readiness-based default
- the reply block falls back to the template's existing base line

This preserves playbook integrity even when the model does nothing useful.

## Where It Lands

The bounded assist is wired into the operational template preview builder:

- [operational-templates.ts](/C:/Users/hriqu/Documents/revory-mvp/services/operations/operational-templates.ts)

What now happens:

1. The system builds the same closed template previews as before.
2. The LLM chooses one recommended template among those fixed previews.
3. The LLM can adapt only the reply block for that chosen template.
4. The preview output now carries:
   - recommended state
   - confidence band
   - objection code
   - reply block mode

The preview UI was updated to show this quietly:

- a subtle `Recommended now` badge
- confidence only on the recommended item
- a short `Reply block` section showing whether the line is `Default base` or `Micro-adapted`

## Why This Is Still Aligned

Alignment verdict:

The implementation stays aligned with REVORY Seller because it does not create a writing tool, does not let the model control the whole message, and does not broaden the product into a copilot or inbox surface. The LLM is helping choose within the existing playbook and lightly adapting one bounded line.

## Scope Adjustments

- kept template selection inside existing operational template keys
- did not add a prompt editor
- did not add free-form message editing
- did not add full-body generation
- did not move routing, proof logic, or delivery logic onto the model

## Copy Adjustments

The UI language remains narrow:

- `Recommended now`
- `Reply block`
- `Default base`
- `Micro-adapted`

No AI-branded language was added to the interface.

## Technical Validation

- `npm run lint` passed
- `npm run typecheck` passed
- `npm run build` passed

## Verdict

Approved.

REVORY now has real bounded LLM help for template selection and short reply-block adaptation, but the product still behaves like a closed booking system rather than a free-form sales assistant. This is the right level of intelligence for the current MVP boundary.
