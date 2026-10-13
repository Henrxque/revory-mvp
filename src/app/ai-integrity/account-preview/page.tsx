import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { AuthSignOutButton } from "@/components/auth/AuthSignOutButton";
import { RevoryLogo } from "@/components/brand/RevoryLogo";

export const metadata: Metadata = {
  title: "REVORY — Account preview",
  description: "Your REVORY account can explore the AI SaaS product preview and synthetic demo while the new workspace is in preparation.",
  openGraph: {
    title: "REVORY — Account preview",
    description: "Explore the REVORY AI SaaS product preview and synthetic demo.",
  },
  robots: { index: false, follow: false },
};

export default async function AccountPreviewPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/sign-in?redirect_url=%2Fai-integrity%2Faccount-preview");

  return (
    <main className="min-h-screen bg-[color:var(--background)] px-5 pb-16 [font-family:var(--font-dm-sans)] md:px-8">
      <header className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 border-b border-[color:var(--border)] py-5">
        <Link aria-label="REVORY home" href="/"><RevoryLogo compact /></Link>
        <AuthSignOutButton callbackUrl="/" compact />
      </header>
      <section className="mx-auto max-w-[1120px] py-16 md:py-24">
        <div className="rev-shell-hero rev-accent-mist max-w-3xl rounded-[32px] p-7 md:p-11">
          <p className="rev-kicker">REVORY · AI SaaS preview</p>
          <h1 className="mt-5 text-[clamp(3rem,6vw,5rem)] font-normal leading-[0.98] tracking-[-0.03em] [font-family:var(--font-instrument-serif)]">
            Your account is ready.<br /><span className="text-[color:var(--accent)]">The new workspace is still in preparation.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)] md:text-base md:leading-8">
            The new REVORY is being built for AI SaaS founders. For now, you can explore a fictional example of its evidence-based read. Customer-data scans, source connections and purchases for the new product are not available here yet.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rev-button-primary" href="/ai-integrity/demo">Explore the synthetic demo ↗</Link>
            <Link className="rev-button-secondary" href="/ai-integrity/preview-policy">See preview scope</Link>
          </div>
          <p className="mt-6 text-xs leading-6 text-[color:var(--text-subtle)]">Please do not upload real financial, personal or confidential data for this preview.</p>
        </div>
      </section>
    </main>
  );
}
