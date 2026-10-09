import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/db/prisma";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { aiScanCheckoutDriver } from "@/services/ai-integrity/purchase";
import { isAiIntegrityRemoteSyntheticPreviewEnabled } from "@/services/ai-integrity/experience";
import { AiMarketingFooter, AiMarketingNav } from "./AiMarketing";
import { AiScanPurchasePanel } from "./AiScanPurchasePanel";

export async function AiIntegrityStart({ searchParams }: { searchParams: Promise<{ order?: string; checkout?: string }> }) {
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/start"));
  const params = await searchParams;
  const remoteSyntheticPreview = isAiIntegrityRemoteSyntheticPreviewEnabled();
  const [available, order] = await Promise.all([
    prisma.aiIntegrityScanGrant.count({ where: { workspaceId: context.workspace.id, status: "ACTIVE", consumedAt: null, order: { status: "PAID" } } }),
    params.order ? prisma.aiIntegrityScanOrder.findFirst({ where: { id: params.order, workspaceId: context.workspace.id }, select: { id: true, status: true } }) : null,
  ]);
  return <main className="ai-integrity-experience min-h-screen [font-family:var(--font-dm-sans)]"><AiMarketingNav /><div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-14 md:px-8 lg:grid-cols-[1.1fr_1fr]">
    <div><p className="rev-kicker">A clear first step · Test preview</p><h1 className="mt-5 [font-family:var(--font-instrument-serif)] text-5xl font-normal leading-[1.05] md:text-6xl">One period.<br />Three sources.<br /><span className="text-[color:var(--accent)]">An evidence-led read.</span></h1><p className="mt-6 max-w-lg text-sm leading-8 text-[color:var(--text-muted)]">{remoteSyntheticPreview ? "This protected rehearsal uses only the three bundled fictional CSV files. No customer data or payment is accepted." : "Check that you can export these sources for the same closed period. After a confirmed test purchase, prepare your evidence at your own pace."}</p><div className="mt-8 space-y-4">{[["Stripe revenue", "Charges or billing records with exact IDs, status, timestamps and currency. This scan retains them as context."], ["Internal usage ledger", "Customer ID, provider/project, model, quantity, unit and timestamp. Required to justify attribution and compare usage."], ["Provider usage & cost", "Provider buckets with project/model, period, usage units and reported costs where available."]].map(([label, copy], index) => <div key={label} className="flex gap-4 border-t border-[color:var(--border)] pt-4"><span className="text-xs text-[color:var(--accent)]">0{index + 1}</span><div><h2 className="text-sm font-bold">{label}</h2><p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">{copy}</p></div></div>)}</div><p className="mt-6 text-xs leading-6 text-[color:var(--text-subtle)]">Need an example first? <Link className="text-[color:var(--accent)]" href="/demo">Explore the synthetic report →</Link></p></div>
    <section className="rev-shell-panel h-fit rounded-[30px] p-6 md:p-8"><p className="rev-kicker">{remoteSyntheticPreview ? "Integrity Scan · Protected rehearsal" : "Integrity Scan · One-time test offer"}</p>{remoteSyntheticPreview ? <p className="mt-5 text-sm leading-7 text-[color:var(--text-muted)]">Synthetic access is prepared for this workspace. No checkout or customer upload is available here.</p> : <><div className="mt-5 flex items-baseline gap-3"><p className="text-5xl font-semibold tracking-[-0.05em]">$99</p><span className="text-sm text-[color:var(--text-muted)]">USD · once</span></div><p className="mt-3 text-xs leading-6 text-[color:var(--text-muted)]">One immutable report for one closed period, with attribution coverage, comparable usage differences and JSON/CSV exports. A failed attempt keeps the scan available.</p><p className="mt-3 text-[11px] leading-6 text-[color:var(--text-subtle)]">Price hypothesis under evaluation. Monitoring and margin calculations are future scope.</p></>}
      {available ? <div className="my-5 rounded-2xl border border-[color:var(--border-accent)] p-4"><p className="text-sm">{available} test scan{available > 1 ? "s" : ""} available</p><Link className="mt-3 inline-block text-xs font-semibold text-[color:var(--accent)]" href="/app/ai-integrity/dashboard">Continue to evidence preparation →</Link></div> : null}
      {params.checkout === "canceled" ? <p role="status" className="my-5 text-xs leading-6 text-[color:var(--text-muted)]">Checkout was left before confirmation. Your workspace is saved; no scan capacity was granted from this return.</p> : null}
      {!remoteSyntheticPreview ? <div className="mt-6"><AiScanPurchasePanel driver={aiScanCheckoutDriver()} order={order} /></div> : null}
    </section>
  </div><AiMarketingFooter /></main>;
}
