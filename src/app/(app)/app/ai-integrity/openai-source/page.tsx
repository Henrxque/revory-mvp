import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { isOpenAiControlledSourceEnabled, listOpenAiSources } from "@/services/ai-integrity/openai-source";
import { AiOpenAiSourcePanel } from "@/components/ai-integrity/AiOpenAiSourcePanel";

export default async function OpenAiSourcePage() {
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/app/ai-integrity/openai-source"));
  if (!isOpenAiControlledSourceEnabled(context.workspace.id)) notFound();
  const [connection] = await listOpenAiSources(context.workspace.id);
  return <div className="min-w-0 space-y-6">
    <section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-8">
      <p className="rev-kicker">Sources · Controlled OpenAI read</p>
      <h1 className="rev-display-hero mt-3 max-w-[48rem]">Inspect usage and costs with their limits.</h1>
      <p className="mt-4 max-w-[50rem] text-sm leading-7 text-[color:var(--text-muted)]">Read only the authorized OpenAI organization, for a closed UTC period. Completions usage and reported costs are separate evidence. No internal customer is inferred from a project or model.</p>
      <p className="mt-3 text-xs leading-6 text-[color:var(--text-subtle)]">Local controlled test only. No scan, billing action or customer analysis starts here. An empty API response means no activity was reported for this scope and period; it does not prove zero total AI spend.</p>
      <Link href="/app/ai-integrity/imports" className="mt-4 inline-block text-xs font-semibold text-[color:var(--accent)]">Return to reviewed imports</Link>
    </section>
    <AiOpenAiSourcePanel organizationId={process.env.REVORY_AI_OPENAI_ORG_ID ?? ""} connection={connection ? { id: connection.id, status: connection.status, generation: connection.generation, consentStart: connection.consentStart?.toISOString() ?? null, consentEnd: connection.consentEnd?.toISOString() ?? null, completeThrough: connection.completeThrough?.toISOString() ?? null, syncs: connection.syncs.map((sync) => ({ id: sync.id, status: sync.status, effectiveStart: sync.effectiveStart?.toISOString() ?? null, windowStart: sync.windowStart.toISOString(), windowEnd: sync.windowEnd.toISOString(), activity: sync.artifactJson && typeof sync.artifactJson === "object" && !Array.isArray(sync.artifactJson) && "activity" in sync.artifactJson ? String(sync.artifactJson.activity) : null })) } : null} />
  </div>;
}
