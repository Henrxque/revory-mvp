# REVORY Legal Implementation — Pending Decisions

Status date: 2026-07-22  
Owner: Ametrine Labs  
Scope: internal launch control; do not publish this file as customer-facing legal advice.

The public documents describe only implemented behavior and confirmed provider boundaries. They do not state that REVORY has obtained legal approval, certification, or a transfer mechanism that has not been executed.

## P0 — before unrestricted paid launch

1. `[INTERNATIONAL TRANSFER MECHANISM REQUIRES LEGAL CONFIRMATION]`
   - Brazilian counsel must select and document the applicable mechanism under LGPD and ANPD Resolution CD/ANPD No. 19/2024.
   - If ANPD standard contractual clauses are selected, complete exporter/importer information and incorporate the clauses as legally required; do not paraphrase them.
   - Confirm the production database region and cross-border support boundaries against the provider accounts.

2. `[LIABILITY AND INDEMNITY CLAUSES REQUIRE BRAZILIAN COUNSEL APPROVAL]`
   - Approve Terms Sections 27–30, including the mutual 12-month fee cap, the one-time Audit cap, exclusions and exceptions.
   - Confirm enforceability for Brazilian B2B contracting and treatment of any customer that legally qualifies as a consumer.

3. `[DPA REQUIRES FINAL COUNSEL AND TRANSFER ANNEX CONFIRMATION]`
   - The product now contains a complete bilingual executable DPA draft and annexes.
   - Counsel must approve it and the selected transfer annex before it is represented as final legal advice.

## P1 — launch operations

1. `[RETENTION PERIOD REQUIRES LEGAL/OPERATIONS CONFIRMATION]`
   - Product analysis retention is implemented at 30/90/180/365 days, default 365.
   - Set and document final periods for account, legal-acceptance, security, billing/tax, support and managed-backup records.
   - Do not restore the removed automatic “30 days after cancellation” promise unless code and operating procedure enforce it.

2. Confirm whether Ametrine Labs must appoint or publicly identify a DPO/encarregado under its final processing scale and ANPD rules. Until confirmed, `support@revory.app` is the organizational privacy contact and no individual is named.

3. Confirm the current provider-account facts at each material change: Neon database region, Vercel processing configuration, Stripe/Resend/OpenAI/Google contractual terms, and any new monitoring or support provider.

4. Establish a change-notice owner for the Subprocessor Notice and legal document versions.

## P2 — evidence and polish

1. Obtain an independent application-security assessment before marketing advanced/Pro assurance.
2. Re-run mobile, print and bilingual parity QA after counsel edits.
3. Keep a signed or electronically accepted copy of any negotiated Order or DPA outside the application database in the private legal record system.

## Implemented technical evidence

- Central document versions and effective date.
- English and Brazilian Portuguese routes for Terms, Privacy, Refunds, DPA, Security, Subprocessors, Cookies and Responsible Disclosure.
- Persistent account-creation and checkout acceptance records with user, optional workspace, event, locale, document versions, context and timestamp; no IP address is collected for this purpose.
- Checkout metadata includes the accepted document versions.
- Signup clickwrap and checkout disclosure link to the current documents.
- Workspace export, supported analysis deletion and configured analysis-retention controls remain available.
- Current provider list reflects executable dependencies: Vercel, Neon, Stripe, Resend, Google OAuth and OpenAI when enabled.
