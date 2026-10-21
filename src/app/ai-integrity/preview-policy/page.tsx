import type { Metadata } from "next";
import Link from "next/link";

import { PublicPreviewFooter, PublicPreviewNav } from "@/components/ai-integrity-public/PublicPreview";

export const metadata: Metadata = {
  title: "REVORY — Public preview scope",
  description: "What the public AI SaaS presentation does and does not offer today.",
  robots: { index: false, follow: false },
};

export default function AiIntegrityPreviewPolicyPage() {
  return <main className="min-h-screen bg-[color:var(--background)] [font-family:var(--font-dm-sans)]"><PublicPreviewNav /><article className="mx-auto max-w-3xl space-y-7 px-5 py-14 md:px-8"><header><p className="rev-kicker">Public presentation · synthetic data</p><h1 className="mt-5 text-5xl font-normal [font-family:var(--font-instrument-serif)]">What this preview offers.</h1><p className="mt-5 text-sm leading-8 text-[color:var(--text-muted)]">The new REVORY product is in development. These public pages explain its intended direction and show a fictional example. They do not provide a customer workspace for the new product.</p></header><section className="rev-shell-panel rounded-[26px] p-6"><h2 className="text-lg font-bold">Available now</h2><p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">A read-only, static synthetic demo of a provider cost attribution gap and a comparable usage difference. You can open it without an account. Nothing entered here is uploaded or analyzed.</p><Link className="mt-4 inline-block text-xs font-semibold text-[color:var(--accent)]" href="/ai-integrity/demo">Explore the synthetic demo →</Link></section><section className="rev-shell-panel rounded-[26px] p-6"><h2 className="text-lg font-bold">Not available in this preview</h2><p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">Customer-data scans, Stripe/OpenAI account connections, checkout, monitoring subscriptions, financial margin calculations and support for a paid AI SaaS pilot have not passed their release gates. Do not send real financial, personal or confidential records for this preview. No price or delivery date is being offered here.</p></section><section className="rev-shell-panel rounded-[26px] p-6"><h2 className="text-lg font-bold">Existing REVORY customers</h2><p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">The existing Quote Recovery workspace and its account flows remain available to current customers. This public presentation does not replace those customer records, purchases or terms.</p><Link className="mt-4 inline-block text-xs font-semibold text-[color:var(--accent)]" href="/sign-in">Existing customer sign in →</Link></section></article><PublicPreviewFooter /></main>;
}
