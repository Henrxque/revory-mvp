# REVORY Sprint 0 — Public claim register

> Scope: all current public claim families. “Planned” means visibly prelaunch and not sellable.

## Status definitions

- **Implemented:** executable in the active contractor product.
- **Horizontal:** working infrastructure, independent of the product domain.
- **Partial:** reusable implementation exists but active-domain behavior is incomplete.
- **Planned:** roadmap capability with no current sellable claim.
- **Boundary:** truthful statement about what REVORY does not do.
- **Prohibited:** must never be presented as REVORY capability.

| ID | Public surface/claim | Status | Executable evidence or gap | Owner | Gate/action |
|---|---|---|---|---|---|
| C01 | Public brand is REVORY | Implemented | canonical logo, metadata and public wordmark | Product/Brand | Keep continuously |
| C02 | Revenue Leak Intelligence for high-ticket service businesses | Positioning | source-of-truth category; not proof of engine coverage | Product | Keep; attach specific capability gates |
| C03 | “Detect quote leaks hidden in estimate data” | Planned | contractor estimate engine absent | Domain Engine | Sprint 3 |
| C04 | Stale estimates can hide close risk | Market/problem claim | no product execution implied by problem statement | Product Research | Keep as problem framing |
| C05 | Overdue follow-ups can expose recoverable opportunity | Market/problem claim | rule absent | Domain Engine | Sprint 3 before result claim |
| C06 | Missing owner/next step is operational risk | Planned | contractor activity/ownership contract absent | Domain Engine | Sprint 3 |
| C07 | Estimated recoverable revenue at risk | Planned financial estimate | value-basis model absent | Domain Engine | Sprint 3; never call confirmed loss |
| C08 | CSV-first intake | Partial | robust legacy CSV path exists; contractor datasets absent | Data Intake | Sprint 2 |
| C09 | Self-service flow | Partial | auth/workspace/import shells exist; contractor first-value loop absent | Product UX | Sprint 4–5 |
| C10 | Mapping review and deterministic fallback | Horizontal/partial | legacy mapping and bounded AI fallback execute | Data Intake | Adapt in Sprint 2 |
| C11 | Data Quality before financial claims | Partial | legacy validators exist; contractor eligibility absent | Data Intake | Sprint 2 |
| C12 | Evidence, confidence and next review action | Partial | primitives exist for legacy findings | Domain Engine/Product UX | Sprints 3–4 |
| C13 | Executive revenue-leak dashboard | Partial visual substrate | legacy read model only | Product UX | Sprint 4 |
| C14 | Executive export/report | Planned/partial | print composition exists; contractor export absent | Reporting | Sprints 4–5 |
| C15 | Go live fast | Planned outcome | no measured contractor first-value time | Product/QA | Prove in Sprint 5; avoid time guarantee |
| C16 | No mandatory service layer | Boundary/operating principle | product direction, not an implemented feature | Product | Keep; measure support minutes in Sprint 12 |
| C17 | Not a CRM, inbox, dispatch, scheduling or generic BI tool | Boundary | consistent with code and source | Product | Keep |
| C18 | Quote Recovery Audit — US$799 one-time | Planned primary offer | checkout shell exists; audit entitlement/result absent | Product/Billing | Sprint 5 |
| C19 | Starter — US$399/month | Planned | recurring movement/second read absent | Product/Billing | Sprint 6 |
| C20 | Full Revenue Leak Audit — US$1,499 | Planned | jobs/invoices/change orders absent | Product/Billing | Sprint 9 |
| C21 | Growth — US$799/month | Planned | history/segmentation absent | Product/Billing | Sprint 10 |
| C22 | Pro — US$1,499/month | Planned | premium rules and security review absent | Product/Billing/Security | Sprint 11 |
| C23 | Google and email/password access | Horizontal implemented | NextAuth providers and verification/reset flows | Platform/Auth | Regression test every release |
| C24 | Private isolated workspace | Horizontal/partial security claim | workspace-scoped patterns exist; formal negative suite incomplete | Security/Data | Sprint 1 before stronger isolation claim |
| C25 | Stripe checkout and billing portal | Horizontal implemented, offer mapping gated | routes/webhook/sync exist for legacy plan keys | Billing | Sprint 5 remapping only |
| C26 | AI-assisted mapping | Partial and optional | bounded profile/schema/fallback exists for legacy contracts | AI/Data | Sprint 2 adaptation |
| C27 | AI does not calculate final financial value | Boundary implemented in current AI prompt/runtime | bounded output contract and deterministic fallback | AI/Data | Keep and test |
| C28 | Change orders, underbilling and margin intelligence | Planned | no contracts, matching or rules | Domain Engine | Sprints 7–9 |

## Public presentation rule

Until Sprint 5 passes, all capability and price claims are governed by the visible private-build notice and disabled commercial checkout. Removing that notice requires a claim-by-claim review of this register.
