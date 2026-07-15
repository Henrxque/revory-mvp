# REVORY vendor import QA pack

These fixtures are synthetic. They are not official, certified or reverse-engineered vendor exports. They exercise REVORY's bounded header matching, source suggestion, explicit user confirmation, currency fallback, Quote Recovery rules and Data Quality drill-down.

## Fast end-to-end run

1. Open **Data & settings** and record the workspace currency. Start with `USD`.
2. Open **Data Imports** and leave the source as **Spreadsheet / manual export**.
3. Choose one vendor folder. Attach its `customers.csv`, one `estimates.csv` **or** `estimates.xlsx`, and `activities.csv`.
4. Click **Review files and column matches**.
5. For named vendors, confirm the source suggestion. Manual and Other System should not be guessed.
6. Review the green `✓`, yellow `!` and red `×` column states. Confirm both review checkboxes.
7. If testing a one-time Audit, confirm the consumption dialog. Admin testing access must not consume paid capacity.
8. Open **Executive Read**. Click **Opportunities to review**, **Opportunities with value** and **Process gaps**; each must open the corresponding filtered records.
9. Open **Review data connections** in Import Review. Attention states must reveal the exact record and missing target rather than only a count.
10. Export CSV and the executive PDF; verify currency, values, evidence and REVORY branding.

## Currency runs

- Set the workspace to `CAD`, then import `manual-export` or `other-system-export`. Those estimate files omit a currency, so new records should use CAD.
- Keep the workspace at `CAD`, then import Jobber. Its fixtures explicitly contain `USD`, which must take priority.
- REVORY formats values but never performs FX conversion. A mixed-currency executive total must be suppressed rather than added.

## Source folders

- `manual-export`
- `buildertrend`
- `jobber`
- `servicetitan`
- `housecall-pro`
- `jobtread`
- `acculynx`
- `procore`
- `quickbooks`
- `other-system-export`

Procore and QuickBooks also include synthetic `jobs`, `invoices`, `change-orders` and `costs` CSVs for authorized Revenue Realization QA. Exact IDs are required; do not expect fuzzy matching.

The editable run matrix and expected results are in `outputs/revory-clarity-source-qa-20260714/revory-import-test-pack.xlsx`.
