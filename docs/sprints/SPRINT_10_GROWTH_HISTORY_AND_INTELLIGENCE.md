# Sprint 10 — Growth history and intelligence

Status: **local implementation complete; commercial exit blocked**. Date: 2026-07-13.

## Outcome implemented

REVORY now turns repeat imports into a workspace-scoped intelligence history and one bounded weekly management decision. The implementation does not expose Growth checkout or claim the target price is validated.

## Delivered

- `RevenueIntelligenceSnapshot` persists a stable state fingerprint, Quote Recovery snapshot, Revenue Realization snapshot, guarded segment read and separated value bases.
- A twelve-month history query returns only the authorized workspace and does not duplicate an unchanged imported state.
- Canonical estimate/job intake now supports explicit `source`, `owner` and `serviceType` fields.
- Segmentation exists independently for Quote Recovery and Revenue Realization across source, owner and service type.
- A cohort is rank-eligible only with at least 5 comparable records, findings on at least 2 distinct records and one currency.
- Thin, low-finding and mixed-currency cohorts are retained as suppressed states; they never become a leaderboard.
- The weekly decision prefers a supported calculated Revenue Realization gap, then a modeled Quote Recovery opportunity. Its copy explicitly says it is a review priority, not a performance verdict.
- Weekly digest delivery requires a real `GROWTH` entitlement. Internal preview may render the feature but cannot send provider email.
- Growth PDF is generated server-side, authenticated, workspace-scoped and returned with private/no-store headers.
- Import limits are derived from dedicated REVORY offer entitlements. Growth preview/entitlement raises the per-file row and byte limits without reusing legacy MedSpa `Workspace.planKey` semantics.
- Browser file transport uses authenticated multipart route handlers while preserving the existing Data Quality, rate-limit and atomic persistence functions; this removes intermittent zero-byte `File` serialization observed through React Server Actions.
- Workspace export, retention and destructive deletion include Revenue Realization findings and Growth snapshots.

## Evidence contract

- Estimated quote opportunity is never added to calculated billing gap.
- Approved change-order review and margin basis remain separate from the additive underbilling gap.
- Mixed currencies suppress a segment financial value.
- Missing attribution fields create no artificial “Unknown” ranking.
- Segment sample count uses distinct estimate/job records, not the number of findings.
- Quote Recovery segment value uses at most one estimated amount per estimate, preventing multiple rules on the same quote from multiplying the cohort value.
- Snapshot and PDF reads are authorized by `workspaceId`.

## Verification

- `npm run qa:sprint-10`
- `npm run qa:sprint-10:browser`
- `npm run qa:sprint-9`
- `npm run qa:sprints-7-8`
- `npm run qa:sprint-6`
- `npm run qa:sprints-1-3`
- `npm run qa:retention`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run db:validate`
- authenticated desktop/mobile screenshots and PDF rendering under the local QA evidence directory

## Exit criterion

| Criterion | Technical evidence | Result |
|---|---|---|
| 12-month movement | persisted, idempotent snapshots and authorized history read | PASS locally |
| source/rep/service segmentation | explicit canonical fields and separated layer cohorts | PASS locally |
| minimum-sample guards | 5 records, 2 finding records, single-currency rule with visible suppression | PASS locally |
| weekly executive digest | bounded decision and entitlement/provider boundary | PASS locally; provider delivery not verified |
| PDF | authenticated generated file with evidence-basis limitations | PASS locally |
| plan-aware volume controls | dedicated offer-entitlement policy, no legacy plan-key reuse | PASS locally |
| repeatable weekly decision unavailable in Starter | Growth entitlement gate exists and Starter does not receive the Growth digest | PASS in local code |
| Growth commercial release | predecessor logic/customer gate, paid evidence, Stripe, email and production operations | **BLOCKED** |

## Alice commercial verdict

The implementation improves recurring management value without manufacturing certainty. It still does not make Growth sellable. Sprint 9 has not passed a genuinely independent logic review or customer validation, the weekly delivery path has no production evidence, and Growth has no public billing configuration. The US$799/month target therefore remains a pricing hypothesis until those gates and paid-use evidence pass.
