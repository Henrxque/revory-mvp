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

- [x] Stripe test-mode products/prices exist for the US$799 Quote Recovery Audit, US$399 Starter and US$799 Growth.
- [ ] Test checkout, signed webhook fulfillment, duplicate-event handling and customer portal pass end to end.
- [x] Resend sender domain and signed webhook are configured; authenticated browser evidence on 2026-07-22 confirmed the verified domain, enabled webhook and HTTP 200 delivery acknowledgement for the password-reset message sent on 2026-07-16. The public `support@` and `security@` aliases were also confirmed by the founder.
- [x] Authentication callbacks and Google OAuth passed a real round-trip on `https://revory.app` on 2026-07-13.
- [ ] Production database migration is reviewed, backed up and applied through the approved deployment path.
- [ ] Protected cron routes and the production secret are deployed, and both schedules are present in `vercel.json`; one observed digest and retention run remain required. The observers now query inside the provider's short log-retention window.
- [ ] Retention policy choices are approved and automated enforcement is verified in the deployment environment.
- [x] Backup and restore exercise succeeded in an isolated Neon branch with redacted measured RPO/RTO evidence.
- [x] Web Analytics, Speed Insights and Vercel's default error rule are enabled; the external GitHub monitor is live and repeatedly healthy, and the founder confirmed the controlled alert notification on 2026-07-22.
- [ ] Add a second trusted human incident operator before scaling beyond the founder-led launch; the current GitHub issue/Vercel-log recovery route is documented, but it is not a substitute person.
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
