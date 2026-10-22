import Link from "next/link";
import { aiIntegrityDemoResult } from "@/domain/ai-integrity/demo";
import { aiAmount, aiMoney } from "./report-copy";

// Marketing uses the same deterministic, explicitly fictional result as /demo.
export function AiLandingEvidence() {
  const result = aiIntegrityDemoResult();
  const coverage = result.coverage.groups[0];
  const finding = result.findings.find(item => item.findingType === "LEDGER_PROVIDER_USAGE_MISMATCH")!;
  const evidence = finding.evidence;
  const coveragePercent = (coverage.coverageBps! / 100).toFixed(2);
  return <figure className="rev-sample-read relative min-w-0 rounded-[28px] p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--border)] pb-5">
      <div><p className="text-sm font-bold">Aster AI · Integrity report</p><p className="mt-1.5 text-[11px] text-[color:var(--text-subtle)]">August 2026 · Closed period</p></div>
      <span className="rounded-full border border-[color:var(--border-accent)] bg-[color:var(--success-soft)] px-3 py-1.5 text-[10px] font-semibold text-[color:var(--accent-light)]">Synthetic example</span>
    </div>
    <div className="mt-5 grid grid-cols-3 gap-2 text-[10px] sm:text-[11px]">{[["Stripe", "Billing context"], ["Your product", "Usage ledger"], ["OpenAI", "Usage & cost"]].map(([label, text]) => <div key={label} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--background)]/45 px-2.5 py-3 sm:px-3"><p className="font-bold">{label}</p><p className="mt-1.5 leading-5 text-[color:var(--text-subtle)]">{text}</p></div>)}</div>
    <div className="mt-5 rounded-[20px] border border-[color:var(--border-accent)] bg-[color:var(--success-soft)] p-4 sm:p-5">
      <p className="rev-kicker !text-[9px]">Calculated difference · Usage</p>
      <h2 className="mt-3 text-lg font-bold leading-7">Usage that doesn&apos;t reconcile</h2>
      <dl className="mt-4 space-y-2.5 text-xs">{[["OpenAI reported", String(evidence.providerQuantity)], ["Product recorded", String(evidence.ledgerQuantity)]].map(([label, quantity]) => <div key={label} className="flex flex-wrap justify-between gap-2 text-[color:var(--text-muted)]"><dt>{label}</dt><dd className="font-medium tabular-nums text-[color:var(--foreground)]">{aiAmount(quantity)} tokens</dd></div>)}</dl>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-[color:var(--border-accent)] pt-4"><p className="text-xs text-[color:var(--text-muted)]">Difference to investigate</p><p className="text-xl font-semibold tracking-tight text-[color:var(--accent-light)]">{aiAmount(String(evidence.delta))} <span className="text-xs font-medium">tokens</span></p></div>
      <p className="mt-3 text-[10px] leading-5 text-[color:var(--text-muted)]">Same reviewed project, model, unit and period. No monetary loss is inferred.</p>
    </div>
    <div className="mt-4 rounded-[18px] border border-[color:var(--border)] px-4 py-4">
      <div className="flex items-center justify-between gap-3 text-xs"><p className="text-[color:var(--text-muted)]">Spend linked to a customer</p><p className="font-semibold tabular-nums">{coveragePercent}%</p></div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--brand-surface)]" aria-hidden="true"><div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${coveragePercent}%` }} /></div>
      <p className="mt-3 text-[10px] leading-5 text-[color:var(--text-subtle)]">{aiMoney(coverage.unattributedCost, "USD")} has no confirmed customer link. This is a coverage gap, not proven wasted spend.</p>
    </div>
    <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[10px] leading-5 text-[color:var(--text-subtle)]"><span>Fictional data · Same calculation as the demo</span><Link className="rev-ai-footer-link font-semibold text-[color:var(--accent)]" href="/demo">Inspect this example</Link></figcaption>
  </figure>;
}
