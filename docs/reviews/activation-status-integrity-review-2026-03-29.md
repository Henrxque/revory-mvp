# Activation Status Integrity Review

Date: 2026-03-29
Stage: Sprint 04
Product: REVORY Seller

## Objective

Remove premature activation-success signals so the product only looks ready when activation is actually complete.

## What was reviewed

- `components/app/AppSidebar.tsx`
- `src/app/(app)/app/layout.tsx`
- Activation status touchpoints in the private shell

## What was adjusted

### 1. Sidebar activation state now reflects the real activation data

Before:

- The `Activation Path` nav item always rendered with status `Active`.
- The sidebar status dot treated that hardcoded value as success.

After:

- `AppSidebar` now receives the real `activationStatus` from the shell.
- The `Activation Path` nav item uses that real state instead of a hardcoded success label.
- `Active` remains success-only.
- `Activating` now maps to a warning state instead of a success state.

Evidence:

- `components/app/AppSidebar.tsx`
  - prop updated from `activationLabel` to `activationStatus`
  - nav group now consumes `activationStatus`
  - `Activating` is mapped to warning tone

### 2. Shell now derives one activation state and reuses it consistently

Before:

- The shell already knew whether activation was complete, but the sidebar nav was not using that same truth source.

After:

- `layout.tsx` now derives:
  - `activationStatus`
  - `activationBadgeLabel`
- The sidebar and shell badge both read from the same activation completion state.

Evidence:

- `src/app/(app)/app/layout.tsx`
  - `activationStatus = activationSetup.isCompleted ? "Active" : "Activating"`
  - `activationBadgeLabel = activationSetup.isCompleted ? "Activated" : "Activating"`

## Validation evidence

- `npm run lint` -> passed
- `npm run build` -> passed
- `npm run typecheck` -> passed

Note:

- A first `typecheck` run hit a transient `.next/types` route-validator generation issue.
- After the successful production build regenerated Next artifacts, `typecheck` passed cleanly.

## Product integrity result

- Activation no longer looks complete before completion in the sidebar nav.
- Visual readiness now matches real readiness.
- No new flow, no new navigation pattern, and no additional state complexity were introduced.
- The premium shell and narrow product framing were preserved.

## Verdict

Approved.

This leak of confidence was corrected with a narrow implementation. Activation status is now honest, consistent, and visually aligned with the real completion state.
