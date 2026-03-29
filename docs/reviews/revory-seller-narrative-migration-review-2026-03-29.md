# REVORY Seller Narrative Migration Review

Date: 2026-03-29

## Executive Read

The narrative center of the product was moved from the old REVORY thesis into a **booking-first REVORY Seller reading** without rebuild and without cosmetic rebrand only.

The app and site now read as:

- premium booking acceleration
- booked appointments and revenue visibility
- guided setup
- narrow MedSpa-first workflow
- self-service and founder-friendly

The migration also removed the most visible cues that made the product feel like:

- recovery ops
- review ops
- pseudo-execution layer
- CRM-light
- inbox-lite

## Clear Verdict

**Verdict: approved.**

The product now reads materially closer to **REVORY Seller** than to legacy REVORY. The strongest improvement was not visual. It was narrative: the center moved from recovery and ops language to booking acceleration, source health, revenue visibility, and guided booking posture.

## What Was Applied

### App

- Global metadata now describes REVORY Seller as a premium booking acceleration system for MedSpas.
- The app shell now uses `Premium booking acceleration` and `Booking-first workspace` instead of revenue recovery framing.
- Sidebar navigation was narrowed to real Seller surfaces:
  - `Dashboard`
  - `Sources & Mapping`
  - `Activation Setup`
- Placeholder sections that implied future CRM-like or ops-like areas were removed from the sidebar.
- Setup and onboarding now use Seller language:
  - `MedSpa profile`
  - `Source path`
  - `Primary response lane`
  - `Optional growth link`
  - `Operating style`
  - `Review and Go Live`
- The detailed onboarding step page was rewritten around booking activation instead of confirmations, reminders, recovery, and reviews.
- Dashboard was re-centered around `Revenue view`, `Source health`, `Booking system essentials`, `Next leverage point`, and future booking signals.
- The old operational surface was removed from the dashboard render path so the app no longer opens with an ops-layer reading.
- Imports now read as `Sources & Mapping` and are framed as the path to booking and revenue visibility.

### Site

- Homepage metadata was rewritten from revenue recovery to booking acceleration.
- Landing hero now leads with booking acceleration and booked appointments.
- Trust strip now reinforces:
  - more booked appointments
  - speed wins
  - clone your best seller
  - revenue visibility
- Problem block now frames the issue as **paid lead leakage and booking friction**, not empty slots and no-shows.
- Solution block now sells:
  - guided first response
  - short qualification path
  - one booking playbook
  - revenue visibility
- How-it-works now centers on:
  - booking data
  - main offer
  - booking path
  - revenue view
- Features, ROI, pricing, FAQ, and final CTA were rewritten to sound like a real Seller product instead of a recovery app with a new headline.
- Footer copy now presents REVORY as premium booking acceleration software for MedSpas.

## Main Term Migrations Applied

| Old reading | New reading |
| --- | --- |
| Revenue recovery | Booking acceleration |
| Imports & Mapping | Sources & Mapping |
| Operations overview | Revenue view |
| Operational base | Booking view |
| Google Reviews destination | Optional growth link |
| Starting mode | Operating style |
| Review and Activation | Review and Go Live |
| Template MedSpa | MedSpa profile |
| Data source | Source path |
| Primary channel | Response lane |

## Scope Guard Check

The migration stayed inside MVP boundaries.

What it does **not** do:

- does not present REVORY Seller as a CRM
- does not present REVORY Seller as a universal inbox
- does not present REVORY Seller as an open chatbot
- does not exaggerate AI
- does not promise hidden manual execution

What was preserved:

- shell
- design system
- structure of setup and onboarding
- premium visual hierarchy
- landing wireframe and overall aesthetic direction

## Technical Note

Some legacy internal keys were intentionally kept to avoid rebuild risk in Sprint 1:

- `reviews` step key
- `googleReviewsUrl` storage field
- `MODE_A`, `MODE_B`, `MODE_C` internal values

Those remain as implementation details only. User-facing language was migrated to Seller framing.

## Validation

- `npm run typecheck` passed

