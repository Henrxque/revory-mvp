# Shell Confidence Consistency Review

Date: 2026-03-29
Stage: Sprint 04
Product: REVORY Seller

## Objective

Tighten sidebar and shell-level status language so the workspace reads as mature, honest, and premium without changing shell structure.

## Alignment verdict

The shell is now more coherent with the product story already established in activation, dashboard, and imports. The updates stayed narrow, removed a few technical or inconsistent labels, and improved trust without expanding scope or adding UI weight.

## What was adjusted

### 1. Activation language is now consistent across shell surfaces

Before:

- The shell mixed `Active`, `Activated`, and `Activating`.
- That made the stage feel slightly inconsistent across sidebar and header.

After:

- Activation now resolves to `Activated` or `Activating` in the shell.
- The sidebar activation chip and shell badge now read from the same wording.

Evidence:

- `src/app/(app)/app/layout.tsx:89-93`
- `components/app/AppSidebar.tsx:152-158`
- `components/app/AppSidebar.tsx:258-264`

### 2. Booking Inputs shell status now uses proof-first language

Before:

- The shell-derived sidebar state still used older internal framing like `Visible`, `Visibility ready`, and `Entry pending`.

After:

- The shell now resolves Booking Inputs status as:
  - `Proof active`
  - `Proof ready`
  - `Proof next`
- This reads closer to the dashboard and imports framing around booked proof and visibility.

Evidence:

- `src/app/(app)/app/layout.tsx:40-52`
- `components/app/AppSidebar.tsx:40-57`
- `components/app/AppSidebar.tsx:144-158`

### 3. Workspace status chips no longer expose raw enum-style language

Before:

- The shell could show technical labels like `ACTIVE` directly.
- That felt more internal than premium.

After:

- Workspace status is now formatted into human labels:
  - `Live`
  - `Draft`
  - `Paused`

Evidence:

- `src/app/(app)/app/layout.tsx:23-38`
- `src/app/(app)/app/layout.tsx:130-135`
- `components/app/AppSidebar.tsx:122-137`
- `components/app/AppSidebar.tsx:262-264`

### 4. Shell subtitle now reflects stage more directly

Before:

- The completed subtitle read `Booking-first workspace`, which matched positioning but not the current workspace stage explicitly.

After:

- The completed subtitle now reads `Seller workspace live`, which aligns better with the activation and workspace-state signals around it.

Evidence:

- `src/app/(app)/app/layout.tsx:91-93`

## Scope adjustments

- No redesign
- No architecture change in the app shell
- No new elements
- No new states beyond tighter wording on the existing ones

## Validation evidence

- `npm run lint` -> passed
- `npm run build` -> passed
- `npm run typecheck` -> passed

Note:

- The first `typecheck` run hit the same transient `.next/types` route-validator issue seen earlier.
- After the successful production build regenerated Next artifacts, `typecheck` passed cleanly.

## Verdict

Approved.

The shell now feels more consistent, less technical, and more honest about workspace stage. The changes stayed surgical and aligned with REVORY Seller's premium, narrow, booking-first positioning.
