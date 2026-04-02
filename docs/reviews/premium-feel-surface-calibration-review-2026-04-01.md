# Premium Feel Surface Calibration Review

## Files altered
- `components/ui/RevoryStatusBadge.tsx`
- `src/app/(app)/app/layout.tsx`
- `src/app/(app)/app/imports/page.tsx`
- `src/app/(app)/app/setup/page.tsx`

## Before / After

### Shell header
- Before: the top bar carried four chips, including `MedSpa-first` and `Booking-first`, which repeated product thesis instead of helping current workspace reading.
- After: the header keeps only the states that matter in-session: activation status and workspace status. The chrome is tighter and quieter.

### Booking Inputs hero and snapshot
- Before: the quick-state row and the right snapshot boxes felt slightly oversized and utilitarian.
- After: chips were reduced, spacing tightened, and `Input snapshot` was renamed to `Current support` to feel more native to the screen instead of like an operational panel.

### Activation hero and summary cards
- Before: `Activation path` read louder than neighboring surfaces and the snapshot cards looked bulkier and brighter than the rest of the shell.
- After: the top kicker was softened to `Activation`, the summary row was compacted, and the pillar/snapshot/progress cards were tightened with smaller radii, padding, and label treatment.

### Status chips and micro-components
- Before: badges and small cards were slightly tall, which amplified the feeling of many little boxes on screen.
- After: the badge system was reduced one step in height and type size, giving the same information with less visual noise.

## What was softened
- Removed redundant thesis chips from the shell header.
- Reduced the visual weight of compact status containers.
- Tightened Booking Inputs support boxes and Activation summary cards.
- Reduced the bulk of Ready now / Missing now / Progress path tiles.

## What was renamed
- `Input snapshot` -> `Current support`
- `Activation path` hero kicker -> `Activation`

## Premium feel improvement
- The shell now spends less attention on self-description and more on the current workspace state.
- Booking Inputs feels more proof-first and less like a settings/import board.
- Activation keeps the same structure, but the cards now feel denser, quieter, and closer to the rest of the product language.
- The interface reads more like one mature narrow system and less like stacked utility blocks.

## Validation
- `npm run lint` ?
- `npm run typecheck` ?
- `npm run build` ?

## Verdict
**Approved.** The affected surfaces are now more silent, more premium, and better aligned with the REVORY Seller tone without reopening scope or changing product logic.
