import { redirect } from "next/navigation";

import { getAppContext } from "@/services/app/get-app-context";
import { isInternalMigrationPreviewEnabled } from "@/services/app/internal-preview";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getWorkspaceLaunchEvidence } from "@/services/evidence/launch-evidence";

export default async function LaunchEvidencePage() {
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/app/launch-evidence"));
  if (!isInternalMigrationPreviewEnabled()) redirect("/app/settings");
  const read = await getWorkspaceLaunchEvidence(context.workspace.id);
  return <div className="space-y-6"><section className="rev-shell-hero rev-accent-mist rounded-[30px] p-7"><p className="rev-kicker">Sprint 12 · internal evidence</p><h1 className="rev-display-hero mt-3">Make each price earn its own decision.</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--text-muted)]">No customer validation has been inferred. Missing samples produce DELAY, never a silent RETAIN or automatic price reduction.</p></section><section className="grid gap-4 md:grid-cols-2">{read.decisions.map((item)=><article className="rev-card-premium rounded-[22px] p-5" key={item.offerKey}><p className="rev-label">{item.offerKey.replaceAll("_", " ")}</p><div className="mt-3 flex items-center justify-between gap-4"><h2 className="text-2xl font-bold">{item.decision}</h2><span className="rounded-full border border-[color:var(--border-accent)] px-3 py-1 text-xs">{item.evidenceCount} observations</span></div><p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">{item.reason}</p></article>)}</section><section className="rev-shell-panel rounded-[24px] p-5"><p className="rev-kicker">Captured measurements</p><h2 className="mt-2 text-xl font-bold">{read.events.length} workspace-scoped evidence events</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{read.events.slice(0,20).map((event)=><div className="rounded-xl border border-[color:var(--border)] p-3 text-xs" key={event.id}><b>{event.metric.replaceAll("_", " ")}</b><p className="mt-1 text-[color:var(--text-subtle)]">{event.source} · {event.observedAt.toLocaleDateString("en-US")} · {event.offerKey?.replaceAll("_", " ") ?? "unassigned"}</p></div>)}</div></section></div>;
}
