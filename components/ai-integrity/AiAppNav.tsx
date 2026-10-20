"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AiAppNav({ sourceRehearsal = false, controlledOpenAi = false, monitorRehearsal = false, customerSources = false, recurringMonitor = false }: { sourceRehearsal?: boolean; controlledOpenAi?: boolean; monitorRehearsal?: boolean; customerSources?: boolean; recurringMonitor?: boolean }) {
  const path = usePathname();
  const links = [["/app/ai-integrity/dashboard", "Home & reports", "01"], ["/app/ai-integrity/imports", "Add your data", "02"],
    ["/app/ai-integrity/attribution", "Link customers", "03"], ...(!recurringMonitor ? [["/app/ai-integrity/scans", "Create a report", "04"]] : []), ...(customerSources ? [["/app/ai-integrity/connections", "Connect sources", "05"]] : []), ...(sourceRehearsal ? [["/app/ai-integrity/sources", "Source rehearsal", "05"]] : []), ...(controlledOpenAi ? [["/app/ai-integrity/openai-source", "OpenAI source", "05"]] : []), ...(recurringMonitor ? [["/app/ai-integrity/monitoring", "Monitoring", "06"]] : monitorRehearsal ? [["/app/ai-integrity/monitoring", "Monitoring rehearsal", "06"]] : [])];
  return <nav aria-label="Integrity workspace" className="grid grid-cols-2 gap-2 lg:grid-cols-1">{links.map(([href, label, number]) => {
    const active = path === href || (href.endsWith("dashboard") && path.includes("/reports/"));
    return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-3 text-xs font-medium transition-colors ${active ? "border-[color:var(--border-accent)] bg-[color:var(--background-card)] text-[color:var(--accent)]" : "border-transparent text-[color:var(--text-muted)] hover:bg-[color:var(--background-card)]"}`}><span className="text-[10px] opacity-60">{number}</span>{label}</Link>;
  })}</nav>;
}
