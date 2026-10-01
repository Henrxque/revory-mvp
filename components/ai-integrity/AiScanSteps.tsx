import Link from "next/link";
export function AiScanSteps({ current }: { current: "sources" | "identity" | "scan" }) {
  return <nav aria-label="Prepare your scan" className="rev-shell-panel grid grid-cols-3 gap-2 rounded-[22px] p-3 text-xs">{[
    ["sources", "1 · Import sources", "/app/ai-integrity/imports"], ["identity", "2 · Review identity", "/app/ai-integrity/attribution"], ["scan", "3 · Run & review", "/app/ai-integrity/scans"],
  ].map(([key, label, href]) => <Link key={key} href={href} aria-current={key === current ? "step" : undefined} className={`rounded-xl px-3 py-3 text-center leading-5 ${key === current ? "bg-[color:var(--background-card)] font-semibold text-[color:var(--accent)]" : "text-[color:var(--text-muted)]"}`}>{label}</Link>)}</nav>;
}
