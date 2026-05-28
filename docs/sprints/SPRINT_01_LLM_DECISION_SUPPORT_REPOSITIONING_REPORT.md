# SPRINT 01 - LLM and Decision Support Repositioning Report

## Summary

This pass aligned internal LLM prompts and decision-support language with the current REVORY positioning: a Revenue Leak Detector for premium MedSpas.

The work stayed prompt/copy-only. It did not implement an AI Insight Layer, AI CSV Intake/Triage, a new provider runtime, a new financial source of truth, new models, or new deterministic leak calculations.

## Files changed

- `services/llm/request-bounded-intent-classification.ts`
- `services/lead-booking/generate-lead-suggested-message.ts`
- `services/decision-support/get-activation-step-read.ts`
- `services/decision-support/get-dashboard-decision-support.ts`
- `services/decision-support/build-dashboard-decision-support.ts`
- `services/decision-support/build-activation-step-read.ts`

Related files already aligned in the previous imports/action-guidance pass:

- `services/decision-support/apply-intent-classification.ts`
- `services/decision-support/build-import-decision-support.ts`

## Old persona removed

- Replaced `REVORY Seller` prompt framing with `REVORY Revenue Leak Detector`.
- Replaced `booking-first` prompt framing with evidence-first, leak-first, and revenue-risk-first language.
- Replaced dashboard `Seller guidance` language with `Leak guidance`.
- Replaced `Seller stays narrow` with `REVORY stays narrow`.
- Reframed booked-proof/dashboard guidance toward appointment evidence, leak evidence, data freshness, operational leak risk, and next safe fix.
- Reframed suggested-message prompt language toward bounded next-action guidance for a specific booking-path risk.

## New guardrails added

LLM and decision-support prompts now explicitly guard against:

- inventing revenue numbers;
- claiming confirmed loss;
- implying REVORY generated revenue;
- implying REVORY recovered revenue;
- acting like CRM, inbox, BI, scheduling system, sales agent, clinical advisor, or autonomous workflow;
- using estimated revenue at risk unless supplied by deterministic services;
- expanding into unsupported leak signals, workflow branches, or analytics breadth.

Prompt outputs are instructed to explain:

- evidence;
- confidence;
- one next safe action or next safe fix.

## Tests run

- `npm run lint` passed.
- `npm run typecheck` passed.

## Remaining legacy language intentionally kept

- Intent enum names such as `START_BOOKED_PROOF`, `REFRESH_BOOKED_PROOF`, `PROOF_NOT_VISIBLE`, `ADD_LEAD_BASE_SUPPORT` remain internal for now. Renaming them would require broader type and data-flow churn and is not needed for visible product truth in this sprint.
- Data field names such as `bookedAppointments`, `bookedProofSource`, and `hasBookedProofSource` remain internal because they reflect the current deterministic substrate.
- `sellerVoiceLabel` remains internal because it is currently a technical input name for message tone. Visible copy has shifted toward clinic voice / bounded action guidance.
- Lead-booking service names remain internal because the current substrate still supports blocked booking opportunity risk. They should be renamed only after the leak-domain model is stable.

## Scope intentionally not opened

- No AI Insight Layer was added.
- No AI CSV Intake or triage flow was added.
- No LLM-generated financial metric was added.
- No revenue leak engine was added.
- No CRM, inbox, BI, scheduling, RCM, sales-agent, or clinical-advice behavior was added.

## Veredito

Aligned. The AI-facing layer now points the model toward REVORY as a narrow revenue leak detector and explicitly blocks the most dangerous forms of overclaim: invented revenue, confirmed-loss language, recovered/generated revenue claims, and category drift into CRM/inbox/BI/sales automation.
