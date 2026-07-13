# REVORY Resend and Google OAuth runbook

This runbook covers external launch configuration only. It does not authorize a deploy, a production environment change or an email send.

## Current repository status

- Email verification, password reset and the weekly management-decision digest use the same server-only Resend transport.
- Every send has a bounded timeout and an idempotency key.
- Provider error bodies and recipient addresses are not written to application logs.
- `POST /api/webhooks/resend` verifies the raw payload with the Resend signing secret before accepting delivery events.
- `npm run email:check` validates local configuration without sending an email.
- `npm run email:smoke` sends only when an explicit `RESEND_SMOKE_TO` recipient is configured.
- The repository currently has no real Resend API key. The value found in `.env.vercel-import` is a placeholder and must not be treated as configured.

## Resend account and DNS

1. Sign in to Resend and add a sending domain. A dedicated subdomain such as `mail.revory.app` is recommended for reputation isolation, but using `revory.app` is valid if that is the domain you intentionally verify.
2. Copy the exact SPF and DKIM records shown by Resend into the DNS provider for the selected domain. Add DMARC after the domain is verified.
3. Wait until the Resend domain status is `verified`.
4. Create a Resend API key with sending access. Do not paste it into source code, documentation, chat or Git.
5. Put the following values in `.env.local` for local validation. Production values belong in the deployment environment only after explicit deployment approval:

```dotenv
RESEND_API_KEY="re_..."
AUTH_EMAIL_FROM="REVORY <no-reply@mail.revory.app>"
RESEND_TIMEOUT_MS="8000"
```

The domain in `AUTH_EMAIL_FROM` must be the same verified domain (or an address below the verified parent domain).

## Delivery event webhook

After a public deployment exists:

1. Create a webhook in the Resend dashboard with endpoint `https://revory.app/api/webhooks/resend`.
2. Subscribe at minimum to `email.delivered`, `email.bounced`, `email.complained`, `email.delivery_delayed`, `email.failed` and `email.suppressed`.
3. Copy its signing secret to the deployment environment as `RESEND_WEBHOOK_SECRET="whsec_..."`.
4. Never accept webhook payloads without signature verification. The route already rejects missing or invalid Svix headers.

## Safe validation sequence

```powershell
npm run email:check
npm run email:check -- --remote
$env:RESEND_SMOKE_TO="your-test-inbox@example.com"
npm run email:smoke
```

The first command is local-only. `--remote` reads the Resend domain status but does not modify the account. The smoke command is the only one that sends an email and must be run intentionally.

## What OAuth means in REVORY

OAuth is the authorization protocol behind **Continue with Google**. REVORY redirects the user to Google; Google authenticates the person and returns a short-lived authorization result to REVORY. The Google password never passes through or gets stored by REVORY.

The current app uses NextAuth and expects a Google OAuth 2.0 **Web application** client with:

- Authorized JavaScript origins:
  - `http://localhost:3000`
  - `https://revory.app`
- Authorized redirect URIs:
  - `http://localhost:3000/api/auth/callback/google`
  - `https://revory.app/api/auth/callback/google`

Local or deployment secrets:

```dotenv
AUTH_GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
AUTH_GOOGLE_CLIENT_SECRET="..."
AUTH_SECRET="a-long-random-session-secret"
NEXT_PUBLIC_APP_URL="https://revory.app"
```

`invalid_client` means Google does not recognize the submitted client ID/secret pair, usually because the client was deleted, the ID is wrong, the secret belongs to another client, or a placeholder/stale deployment value is still active. `redirect_uri_mismatch` is different: the client exists, but the callback URL does not exactly match a registered redirect URI.
