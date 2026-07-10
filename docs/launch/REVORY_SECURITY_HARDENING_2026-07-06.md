# REVORY Security Hardening - 2026-07-06

## Summary

Security hardening pass focused on launch-critical SaaS risks:

- vulnerable framework/runtime dependencies;
- weak production auth fallback;
- missing browser security headers;
- abuse-prone email/token flows;
- expensive authenticated actions that could be hammered;
- sensitive auth/token pages being indexed;
- provider error details leaking into runtime logs.

## Fixes Applied

- Upgraded `next` to `16.2.10`.
- Upgraded `prisma` and `@prisma/client` to `6.19.3`.
- Upgraded `next-auth` to latest v4 patch, `4.24.14`.
- Ran `npm audit fix` without force to apply compatible transitive fixes.
- Added production fail-fast for missing `AUTH_SECRET`.
- Added global security headers:
  - `Content-Security-Policy` with `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`;
  - `X-Frame-Options: DENY`;
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - `Permissions-Policy`;
  - `Strict-Transport-Security`;
  - `Cross-Origin-Opener-Policy: same-origin-allow-popups`.
- Added rate limiting for:
  - email/password signup and verification resend;
  - password reset requests;
  - password reset token attempts;
  - email verification token attempts;
  - AI CSV triage;
  - manual leak read sync.
- Marked auth/token pages as `noindex,nofollow`:
  - `/sign-in`;
  - `/sign-up`;
  - `/forgot-password`;
  - `/reset-password`;
  - `/verify-email`.
- Reduced Stripe checkout error logging to avoid leaking provider/config details.

## Residual Audit Notes

`npm audit` still reports moderate vulnerabilities that do not have a safe non-breaking fix in the current dependency line:

- `next` via bundled `postcss`: npm suggests a breaking downgrade to `next@9.3.3`, which is not a valid fix for this Next 16 app.
- `next-auth` via `uuid`: npm suggests a breaking downgrade to `next-auth@3.29.10`, which would break the current NextAuth v4 integration.

These should be monitored and revisited when the upstream packages publish safe compatible fixes.

## Guardrails Preserved

- No auth provider swap.
- No billing architecture rewrite.
- No new database migration.
- No CRM/inbox/BI/product-scope expansion.
- No changes to RevenueLeak engine semantics.
