# REVORY incident and restore runbook

Status: local operating procedure. Production ownership, alert channels and managed-database restore evidence remain Sprint 12.1 gates.

## Severity and first response

- **SEV-1:** suspected cross-workspace disclosure, credential compromise, destructive data loss, payment entitlement abuse or active remote exploitation. Stop affected writes, revoke/rotate impacted credentials, preserve logs and notify the incident owner immediately.
- **SEV-2:** sustained outage, import corruption contained to one workspace, failed retention job or material billing inconsistency. Contain the route/job and begin reconstruction from immutable source evidence.
- **SEV-3:** degraded non-critical feature or recoverable delivery issue. Record, monitor and remediate through normal release control.

Never delete source evidence or rewrite audit history during triage. Record the UTC timeline, actor, workspace scope, release SHA, affected IDs, containment, customer impact and follow-up owner without copying customer rows into tickets.

## Tabletop procedure

1. Declare severity and incident lead.
2. Disable the narrow affected route/job or entitlement, not the entire platform unless tenant isolation is uncertain.
3. Revoke sessions with `sessionVersion`; rotate exposed OAuth, email, database or billing secrets in their managed systems.
4. Verify workspace-scoped queries and compare canonical provenance against the customer's original export.
5. For Stripe, preserve the signed event ID/hash, block replay and reconstruct entitlement state in event-created order.
6. Communicate only verified facts. Do not call estimated opportunity confirmed loss.
7. Close with root cause, corrective control, regression test and notification decision.

## Restore exercise

Local code can validate export, retention and deterministic reconstruction, but it cannot prove a managed backup restore.

Production exercise must:

1. record the provider backup identifier and expected RPO/RTO;
2. restore into an isolated non-production database;
3. use separate credentials and block outbound email/billing;
4. run migrations in review mode, tenant-isolation tests and aggregate row-count/hash comparisons;
5. verify one workspace export, canonical active snapshot, finding reconstruction, audit events and entitlement state;
6. destroy the isolated restore according to policy;
7. attach timestamps, operator and deviations to the release evidence.

No Pro paid beta may open until this production exercise and a qualified independent security review report no unresolved critical/high issue.
