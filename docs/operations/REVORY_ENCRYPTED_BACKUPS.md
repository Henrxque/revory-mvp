# Encrypted production backups

## Scope and configuration

Founder decision on 2026-10-20: keep Neon Free; no installation upgrade or billing changes.

The `REVORY encrypted production backup` GitHub Actions workflow runs daily at **04:23 UTC (01:23 Brasília)** and supports manual dispatch on `main`. Scheduled Actions can be delayed; this is a target, not an SLA. It runs before the application's daily retention window.

The archive covers **all application tables in `neondb.public`**, including NextAuth identities/sessions, workspace records, imports, reports and operational checkpoints. The provider-managed `neon_auth` schema is not used by REVORY's NextAuth integration and is excluded. Synthetic Preview databases, PostgreSQL roles/passwords, Vercel environment values, source-provider data, domains and external configuration are excluded. Reconstruct roles and environment separately; preserve any application envelope-encryption keys required to read restored records.

Each archive uses a consistent PostgreSQL snapshot (`pg_dump`, custom format). The runner streams plaintext directly into **age v1.3.2** encryption; no plaintext dump is written or uploaded by the workflow. Only ciphertext and a metadata manifest (date, size, SHA-256, scope) become an artifact. The public repository means artifacts must be treated as downloadable ciphertext, never as private storage.

- Dedicated SQL login `revory_backup_prod_20261020`: SELECT on application tables/sequences, no table ownership, role membership, schema CREATE, write or administrative privileges. Default transaction is read-only. Default privileges for `neondb_owner` cover future public tables/sequences.
- `REVORY_BACKUP_DATABASE_URL`: GitHub repository secret, direct endpoint, restricted role. No owner credential in GitHub or Vercel runtime.
- `REVORY_BACKUP_RECIPIENT`: public encryption recipient in repository Actions variables. The private identity must never be stored in GitHub or the repository.
- Runner: standard Ubuntu. Dependencies pinned to reviewed action commits and age release SHA-256. No dependency install or project scripts with database access beyond the backup script.
- Only reviewed main-branch schedule/manual events; no pull-request execution. Minimal read permissions and no persisted checkout credential.
- TLS verifies the database hostname and CA chain. Application role, endpoint, DB, table permissions, RLS, large objects and unreviewed schemas are checked before dumping. Unexpected changes stop the backup for review.

## Retention and capacity

Artifacts expire after **7 days**. Each encrypted archive is capped at **20 MiB**; a repository storage guard refuses uploads above 200 MiB total or after eight unexpired backup artifacts. It does not delete existing copies to make space. Manual runs also consume this allowance.

At activation, all 26 owner repositories were inspected and had zero Actions artifacts. This design uses the existing GitHub allowance; no paid product or budget change was enabled. The free allowance is shared with other repository artifacts and GitHub Packages; the repository guard cannot guarantee account-wide free capacity if other projects consume it. Review account billing/storage before growing usage. Exceeding the cap must cause a visible failed run, not a silent missing backup or automatic upgrade.

RPO target: 24 hours when the schedule succeeds. Seven days is a recovery window, not indefinite retention. Neon PITR remains a separate six-hour control. GitHub scheduled workflows may be disabled after repository inactivity; independently review freshness and failures. GitHub notifications follow the account's Actions settings and are not proof of delivery.

## Recovery identity and recovery drill

On the operator's Windows account, the identity is stored outside Git at `C:/Users/hriqu/Documents/REVORY Recovery/revory-production-age-20261020.txt`, in an ACL-protected directory accessible to that user. A DPAPI-protected operator-vault copy also exists. Both are on the same computer: **an independent copy in a password manager or offline medium is still required to survive loss of the PC**. Do not paste the private identity into a chat or issue. Keep it while any corresponding backups exist.

1. Download a successful run's artifact while signed into the owning GitHub account. Confirm its date and compare ciphertext SHA-256 with its manifest. Metadata is not a signature; access to the GitHub account remains a trust boundary.
2. Decrypt locally with the private identity: `age --decrypt --identity <private-file> --output <private-dump> production.dump.age`. A wrong identity or modified ciphertext must fail. Never upload the identity or decrypted dump.
3. Create a disposable, isolated PostgreSQL 17+ database with no application traffic. Use a distinct local endpoint; never production. Restore using `pg_restore --exit-on-error --no-owner --no-acl --dbname <isolated-database> <private-dump>`. If a fresh target's public schema conflicts, drop that empty schema **only in the verified disposable target** before restoring.
4. Check schema, constraints, row counts and row-content hashes against the exported source snapshot. Count-only verification is insufficient. Record only aggregate redacted proof, never customer rows or hashes of individual values.
5. For a disaster recovery incident, rebuild least-privilege roles and protected external configuration, test auth/workspaces/report reads, and approve a separate cutover. A local database restore alone is not a full service failover test.
6. Drop the disposable database and remove plaintext dumps after checking the absolute local targets. The normal backup workflow never restores or writes customer data.

First local drill passed on 2026-10-20: 30 tables, 132 rows, matching columns, constraints, row counts and whole-table content hashes. Source manifest and dump used the same exported READ ONLY snapshot. PostgreSQL 17/18 NOT NULL catalog differences are normalized by comparing column nullability; timestamps are rendered in UTC. Cross-database reads from both Previews were rejected. Redacted proof: `docs/qa/security-operations/free-backup-2026-10-20.json`. Actual remote-artifact recovery remains a separate check until its proof is recorded.

## Failure response

Check the workflow's latest completed conclusion and artifact creation time. A failed/cancelled run or latest valid archive older than **26 hours** is actionable. Permission/RLS/schema changes require explicit review and grants to the same minimal role; never replace it with an owner URL. A size-cap failure requires a capacity decision. Dependency failures must leave no uploaded partial archive. A missing recovery identity means backups are not recoverable; preserve existing ciphertext while locating the identity.

First retention observation remains scheduled for 2026-10-21 03:10 Brasília. Its successful production checkpoint is a separate acceptance criterion; a backup does not prove the retention job ran.

## Primary references

- [PostgreSQL pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html)
- [age](https://github.com/FiloSottile/age)
- [GitHub Actions allowances and storage billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [GitHub schedule events and inactivity](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
