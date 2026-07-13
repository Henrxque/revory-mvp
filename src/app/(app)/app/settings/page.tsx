import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/db/prisma";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getGrowthAccess } from "@/services/billing/growth-access";
import { getTransactionalEmailConfig } from "@/services/email/transactional-email";
import { isInternalMigrationPreviewEnabled } from "@/services/app/internal-preview";
import { deleteAnalysisDataAction, updateDigestAction, updateRetentionAction } from "./actions";

export default async function SettingsPage() {
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/app/settings"));
  const [settings, digest, growthAccess] = await Promise.all([
    prisma.workspaceDataSettings.findUnique({ where: { workspaceId: context.workspace.id } }),
    prisma.quoteRecoveryDigestPreference.findUnique({ where: { workspaceId: context.workspace.id } }),
    getGrowthAccess(context.workspace.id),
  ]);
  const emailConfigured = getTransactionalEmailConfig().configured;
  return (
    <div className="space-y-6">
      <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-7">
        <p className="rev-kicker">Workspace controls</p>
        <h1 className="rev-display-hero mt-3">Keep the recurring read under your control.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">Manage retention, weekly digest, data portability and billing without a support call.</p>
      </section>
      {isInternalMigrationPreviewEnabled() ? <Link className="rev-button-secondary" href="/app/launch-evidence">Review Sprint 12 launch evidence</Link> : null}
      <section className="grid gap-5 lg:grid-cols-2">
        <Card body="Download a workspace-scoped JSON package with canonical imports, mappings, findings, history, entitlements and audit events." title="Data export">
          <a className="rev-button-primary" href="/app/settings/data-export">Export workspace data</a>
        </Card>
        <Card body="Choose how long REVORY should retain analysis data once the scheduled retention worker is activated." title="Retention">
          <form action={updateRetentionAction} className="flex gap-3">
            <select className="rev-input-field" defaultValue={settings?.retentionDays ?? 365} name="retentionDays">
              {[30, 90, 180, 365].map((days) => <option key={days} value={days}>{days} days</option>)}
            </select>
            <button className="rev-button-secondary">Save</button>
          </form>
          <p className="mt-3 text-xs text-[color:var(--text-subtle)]">Policy is stored now; automated enforcement remains deployment-gated.</p>
        </Card>
        <Card body="Receive one sample-guarded management priority plus separated movement and financial bases. No customer rows or source payloads are sent to the email provider." title="Weekly Growth decision digest">
          {growthAccess.enabled ? (
            <form action={updateDigestAction}>
              <label className="flex items-center gap-3 text-sm"><input defaultChecked={digest?.enabled ?? false} name="enabled" type="checkbox" />Enable weekly digest</label>
              <button className="rev-button-secondary mt-4">Save preference</button>
            </form>
          ) : <p className="text-sm text-[color:var(--text-muted)]">Growth access is required. Checkout remains closed while the commercial gate is incomplete.</p>}
          <p className="mt-3 text-xs text-[color:var(--text-subtle)]">
            {growthAccess.preview
              ? "Internal preview only; provider sends stay blocked without a real Growth entitlement."
              : emailConfigured
                ? `Email configured${digest?.lastSentAt ? ` · last sent ${digest.lastSentAt.toLocaleDateString("en-US")}` : ""}.`
                : "Delivery is paused until Resend and the sending domain are configured."}
          </p>
        </Card>
        <Card body="Dedicated offer entitlements remain separate from historical plan IDs. Growth checkout is not public while its release gate is incomplete." title="Plans and billing">
          {context.workspace.stripeCustomerId
            ? <form action="/api/billing/portal" method="post"><button className="rev-button-secondary" type="submit">Open billing portal</button></form>
            : <Link className="rev-button-secondary" href="/start">Review gated plans</Link>}
        </Card>
      </section>
      <section className="rounded-[24px] border border-[rgba(255,114,141,.25)] bg-[rgba(255,114,141,.05)] p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--danger)]">Destructive data control</p>
        <h2 className="mt-3 text-xl font-bold">Delete imported analysis data</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-muted)]">Deletes canonical imports, saved mappings, Quote Recovery and Revenue Realization findings, analysis runs and intelligence snapshots. Your account, workspace and billing identity remain intact.</p>
        <form action={deleteAnalysisDataAction} className="mt-5 flex max-w-xl flex-col gap-3 sm:flex-row">
          <input aria-label="Deletion confirmation" className="rev-input-field flex-1" name="confirmation" placeholder="Type DELETE REVORY DATA" />
          <button className="rev-button-secondary">Delete analysis data</button>
        </form>
      </section>
    </div>
  );
}

function Card({ body, children, title }: { body: string; children: React.ReactNode; title: string }) {
  return <article className="rev-shell-panel rounded-[24px] p-5"><h2 className="text-lg font-bold">{title}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-[color:var(--text-muted)]">{body}</p><div className="mt-5">{children}</div></article>;
}
