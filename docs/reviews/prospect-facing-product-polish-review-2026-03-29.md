# Prospect-Facing Product Polish Review

Date: 2026-03-29
Stage: Sprint 05
Product: REVORY Seller

## Objective

Apply a short polish pass to the most exposed prospect-facing surfaces so the routed product feels more finished, more intentional, and less rough without redesigning the app or expanding scope.

## Surfaces reviewed

- `src/app/(app)/app/layout.tsx`
- `components/app/AppSidebar.tsx`
- `src/app/(app)/app/dashboard/page.tsx`
- `src/app/(app)/app/imports/page.tsx`
- `src/app/sign-in/[[...sign-in]]/page.tsx`
- `src/app/sign-up/[[...sign-up]]/page.tsx`

## What was found

### 1. A few shell-level strings still read slightly generic

The shell was already strong, but phrases like `Seller workspace live` and `Premium booking acceleration` still had a bit of placeholder energy compared with the rest of the product.

### 2. Booking Inputs had a small spacing-perception issue

The support-card grid used `md:grid-cols-3` for four cards, which created a visibly uneven wrap on mid-size screens and made the page feel a touch less finished.

### 3. A few auth-surface labels still felt generic rather than product-shaped

`Back to home` and a couple of highlight/badge labels were serviceable, but not as polished or REVORY-specific as they could be.

### 4. One dashboard helper line still sounded slightly staging-oriented

The phrase `during demo` in a visible UI support block weakened the product illusion a little by sounding presenter-aware rather than product-native.

## What was refined

### Shell and sidebar

- Shell subtitle now differentiates:
  - live with booked proof
  - live with booked proof still next
- Activation subtitle now uses a cleaner colon format instead of a rougher dash construction
- Sidebar brand line now reads `Premium booking acceleration system`

### Dashboard

- `Commercial context` support copy now reads more product-native and less presentation-aware

### Booking Inputs

- The support-card grid now uses a cleaner `md:grid-cols-2 xl:grid-cols-4` layout so card wrapping feels more deliberate on common demo widths

### Auth surfaces

- `Back to home` became `Back to REVORY`
- Sign-in step language now uses `booked proof` instead of the rougher `Booking Inputs` reference in the high-signal explainer
- Sign-up highlight `Booked visibility path` became `Booked proof path`
- Sign-up badge `New workspace` became `Seller workspace`

## Validation

- `npm run lint` -> passed
- `npm run build` -> passed
- `npm run typecheck` -> passed

Note:

- `typecheck` failed once before the build with the same transient `.next/types` validator noise seen in prior passes
- after build regeneration, `npm run typecheck` passed cleanly

## Verdict

**Approved**

The product now feels slightly more finished in the places a prospect notices first. The improvements are small, but they reduce roughness in shell language, auth framing, card wrapping, and visible helper copy without opening scope or disturbing the premium visual direction.
