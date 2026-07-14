# Sprint 13 — Commercial Packaging and Pricing Clarity

## Status

**Product decision documented; UI, Stripe and public-sale implementation remain pending.**

This sprint clarifies packaging after the local implementation of Sprints 0–12. It does not make an offer sellable, enable a checkout, create Stripe products, or override any release gate.

## Problem

The existing commercial screen correctly distinguishes one-time audits from recurring access, but presents them in one visual group. That makes the commercial model read like three unrelated prices rather than a clear subscription business with paid baseline audits.

The intended model is:

```text
one-time baseline audit
  -> recurring subscription when repeat reads are useful
  -> advanced one-time audit when Revenue Realization evidence is available
  -> Growth or Pro recurring subscription when the advanced recurring capability is released
```

## Commercial architecture

### Recurring subscriptions — primary visual group

| Plan | Target monthly price | Proposed annual price | Customer outcome | Entry condition | Commercial status |
|---|---:|---:|---|---|---|
| Starter | US$399/month | US$3,990/year | Refresh Quote Recovery evidence and see movement between reads | Quote Recovery Audit completed | Locally implemented; public sale gated |
| Growth | US$799/month | US$7,990/year | 12-month history, guarded segmentation and weekly management decision | Advanced evidence and Growth release gates | Locally implemented; public sale gated |
| Pro | US$1,499/month | US$14,990/year | Revenue Realization, change-order, underbilling and margin intelligence with higher controls | Full Revenue Leak Audit and Pro release gates | Locally implemented; public sale gated |

The proposed annual prices use **two months free** (10× monthly price). They are a packaging hypothesis, not a published price or an authorization to create Stripe prices.

### One-time audits — secondary visual group

| Audit | Target price | Purpose | What it leads to |
|---|---:|---|---|
| Quote Recovery Audit | US$799 once | First evidence-backed read of estimates and follow-ups | Starter monthly or annual continuation |
| Full Revenue Leak Audit | US$1,499 once | Advanced estimate-to-job/invoice/change-order read when the data supports it | Growth or Pro monthly or annual continuation |

Audits are not subscriptions and must never appear as monthly plans. They establish the initial trusted baseline; the subscription pays for refreshed evidence, movement and recurring decisions.

## Required pricing-screen hierarchy

1. Headline: **Choose how often you want REVORY working for you.**
2. First section: **Ongoing plans** — Starter, Growth and Pro.
3. Add an explicit line above those cards: **Every ongoing plan starts with the matching one-time Audit, so your first recurring read has a verified baseline.**
4. Second section: **Start with an Audit** — Quote Recovery Audit and Full Revenue Leak Audit.
5. Every card must show one of: `per month`, `per year`, or `paid once`. Never rely on a price alone to communicate billing cadence.
6. The monthly/annual switch must affect subscription cards only. Audit prices remain fixed and visibly one-time.
7. A commercially gated plan may be visible for education, but must use an honest disabled state such as **Closed until the release gate passes**. It must not show a live purchase CTA.

## Recommended customer paths

### Quote Recovery path

```text
Quote Recovery Audit — US$799 once
  -> Starter — US$399/month or US$3,990/year
```

### Advanced Revenue Realization path

```text
Full Revenue Leak Audit — US$1,499 once
  -> Growth — US$799/month or US$7,990/year
  -> Pro — US$1,499/month or US$14,990/year when Pro controls and gates apply
```

Do not imply that a customer receives Growth or Pro merely by purchasing an audit. The advanced audit establishes a baseline; recurring access still depends on the product and commercial gates.

## Current implementation verification — 2026-07-13

### What exists

- `RevoryOfferKey` includes `QUOTE_RECOVERY_AUDIT`, `STARTER`, `GROWTH` and `PRO`.
- Capability checks recognize Growth for history/intelligence and Pro for Revenue Realization and higher volume controls.
- Growth and Pro access policies, entitlement-aware import limits and feature gates exist locally.
- Sprint 10–12 implementation evidence is recorded in the canonical source of truth.

### What does not exist yet

- Growth and Pro are not commercially available in `services/billing/revory-offers.ts`.
- Both have `commerciallyAvailable: false` and no dedicated current Stripe price environment variable.
- The current checkout rejects them because `isRevoryOfferConfigured()` cannot become true for either plan.
- No annual subscription price IDs, annual billing interval implementation, promotion policy, customer portal configuration or Stripe E2E evidence exists for Starter, Growth or Pro.
- Legacy `STRIPE_GROWTH_PRICE_ID` plumbing belongs to the prior billing substrate and must not be reused as the hybrid Growth plan.

## Implementation scope for the follow-up build

1. Replace the mixed three-card commercial layout with the two-group hierarchy above.
2. Add a monthly/annual control only after dedicated Stripe monthly and annual price IDs, portal behavior and webhook tests exist for the relevant plan.
3. Keep Growth and Pro visibly gated until their evidence, security and commercial gates pass.
4. Add plan-specific checkout only after explicit authority to configure new Stripe products/prices and execute sandbox E2E tests.
5. Extend billing tests to prove that monthly and annual prices map to the same entitlement, that annual renewal/cancellation events are safe, and that legacy price IDs cannot grant hybrid Growth/Pro access.
6. Validate desktop/mobile hierarchy and ensure the audit cards read as a baseline purchase, not as competing subscriptions.

## Product decision

The product should visually prioritize recurring subscriptions because they are the durable business model. The audit remains the first paid trust-building step, not the commercial center of the page. Annual billing should be offered only once a recurring plan is commercially open and has the required Stripe, renewal, support and paid-evidence gates.
