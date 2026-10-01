import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { isAiSourceRehearsalEnabled, listAiSourceRehearsals } from "@/services/ai-integrity/connected-sources";
import { AiSourceRehearsalPanel } from "@/components/ai-integrity/AiSourceRehearsalPanel";

export default async function AiSourcesPage() {
  if (!isAiSourceRehearsalEnabled()) notFound();
  const context = await getAppContext(); if (!context) redirect(buildSignInRedirectPath("/app/ai-integrity/sources"));
  const connections = await listAiSourceRehearsals(context.workspace.id);
  return <div className="min-w-0 space-y-6"><section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-8"><p className="rev-kicker">Sources · Synthetic rehearsal</p><h1 className="rev-display-hero mt-3 max-w-[48rem]">Prepare source reads. Preserve their limits.</h1><p className="mt-4 max-w-[50rem] text-sm leading-7 text-[color:var(--text-muted)]">Explore consent, closed periods, incremental coverage and source evidence with synthetic Stripe and OpenAI accounts. Your internal ledger still comes from a reviewed CSV or XLSX.</p><p className="mt-3 text-xs leading-6 text-[color:var(--text-subtle)]">Real accounts are unavailable in this preview. No API keys are collected. Reads do not run a scan, change billing or grant a purchase. Live connection permissions and real-data gates are still pending.</p><Link href="/app/ai-integrity/imports" className="mt-4 inline-block text-xs font-semibold text-[color:var(--accent)]">Return to reviewed source imports →</Link></section><AiSourceRehearsalPanel connections={connections.map((connection) => ({ id: connection.id, provider: connection.provider, status: connection.status, generation: connection.generation, completeThrough: connection.completeThrough?.toISOString() ?? null, syncs: connection.syncs.map((sync) => ({ id: sync.id, status: sync.status, windowStart: sync.windowStart.toISOString(), windowEnd: sync.windowEnd.toISOString(), effectiveStart: sync.effectiveStart?.toISOString() ?? null })) }))} /></div>;
}
