import Link from "next/link";

const vendors = [
  ["Vercel", "Application hosting and delivery", "Production use must be verified"],
  ["Managed PostgreSQL provider", "Workspace and product data storage", "Actual production provider must be published"],
  ["Stripe", "Checkout, subscription and billing events", "Only when billing is enabled"],
  ["Resend", "Transactional email delivery", "Only when email delivery is enabled"],
  ["Google", "Optional OAuth identity", "Only for Google sign-in"],
  ["OpenAI", "Optional bounded mapping assistance using minimized profiles", "No raw customer rows in the mapped provider boundary"],
] as const;

export default function SubprocessorsPage() { return <main className="min-h-screen bg-[color:var(--background)] px-5 py-8 text-[color:var(--foreground)]"><section className="rev-card-premium mx-auto max-w-4xl rounded-[30px] p-6 md:p-9"><p className="rev-kicker">Subprocessors</p><h1 className="mt-3 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[.95] tracking-[-.06em]">Current processing categories.</h1><p className="mt-5 text-sm leading-7 text-[color:var(--text-muted)]">This operational list distinguishes active/conditional roles from planned services. The final production vendor, location and notice terms must be verified before paid launch.</p><div className="mt-7 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead><tr className="border-b border-[color:var(--border)] text-[color:var(--text-subtle)]"><th className="p-3">Provider</th><th className="p-3">Purpose</th><th className="p-3">Boundary</th></tr></thead><tbody>{vendors.map(([name,purpose,boundary])=><tr className="border-b border-[color:var(--border)]" key={name}><th className="p-3">{name}</th><td className="p-3 text-[color:var(--text-muted)]">{purpose}</td><td className="p-3 text-[color:var(--text-muted)]">{boundary}</td></tr>)}</tbody></table></div><Link className="rev-action-button mt-8 inline-flex" href="/">Back to REVORY</Link></section></main>; }
