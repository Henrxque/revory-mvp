# REVORY Seller Onboarding Migration Review

## Executive Read

Activation Setup and the Onboarding Wizard now read like `REVORY Seller`, not like a leftover recovery or ops flow.

The migration preserved the premium chassis that was already working: the side rail, progress logic, hero cards, step cards, and guided rhythm all stay intact. The work focused on semantics, labels, and onboarding posture rather than rebuild.

## What Was Preserved

- Setup shell and overall premium visual system
- Onboarding side rail with progress and step cards
- Hero card structure and guidance cards
- Step-by-step flow and navigation pattern
- Activation checkpoint page and configured/pending summaries

## What Was Reinterpreted

- `template` now reads as `Main Offer`
- `source` now reads as `Lead Source`
- `channel` now reads as `Booking Path`
- `reviews` now reads as `Deal Value`
- `mode` now reads as `Brand Voice`
- `activation` now reads as final Seller activation

## Legacy Center Removed From The UI

- Google Reviews is no longer a central setup concept
- `starting mode` language is gone from the user-facing flow
- old recovery and review semantics are no longer the primary story
- the wizard no longer reads like ops configuration

## Honest Reuse Note

To avoid rebuild, internal legacy fields were reused under the hood where possible. The user-facing product language now reflects Seller semantics, while the implementation keeps the existing activation flow functional and stable.

## Veredito

**Aprovado.**

The onboarding now feels premium, guided, narrow, and Seller-first while preserving the approved wireframe and avoiding unnecessary scope expansion.
