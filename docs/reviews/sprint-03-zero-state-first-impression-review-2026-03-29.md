# Sprint 03 Zero-State And First Impression Review

Date: 2026-03-29

## Alignment Verdict

The active demo surfaces are now materially better aligned with the REVORY Seller thesis. The product opens more clearly as a premium booking acceleration system, not as a source-first admin area. The remaining import mechanics stay visible only where they are functionally necessary, while the first impression now points more consistently to booked outcomes, activation integrity, and revenue path.

## Surfaces Reviewed

1. App sidebar and authenticated shell status
2. Dashboard hero and primary metric panel
3. Dashboard metric cards
4. Dashboard booking inputs panel empty state
5. Dashboard upcoming bookings panel empty state
6. Dashboard next leverage point CTA framing
7. Booking Inputs page hero
8. Booking Inputs upload cards and their idle states
9. Setup page activation checkpoint empty and pending states
10. Operational surface zero-state copy prepared for future demo usage

## Findings

- `Lead Sources` was still one of the strongest labels in the primary navigation and CTA system. This pulled attention toward source/import mechanics instead of Seller outcome.
- Several dashboard empty states still used `Open Lead Sources`, `visibility input`, `Awaiting bookings`, or `Motion waiting on source`, which made the first read feel data-admin-first.
- The imports page hero still opened with `Booking feed` and `Feed the booking path with a clean source`, which over-centered source/feed language.
- Upload card idle states still read like import tooling: `Awaiting file`, `Awaiting first import`, `Last import`.
- Setup still used some lead-source-first wording in activation checkpoint moments, even when the page should read as activation integrity and booking path control.
- A future-facing operational surface still carried `Awaiting import` and `Open imports`, which would reintroduce the wrong framing if surfaced again.

## Scope Adjustments

- No module was added.
- No flow was expanded.
- No analytics or new system behavior was introduced.
- The cleanup stayed inside existing navigation, page copy, card labels, badges, and CTA text.

## What Changed

- Navigation renamed the import surface from `Lead Sources` to `Booking Inputs`.
- Shared shell status changed from `Live / Awaiting import` to `Visible / Ready for upload`.
- Dashboard zero-states now point to booked appointments, booked outcomes, booking motion, and revenue path instead of source-first wording.
- Dashboard CTAs now use `Open Booking Inputs`, `Refresh booking inputs`, and `Review booking inputs`.
- Dashboard pending metrics were reframed to `Revenue path pending`, `Lead base pending`, `Booked outcome pending`, and `Waiting for motion`.
- Booking inputs hero was rewritten from source/feed framing to booked visibility and revenue linkage framing.
- Upload cards now open from `Latest upload`, `Ready for first upload`, and `Ready for upload`, reducing admin-heavy first impression.
- Setup checkpoint copy now frames the missing piece as lead entry and booking integrity instead of source administration.
- Operational surface fallback copy was aligned to `Booking Inputs` and `appointments upload` wording for future demo safety.

## Copy Direction Applied

- Prefer `booking inputs` over `lead sources` on demo-first surfaces.
- Prefer `booked appointments`, `booked outcomes`, and `revenue path` over `feed`, `source`, and `import` when describing value.
- Keep upload/import language only where the user is performing the actual upload action.
- Keep empty states short, directional, and premium.

## Residual Notes

- The route and backend still use import-oriented names internally, which is acceptable for MVP scope because the first impression problem was largely present in user-facing copy, not architecture.
- `Lead source` still exists as a setup concept where it is structurally part of activation integrity. It is now less dominant in empty-state framing, but not removed from the product model.

## Final Verdict

Approved for Sprint 03 zero-state cleanup. The product now lands more confidently as REVORY Seller: Seller-first, booking-first, revenue-aware, and materially less source-centered in demo-critical moments.
