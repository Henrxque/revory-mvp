# Multi-provider validation and release gate

## Current boundary

Implementation branch: `release/multi-provider`. New connectors are a development preview, controlled by `REVORY_AI_MULTI_PROVIDER_ENABLED=true` in addition to the existing paid-source/connected-report gates. Production remains the release documented on 22 October 2026. Do not announce Anthropic or Gemini as live, complete, or validated from fixture results.

The founder has no Anthropic/Google usage data for this delivery. No external account, credential, cloud resource, paid consumption, environment variable or production database was changed to supply this proof.

## Source matrix

| Source | Scope | Credential and required review |
| --- | --- | --- |
| Stripe | Existing invoice creation context | Existing restricted account/invoice read key; no new permissions |
| OpenAI | Existing completions usage and reported project costs | Existing minimum available Usage/Costs credential |
| Anthropic | Direct Claude Platform organization usage/cost reports | Dedicated Admin API key; account identity verified against organizations/me. Admin credentials may have broader privileges than the GET-only calls REVORY performs. Individual accounts and models purchased through other platforms are not assumed supported. |
| Gemini Developer API | Documented output-token metric, when available, and customer-configured project billing export | Dedicated Google service account; project metadata read, Monitoring Viewer, read access to the billing table, BigQuery Job User in the query project. Input/cache/batch usage is not represented by the output metric; quota counters are not substitutes. |
| Gemini on Vertex | Gemini online-serving token metrics and Gemini billing SKUs for one Google project | Same dedicated Google access; distinct platform selection. Batch traffic, other publishers and other platforms are outside scope. Explicit-cache traffic uses distinct units. |

Only one account per connector and one Google project/platform per workspace connection are currently supported. A missing metric descriptor yields explicit costs-only/unknown usage coverage. Permission, network, invalid-schema, pagination and query failures fail the read without advancing its checkpoint.

## Google billing queries

- The billing export must already exist. REVORY does not enable billing, create exports, create service accounts, grant roles or change cloud resources.
- The service account exchanges a locally signed, short-lived assertion at the fixed Google OAuth endpoint. Its key is encrypted in the existing workspace/connection/provider/generation envelope; access tokens remain in server memory only.
- Read calls target fixed project-bound Monitoring, Resource Manager and BigQuery endpoints. BigQuery uses one fixed SELECT with named date/project/service parameters, no destination table, and maximumBytesBilled=104857600 (100 MiB). The customer explicitly consents to potential Google query charges before registration.
- Query jobs are operational artifacts in the customer's query billing project. They do not mutate source tables. Polling is restricted to job IDs returned by the query created by this transport.
- Existing billing-export tables can be too large for the cap; queries fail safely. Do not silently raise the cap, infer zero spend or provision a different service. A narrow, documented customer-managed view can be reviewed separately, retaining table-provenance limitations.
- Costs are grouped by project/day/currency. Credits and billing adjustments stay separate, may suppress eligible cost coverage and are not silently netted or allocated to models/customers. The customer-supplied export table's provenance and completeness are not certified by REVORY.
- At least 48h after closure is required; billing delays may be longer. The owner still reviews closure. Monitoring consent renewal raises a shorter delay to the Google minimum and suppresses comparisons when lag/source scope changes.

## Ledger identity and unit guide

Use the exact provider, project/workspace, model and unit represented by the selected evidence. Shared projects/workspaces are not exclusive customer links.

| Provider value | Project dimension | Supported unit examples |
| --- | --- | --- |
| `openai` | OpenAI project ID | `input_tokens` includes cached input; `output_tokens` |
| `anthropic` | Anthropic workspace ID, when returned | `input_tokens_uncached`, `input_tokens_cached`, `input_tokens_cache_write_5m`, `input_tokens_cache_write_1h`, `output_tokens` |
| `gemini` — Developer API | Google project ID | `gemini_reported_output_tokens`; input/cache/batch remain outside metric scope |
| `gemini` — Vertex | Google project ID | `vertex_input_tokens`, `vertex_output_tokens`; append `_explicit_cache` for traffic explicitly labeled that way |

Anthropic amounts arrive as decimal cents and are converted exactly once to USD. Cache reads/writes are separate usage measures. Google/Anthropic cost totals are not multiplied by model or token categories. Model IDs and unit semantics must match the ledger; no guessing from similar names or rate-card conversion.

## Required gates before customer publication

1. Review migration 40, backup and rollback plan; apply constraints as an operator to an isolated remote environment. Runtime remains CRUD-only. No historical row or report is rewritten.
2. Supply an authorized Anthropic organization and Google project/export with nonempty data. The account owner enters credentials through the application; never ask for keys in chat. Verify exact identity, permissions, pagination and real payload compatibility.
3. Independently compare each official export/API period with the internal ledger, including nonzero usage/cost, cache, credits, corrections, empty activity, missing descriptor, quota/permission failure and revocation. Record source lag and supported dimensions.
4. Verify the authenticated scan and recurring reports in remote staging, workspace isolation, source export, credential revocation/rotation, paid entitlement and current terms/privacy/subprocessor disclosures. Synthetic/test purchases do not prove customer value.
5. Only after source-specific gates pass, prepare the reviewed marketing/limitations copy and request the required explicit production authority. Preserve US$99/US$199, old contracts, Google OAuth and Resend.

## Rollback

Disable the multi-provider gate to stop new connector use. Review any active multi-provider schedules first; failure or removed scope must not become a resolved difference. Keep historical 4.3 snapshots reproducible with the new code. A rollback to code lacking 4.3 would make new reports unreadable, so use a forward fix or maintain the new reader. Never delete evidence, rewrite subscriptions, shrink credential constraints while Google envelopes remain, or drop the new provider constraint support while those rows exist.
