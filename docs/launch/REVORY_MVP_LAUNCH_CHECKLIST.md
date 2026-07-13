# REVORY Quote Recovery — paid-beta launch checklist

Status: **BLOCKED**. This is the canonical pre-launch checklist for the hybrid REVORY product. A checked local mechanism does not prove an external service or production environment is ready.

## Local product gates

- [x] Canonical Customer, Lead, Estimate and Activity intake supports deterministic profiling, assisted mapping, explicit review and atomic persistence.
- [x] Import blocking covers structural errors, required fields, low confidence, duplicate targets and incompatible datasets.
- [x] Workspace isolation, idempotency, Data Quality and value-basis separation have executable local tests.
- [x] Authenticated desktop/mobile Quote Recovery flow passes locally: import, Data Quality, dashboard, evidence, disposition and export.
- [x] Public read-only sample workspace uses synthetic contractor data and performs no upload or persistence.
- [x] Public and active authenticated copy sweep blocks MedSpa/QuoteSignal-era vocabulary.
- [x] Protected retention endpoint and idempotent local enforcement test exist.

## External and production gates

Every item below remains **BLOCKED** until evidence is attached to the Sprint 6.1 report.

- [ ] Stripe test-mode products/prices exist for the US$799 Quote Recovery Audit and US$399 Starter.
- [ ] Test checkout, signed webhook fulfillment, duplicate-event handling and customer portal pass end to end.
- [ ] Resend sender domain is verified and a synthetic transactional delivery passes.
- [ ] Authentication callbacks and Google OAuth are verified on the final domain.
- [ ] Production database migration is reviewed, backed up and applied through the approved deployment path.
- [ ] Protected cron is configured with a rotated secret; digest and retention schedules produce observable runs.
- [ ] Retention policy choices are approved and automated enforcement is verified in the deployment environment.
- [ ] Backup and restore exercise succeeds with documented RPO/RTO decisions.
- [ ] Error monitoring, uptime monitoring and alert ownership are active.
- [ ] Production-oriented dependency, secret, authorization and tenant-isolation security scan is reviewed.
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
