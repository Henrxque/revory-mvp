import Link from "next/link";
import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { AuthSignOutButton } from "@/components/auth/AuthSignOutButton";
import { AiAppNav } from "./AiAppNav";
import { isAiSourceRehearsalEnabled } from "@/services/ai-integrity/connected-sources";
import { isAiMonitorRehearsalEnabled } from "@/services/ai-integrity/monitoring";
import { isAiIntegrityRemoteSyntheticPreviewEnabled } from "@/services/ai-integrity/experience";

export function AiAppShell({ children, workspaceName, email }: { children: React.ReactNode; workspaceName: string; email: string }) {
  const remote = isAiIntegrityRemoteSyntheticPreviewEnabled();
  return <main className="ai-integrity-experience min-h-screen bg-[color:var(--background)] p-3 [font-family:var(--font-sora)] md:p-5"><div className="mx-auto grid max-w-[1480px] gap-5 lg:grid-cols-[224px_minmax(0,1fr)]">
    <aside className="rev-shell-panel rounded-[28px] p-4 lg:sticky lg:top-5 lg:flex lg:h-[calc(100vh-40px)] lg:flex-col"><Link href="/app/ai-integrity/dashboard" className="mb-5 inline-block"><RevoryLogo compact /></Link><p className="mb-5 text-[9px] uppercase tracking-[0.2em] text-[color:var(--text-subtle)]">AI spend · Evidence · Integrity</p><AiAppNav sourceRehearsal={isAiSourceRehearsalEnabled()} monitorRehearsal={isAiMonitorRehearsalEnabled()} /><div className="mt-5 border-t border-[color:var(--border)] pt-4 lg:mt-auto"><Link className="text-xs text-[color:var(--accent)]" href="/start">{remote ? "Rehearsal access ↗" : "Scan purchases ↗"}</Link><Link className="ml-5 text-xs text-[color:var(--text-muted)] lg:ml-0 lg:mt-4 lg:block" href="/demo">Synthetic demo</Link><p className="mt-5 text-[10px] leading-5 text-[color:var(--text-subtle)]">Development preview<br />Synthetic evidence only</p></div></aside>
    <div className="min-w-0 space-y-5"><header className="rev-shell-panel flex flex-wrap items-center justify-between gap-4 rounded-[24px] px-5 py-4"><div className="min-w-0"><p className="truncate text-sm font-semibold">{workspaceName}</p><p className="mt-1 text-[10px] text-[color:var(--text-subtle)]">{remote ? "Integrity workspace · Fictional data only" : "Integrity workspace · One-time test scans"}</p></div><div className="flex min-w-0 items-center gap-4"><span className="max-w-44 truncate text-[10px] text-[color:var(--text-muted)]">{email}</span><AuthSignOutButton className="text-xs text-[color:var(--text-muted)]" /></div></header>{children}</div>
  </div></main>;
}
