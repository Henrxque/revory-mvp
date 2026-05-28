# SPRINT 01 - Imports and Booking Assistance Repositioning Report

## Summary

This pass updated imports and booking-assistance surfaces so they support REVORY as a revenue leak detector, not REVORY Seller or a booking acceleration product.

The implementation stayed copy-first and narrow. It did not add AI CSV intake, a RevenueLeak model, new persistence, parser changes, CRM behavior, inbox behavior, BI behavior, or automated recovery claims.

## Files changed

- `src/app/(app)/app/imports/page.tsx`
- `src/app/(app)/app/imports/manual-lead-actions.ts`
- `src/app/(app)/app/imports/lead-booking-actions.ts`
- `components/imports/ImportsFlowGrid.tsx`
- `components/imports/CsvUploadCard.tsx`
- `components/lead-booking/ManualLeadQuickAdd.tsx`
- `components/lead-booking/LeadBookingOpportunityList.tsx`
- `components/ui/RevoryDecisionSupportCard.tsx`
- `services/decision-support/apply-intent-classification.ts`
- `services/decision-support/build-import-decision-support.ts`
- `services/lead-booking/create-manual-lead-booking-opportunity.ts`
- `services/lead-booking/generate-lead-suggested-message.ts`
- `services/lead-booking/get-lead-intake-routing-read.ts`
- `services/lead-booking/opportunity-readiness.ts`

## Old language removed

- Visible `Seller` references in the imports and booking-assistance surfaces.
- `Booking Inputs` as the primary visible category.
- `Booking assistance` as the main surface label.
- `Booked proof` as the top-level import promise.
- `Lead base` / `lead-base support` as primary buyer-facing language.
- `Suggested message` as the default visible label for the guidance layer.
- `Manual Quick Add` as a lead-management-like action.
- Copy implying paid-leads-to-booked-revenue as the main category.

## New leak-first language added

- `Source Inputs`
- `Upload clinic data for revenue leak detection`
- `Appointment evidence`
- `Client context`
- `Revenue risk read`
- `Leak Action Guidance`
- `Booking-path risks`
- `Bounded action guidance`
- `Manual evidence add`
- `Operational leak risks`

## Support copy added or adjusted

- Appointment status improves leak detection.
- Estimated revenue improves confidence.
- Missing estimated revenue can fall back to average deal value later.
- Blocked booking opportunities are framed as operational leak risks.
- Booking-path actions are not counted as confirmed lost revenue.
- Handoff/open-path language avoids implying thread, inbox, or follow-up automation.

## Terms kept temporarily

- `LeadBookingOpportunity`, `leadBookingOpportunity`, `leadState`, `sellerVoiceLabel`, and related service/function names stayed as internal implementation terms.
- Existing route anchors such as `#booking-inputs-flow` and `#booking-assistance-flow` stayed unchanged to avoid route/navigation churn during a copy pass.
- `booking path` stayed because it is still a real operational input and risk substrate in the current product.
- `lead` stayed only where the user-entered real-world object can still be a lead, not as CRM positioning.

## Feature promises avoided

- No AI CSV intake or triage was presented as active.
- No new RevenueLeak engine or model was implied.
- No confirmed lost revenue claim was added.
- No automatic recovery, follow-up engine, inbox, CRM, scheduling, BI, or sales-agent claim was added.
- No parser, import persistence, database schema, or handoff behavior was changed.

## Risks

- Some internal names still contain `lead` and `sellerVoiceLabel`; this is acceptable for now but should be renamed only if a future technical cleanup has enough value to justify churn.
- The current data still comes from the old booked-proof substrate, so the UI is intentionally transitional: it says appointment evidence and revenue risk read, not full leak engine.
- Decision-support intent enum names still include booked-proof terminology internally; visible output was reframed, but enum cleanup should wait until the leak engine work is real.

## Suggested execution order

1. Keep this copy pass as the final Sprint 01 import/booking-assistance alignment.
2. In Sprint 02/03, introduce the actual leak-domain model only when calculations and data semantics are ready.
3. In Sprint 06/07, replace transitional Daily Revenue/Executive Revenue reads with true Daily Leak Brief and Executive Leak Summary only after leak signals exist.
4. Defer internal renames until there is a stable leak model, to avoid risky churn before the data layer is finalized.
