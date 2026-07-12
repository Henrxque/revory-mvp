# Sprint 3 — Quote and follow-up engine V1

Status: implemented locally on 2026-07-12. Findings are not yet presented as the Sprint 4 buyer experience.

## Tier 1 rules

- overdue follow-up;
- high-value stale quote;
- open estimate with no activity;
- estimate aging risk;
- missing owner or next step as operational risk;
- recoverable lost quote only when recent loss, value and explicit next step are all present.

## Trust behavior

- Every finding includes source-row provenance, evidence, confidence, severity, value basis and recommended review action.
- Operational missing-data findings never receive a financial value.
- Quote value is labeled estimated rather than observed recovered revenue.
- Fingerprints are stable per workspace, rule and estimate.
- Reruns update in place, preserve dismissed/resolved disposition, and resolve findings no longer present.
- Cross-workspace input is rejected before analysis.

## Exit evidence

`qa:sprints-1-3` covers all six rules, false-positive suppression, thin data, deterministic rerun, fingerprint uniqueness, tenant isolation and a 2,500-estimate target-volume fixture. Every executable Quote Recovery claim maps to one of these tested rules.
