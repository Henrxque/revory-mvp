# Sprint 12.1 — precision corrections and launch pending register

Date: 2026-07-13. Status: **LOCAL CORPUS PASS / EXTERNAL LAUNCH GATE FAIL**.

## Independent Sprint 9 corrections

- per-job invoice/change-order/cost export completeness replaces workspace-global dataset presence;
- unknown boolean values are invalid, never silently false;
- cross-source duplicate entity IDs block intake or suppress matching;
- mixed/invalid cost currency suppresses margin without contradictory evidence;
- only a valid, eligible invoice for the same job/currency suppresses approved-not-billed review;
- resolved findings reopen when evidence returns; dismissed findings remain dismissed;
- each imported entity/source scope is a full active snapshot and omitted records are preserved as inactive history;
- reconciliation carries a deterministic state fingerprint checked by the finding engine;
- scope text handles negation and removes broad `customer requested` matching;
- future completion, issue, approval and cost dates suppress affected financial output;
- intake idempotency includes source system, entity type and stable mapping semantics.

The first independent post-fix challenge still returned FAIL and exposed four additional logic boundaries: zero-value invoice suppression, mutable reconciliation output, calculation evidence containing excluded records, and over-broad scope language. The second correction pass now adds reconciliation-integrity signing, contribution-only evidence, positive-value eligible-invoice checks and a focused scope-language corpus.

`npm run qa:sprint-12-1`: PASS against both the original and expanded independent challenge corpus. The final independent Sprint 9/12.1 logic re-review returned **PASS with no remaining local blocker in its reviewed scope**. Customer, security, production and commercial evidence remain separate gates.

## Sprint 11/12.1 precision corrections

- Stripe entitlement mutations use compare-and-set against the last observed state and fail for a fresh-provider retry when another event wins the race;
- invalid subscription ownership, workspace, customer, metadata or price quarantines existing access;
- Checkout Session reuse requires the currently configured Stripe price, so price rotation cannot silently reuse an old open/complete session;
- every canonical import commits an immutable Quote Recovery and Data Quality snapshot in the same transaction;
- historical analysis repair uses only the requested import snapshot; pre-snapshot sessions fail closed instead of borrowing the current workspace state;
- canonical full replacements acquire a transactional workspace row lock before reading active state, serializing concurrent snapshot commits;
- the local integration corpus verifies A -> B -> repair A lineage, a real entitlement compare-and-set race and twelve concurrent replacements leaving one active version;
- `qa:launch-readiness` now executes the canonical REVORY hybrid gates; the former MedSpa clean rerun is historical migration evidence and no longer defines active launch readiness.

Final independent verdict: **Sprint 11 local PASS / Sprint 12.1 local PASS / paid launch external FAIL**. No reviewed local critical/high blocker remains. Paid checkout stays disabled until the dependency register below is closed.

## External dependency register

The accountable launch owner is **Henrique (founder)**. “Due” means before `REVORY_PAID_CHECKOUT_ENABLED=true`; no row can be waived by environment configuration alone.

| Dependency | Accountable owner / executor | Due | Reproducible evidence required |
|---|---|---|---|
| Legal entity, CNPJ, address, jurisdiction and public privacy/support/security contacts | Henrique / accountant + counsel | Before paid checkout | Signed entity details in the legal register plus a dated screenshot/export of `/terms`, `/privacy`, `/security` and `/dpa` containing the approved identity and contacts. |
| Final Terms, Privacy, DPA, refund/cancellation, tax and subprocessor review | Henrique / qualified counsel | Before paid checkout | Counsel-approved redlines or signed opinion stored outside the repo; record approval date and document hashes in this register. |
| MFA and ownership for GitHub, Vercel, Stripe, database, Resend, Google and DNS | Henrique / each platform owner | Before production migration | Redacted platform membership/MFA exports showing two recovery owners where supported; record review date and revoked accounts. |
| Production environment, domain and OAuth callback parity | Henrique / engineering | Before production smoke test | Redacted env-name inventory, DNS resolution output and Google OAuth redirect list; run authenticated sign-in on the canonical domain and retain the dated QA result. |
| Stripe test-mode lifecycle and Resend E2E | Henrique / engineering | Before paid checkout | Test-mode evidence for Audit + Starter checkout, portal, concurrent replay, subscription-before-checkout, paid/failure/recovery/cancel events; retain Stripe event IDs and app audit-event IDs. Deliver one email to an owned inbox and retain message ID. |
| Cron execution, WAF and distributed throttling | Henrique / engineering | Before production traffic | Deployment configuration plus one observed retention run and digest run; load-test output demonstrating 429/blocked behavior for expensive routes without cross-tenant impact. |
| Managed backup restore, alerts and incident ownership | Henrique / database provider | Before first customer data | Dated restore exercise into an isolated database, row-count checks, measured RPO/RTO, alert screenshots and named incident primary/backup. |
| Independent DAST/pentest and dependency-risk review | Henrique / qualified independent reviewer | Before public paid beta | Signed report, scope, tool/version, finding severities, remediation evidence and explicit retest result; include the five current moderate dependency findings. |
| Customer-shaped logic and weekly-decision usefulness | Henrique / design partners | After local sprints, before Growth/Pro sale | Workspace-scoped event export with at least the roadmap minimum sample, false-positive review and customer answer tied to each `stateFingerprint`; no seeded customer outcomes. |
| Git-history purge and credential/session rotation review | Henrique / engineering | Before repository access expands | Clean `git log -S`/secret-scanner report for the historical JWTs, force-push coordination record where applicable and dated rotation/revocation receipts. |

Exact production URLs, provider account IDs, secrets and legal files must remain outside the public repository. Their hashes/IDs may be recorded here after validation.

None of these items was silently marked complete.
