# REVORY Quote Recovery — paid-beta launch checklist

Status: **BLOCKED**. This is the canonical pre-launch checklist for the hybrid REVORY product. A checked local mechanism does not prove an external service or production environment is ready.

## Local product gates

- [x] Canonical Customer, Lead, Estimate and Activity intake supports deterministic profiling, assisted mapping, explicit review and atomic persistence.
- [x] Import blocking covers structural errors, required fields, low confidence, duplicate targets and incompatible datasets.
- [x] Workspace isolation, idempotency, Data Quality and value-basis separation have executable local tests.
- [x] Authenticated desktop/mobile Quote Recovery flow passes locally: import, Data Quality, dashboard, evidence, disposition and export.
- [x] Public read-only sample workspace uses synthetic contractor data and performs no upload or persistence.
- [x] Public and active authenticated copy sweep blocks MedSpa/QuoteSignal-era vocabulary.
- [x] Sprint 13 separates ongoing subscriptions from paid-once Audit baselines, labels cadence explicitly and enforces the Starter prerequisite server-side.
- [x] Protected retention endpoint and idempotent local enforcement test exist.

## External and production gates

An unchecked row remains blocked even when part of its infrastructure is already configured.

- [ ] Stripe test-mode products/prices exist for the US$799 Quote Recovery Audit and US$399 Starter.
- [ ] Test checkout, signed webhook fulfillment, duplicate-event handling and customer portal pass end to end.
- [ ] Resend sender domain is verified and the signed webhook is configured; a synthetic transactional delivery and received delivery event still need evidence.
- [x] Authentication callbacks and Google OAuth passed a real round-trip on `https://revory.app` on 2026-07-13.
- [ ] Production database migration is reviewed, backed up and applied through the approved deployment path.
- [ ] Protected cron is deployed with a production secret and both schedules are visible in Vercel; one observed digest and retention run remain required.
- [ ] Retention policy choices are approved and automated enforcement is verified in the deployment environment.
- [ ] Backup and restore exercise succeeds with documented RPO/RTO decisions.
- [ ] Web Analytics, Speed Insights and Vercel's default error rule are enabled; an external uptime check and named primary/backup alert owners remain required.
- [ ] Durable throttling, security headers and a live WAF rule are active; independent DAST/pentest and final review of the five moderate dependency findings remain required.
- [ ] Bounded AI provider smoke test passes using synthetic, redacted profile data only.
- [ ] Privacy, Terms, refund/cancellation, tax and data-processing language receive final legal review.

## Founder information required before paid beta

- Legal entity/CNPJ, registered legal name, business address and jurisdiction.
- Public business contact, privacy contact, support email, security/incident email and incident owner.
- Stripe account ownership/business verification, statement descriptor, refund/cancellation policy and tax decision.
- Final sender domain/address and the person responsible for email deliverability.
- Final application domain plus all authentication callback and logout URLs.
- Approved retention periods, deletion expectations, backup retention and restore owner.
- Actual subprocessors in use; do not list planned or unused providers.
- DPA/privacy requirements and evidence of final counsel review, if applicable.

## Release rule

Do not enable checkout or call Sprint 5/6 complete until the relevant external items pass with reproducible evidence. Do not advertise change orders, invoices, underbilling or margin intelligence before their later release gates.
