# Repository Guidance

Use [docs/source-of-truth.md](docs/source-of-truth.md) as the canonical product authority for this repository.

The definitive product decision is:

- the public brand is **REVORY**;
- REVORY is the hybrid product formerly developed as QuoteSignal;
- the former MedSpa REVORY product is discontinued;
- historical MedSpa and REVORY Seller material is migration evidence only;
- `QuoteSignal` may appear only in explicitly historical or migration context.

Read the living documents in this order:

1. [docs/source-of-truth.md](docs/source-of-truth.md)
2. [REVORY_ESCOPO_HIBRIDO.md](REVORY_ESCOPO_HIBRIDO.md)
3. [docs/REVORY_HYBRID_PRODUCT_AND_LAUNCH_ROADMAP.md](docs/REVORY_HYBRID_PRODUCT_AND_LAUNCH_ROADMAP.md)
4. [docs/REVORY_CONTINUOUS_EXECUTION_GUIDE.md](docs/REVORY_CONTINUOUS_EXECUTION_GUIDE.md)
5. task-specific documentation and executable code

When code differs from the source of truth, report the gap. Existing MedSpa behavior does not redefine the product, and roadmap scope does not become a sellable capability merely because it is documented.

## Product Guardrails

- Premium, self-service and solo-founder-friendly
- High-ticket-service-business-first
- Revenue-leak-first and evidence-first
- CSV/XLSX-first until the engine and willingness to pay are validated
- Quote Recovery before Revenue Realization
- Data Quality and explicit matching before financial claims
- Observed, calculated, estimated, operational and data-quality values kept separate
- Deterministic core with bounded, optional AI
- Workspace isolation, provenance, external IDs and idempotency

## Brand Guardrails

- Canonical application background: `#141516`
- Canonical alternating surface/background: `#252729`
- Canonical logo and identity accent: `#43B39B`
- Canonical transparent logo: `public/brand/revory-logo-43b39b-transparent.png`
- Keep the logo background transparent; do not place it inside a black or white square
- Derive hover, glow and surface variants from the canonical tokens instead of introducing a second turquoise
- Use `#252729` primarily for contained cards and panels; full-width alternating sections should use a subtle mix with `#141516`, not a hard color band
- Landing/marketing titles and impact statements use Instrument Serif
- Landing body copy, buttons, labels and navigation use DM Sans
- Card titles across marketing pages use bold DM Sans, never Instrument Serif
- Dashboard/app uses Sora, with DM Sans allowed for dense reading surfaces

Do not turn REVORY into a CRM, inbox, autonomous follow-up agent, FSM, dispatch or scheduling system, accounting suite, full job-costing or project-management system, generic BI platform, or manual consulting service.

## Migration Safety

- Do not mechanically rename MedSpa domain objects into contractor objects.
- Do not run destructive migrations or reuse clinical fields with new financial meanings.
- Preserve unmatched and conflicting records; never silently link records by approximate name or amount.
- Do not alter production, domains, Stripe, Vercel, secrets or external integrations without verified need and explicit authority.
- Keep customer-facing claims within implemented capability. Change orders, invoices, underbilling and margin remain roadmap-only until their release gates pass.
