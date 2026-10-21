import { isAiCommercialRuntimeEnabled } from "@/services/ai-integrity/commercial-runtime";
import { isAiConnectedReportsEnabled } from "@/services/ai-integrity/connected-report-access";
import { recurringEnabled } from "@/services/ai-integrity/recurring-access";
import Link from "next/link";
import { RevoryLogo } from "@/components/brand/RevoryLogo";
import { AuthSignOutButton } from "@/components/auth/AuthSignOutButton";
import { AiAppNav } from "./AiAppNav";
import { isAiSourceRehearsalEnabled } from "@/services/ai-integrity/connected-sources";
import { isAiMonitorRehearsalEnabled } from "@/services/ai-integrity/monitoring";
import { isAiIntegrityRemoteSyntheticPreviewEnabled } from "@/services/ai-integrity/experience";
import { isOpenAiControlledSourceEnabled } from "@/services/ai-integrity/openai-source";
import { isAiCustomerSourcesEnabled } from "@/services/ai-integrity/customer-sources";

export function AiAppShell({ children, workspaceId, workspaceName, email }: { children: React.ReactNode; workspaceId: string; workspaceName: string; email: string }) {
  const commercial = isAiCommercialRuntimeEnabled();
  const monitoring = recurringEnabled();
  const remote = isAiIntegrityRemoteSyntheticPreviewEnabled();
  const controlledOpenAi = isOpenAiControlledSourceEnabled(workspaceId);
  const navProps = { recurringMonitor: recurringEnabled(), sourceRehearsal: isAiSourceRehearsalEnabled(), controlledOpenAi, monitorRehearsal: isAiMonitorRehearsalEnabled(), customerSources: isAiCustomerSourcesEnabled() };
  return <main className="ai-integrity-experience min-h-screen bg-[color:var(--background)] p-3 [font-family:var(--font-sora)] md:p-5"><div className="mx-auto grid max-w-[1480px] gap-5 lg:grid-cols-[224px_minmax(0,1fr)]">
    <aside className="rev-shell-panel relative rounded-[28px] p-4 lg:sticky lg:top-5 lg:flex lg:h-[calc(100vh-40px)] lg:flex-col"><div className="flex items-center justify-between gap-3 lg:block"><Link href="/app/ai-integrity/dashboard" className="inline-block lg:mb-5"><RevoryLogo compact /></Link><details className="lg:hidden"><summary className="cursor-pointer rounded-xl border border-[color:var(--border)] px-4 py-3 text-sm font-semibold">Menu</summary><div className="rev-shell-panel absolute inset-x-0 top-full z-30 mt-2 rounded-[24px] p-4"><AiAppNav {...navProps} /><div className="mt-4 flex gap-5 border-t border-[color:var(--border)] pt-4 text-sm"><Link href={monitoring ? "/app/ai-integrity/monitoring" : "/start"} className="text-[color:var(--accent)]">{monitoring ? "Subscription & monitoring" : remote ? "Test access" : "Scan purchases"}</Link><Link href="/demo">Example report</Link></div></div></details></div><p className="mb-5 hidden text-[9px] uppercase tracking-[0.2em] text-[color:var(--text-subtle)] lg:block">AI spend · Evidence · Integrity</p><div className="hidden lg:block"><AiAppNav {...navProps} /></div><div className="mt-5 hidden border-t border-[color:var(--border)] pt-4 lg:mt-auto lg:block"><Link className="text-xs text-[color:var(--accent)]" href={monitoring ? "/app/ai-integrity/monitoring" : "/start"}>{monitoring ? "Subscription & monitoring" : remote ? "Test access" : "Scan purchases"}</Link><Link className="mt-4 block text-xs text-[color:var(--text-muted)]" href="/demo">Example report</Link><p className="mt-5 text-[10px] leading-5 text-[color:var(--text-subtle)]">{commercial ? "Read-only monitoring" : "Development preview"}<br />{commercial ? "Authorized connected sources" : isAiConnectedReportsEnabled() ? "Connected source reports - Local testing" : navProps.customerSources ? "Source connections · Synthetic scans" : controlledOpenAi ? "Controlled OpenAI source" : "Synthetic evidence only"}</p></div></aside>
    <div className="min-w-0 space-y-5"><header className="rev-shell-panel flex flex-wrap items-center justify-between gap-4 rounded-[24px] px-5 py-4"><div className="min-w-0"><p className="truncate text-sm font-semibold">{workspaceName}</p><p className="mt-1 text-[10px] text-[color:var(--text-subtle)]">{commercial ? "Integrity workspace · Monitoring" : remote ? "Integrity workspace · Fictional data only" : navProps.customerSources ? "Integrity workspace · Connector testing" : controlledOpenAi ? "Integrity workspace · Controlled OpenAI read" : "Integrity workspace · One-time test scans"}</p></div><div className="flex min-w-0 items-center gap-4"><span className="max-w-44 truncate text-[10px] text-[color:var(--text-muted)]">{email}</span><AuthSignOutButton className="text-xs text-[color:var(--text-muted)]" /></div></header>{children}</div>
  </div></main>;
}
