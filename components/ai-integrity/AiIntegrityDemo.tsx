import Link from "next/link";
import { aiIntegrityDemoResult } from "@/domain/ai-integrity/demo";
import { AiIntegrityReport } from "./AiIntegrityReport";
import { AiMarketingFooter, AiMarketingNav } from "./AiMarketing";

export function AiIntegrityDemo() {
  return <main className="ai-integrity-experience min-h-screen bg-[color:var(--background)]"><AiMarketingNav /><div className="mx-auto max-w-[1240px] space-y-6 px-5 py-10 [font-family:var(--font-sora)] md:px-8"><div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[color:var(--border-accent)] px-5 py-4"><p className="max-w-3xl text-xs leading-6 text-[color:var(--text-muted)]">Every record is synthetic. This read-only example runs through the deterministic scan rules and shows their actual output.</p><Link className="text-xs font-semibold text-[color:var(--accent)]" href="/start">Prepare your test scan →</Link></div><AiIntegrityReport result={aiIntegrityDemoResult()} demo /></div><AiMarketingFooter /></main>;
}
