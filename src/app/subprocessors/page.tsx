import Link from "next/link";

import { REVORY_LEGAL } from "@/content/revory-legal";

const vendors = [
  ["Vercel", "Application hosting, delivery, observability and scheduled functions", "Active production infrastructure"],
  ["Neon", "Managed PostgreSQL storage and isolated database branches", "Active production infrastructure"],
  ["Stripe", "Checkout, subscription, refund and billing events", "Active only for an enabled paid offer"],
  ["Resend", "Transactional authentication and product email delivery", "Active transactional email provider"],
  ["Google", "Optional OAuth identity", "Active only when a user chooses Google sign-in"],
  ["OpenAI", "Optional bounded mapping assistance using minimized column profiles", "No raw customer rows in the mapped provider boundary"],
] as const;

export default function SubprocessorsPage() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-5 py-8 text-[color:var(--foreground)]">
      <section className="rev-card-premium mx-auto max-w-4xl rounded-[30px] p-6 md:p-9">
        <p className="rev-kicker">Subprocessors</p>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[.95] tracking-[-.06em]">Providers used to operate REVORY.</h1>
        <p className="mt-5 text-sm leading-7 text-[color:var(--text-muted)]">{REVORY_LEGAL.legalName} uses the providers below only within the stated boundary. A conditional provider is not activated for a customer unless the related product function is enabled.</p>
        <div className="mt-7 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-[color:var(--border)] text-[color:var(--text-subtle)]"><th className="p-3">Provider</th><th className="p-3">Purpose</th><th className="p-3">Status and boundary</th></tr></thead><tbody>{vendors.map(([name,purpose,boundary])=><tr className="border-b border-[color:var(--border)]" key={name}><th className="p-3">{name}</th><td className="p-3 text-[color:var(--text-muted)]">{purpose}</td><td className="p-3 text-[color:var(--text-muted)]">{boundary}</td></tr>)}</tbody></table></div>
        <p className="mt-6 text-xs leading-6 text-[color:var(--text-subtle)]">Updated {REVORY_LEGAL.effectiveDate}. Material provider changes will be reflected here before they affect customer data.</p>
        <Link className="rev-action-button mt-8 inline-flex" href="/">Back to REVORY</Link>
      </section>
    </main>
  );
}
