import { isAiCommercialRuntimeEnabled } from "@/services/ai-integrity/commercial-runtime";
import { isAiConnectedReportsEnabled } from "@/services/ai-integrity/connected-report-access";
import { notFound, redirect } from "next/navigation";
import { getAppContext } from "@/services/app/get-app-context";
import { buildSignInRedirectPath } from "@/services/auth/redirects";
import { getAiCustomerSourceSuggestedPeriod, isAiCustomerSourcesEnabled, listAiCustomerSources } from "@/services/ai-integrity/customer-sources";
import { AiCustomerConnections } from "@/components/ai-integrity/AiCustomerConnections";

export default async function CustomerConnectionsPage() {
  if (!isAiCustomerSourcesEnabled()) notFound();
  const context = await getAppContext();
  if (!context) redirect(buildSignInRedirectPath("/app/ai-integrity/connections"));
  if (context.workspace.ownerUserId !== context.user.id) notFound();
  const connections = await listAiCustomerSources(context.workspace.id, context.user.id);
  const suggestedPeriod = getAiCustomerSourceSuggestedPeriod();
  const commercial = isAiCommercialRuntimeEnabled();
  return <div className="space-y-6"><section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-8"><p className="rev-kicker">{commercial ? "Read-only source connections" : "Development connector preview"}</p><h1 className="rev-display-hero mt-4">Connect data to this workspace.</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--text-muted)]">{commercial ? "Connect the supported Stripe account and OpenAI organization for your company. Reads require paid access and explicit consent. Prepare a closed period, review your internal ledger and customer links, then authorize recurring monitoring." : "Save separate read-only source credentials for your company and review a closed period. Local source reads require a confirmed test scan purchase or paid monitoring test subscription. Prepare completed API reads and add your internal usage file for the same period."}</p></section><AiCustomerConnections commercial={commercial} stripeMode={commercial && process.env.REVORY_AI_CUSTOMER_STRIPE_MODE === "live" ? "live" : "test"} connectedReports={isAiConnectedReportsEnabled()} suggestedPeriod={suggestedPeriod} connections={connections.map((connection) => ({ id: connection.id, provider: connection.provider, status: connection.status, organizationId: connection.organizationId, consentStart: connection.consentStart?.toISOString() ?? null, consentEnd: connection.consentEnd?.toISOString() ?? null, completeThrough: connection.completeThrough?.toISOString() ?? null, syncs: connection.syncs.map((sync) => ({ id: sync.id, status: sync.status, windowStart: sync.windowStart.toISOString(), windowEnd: sync.windowEnd.toISOString(), batchId: sync.promotions[0]?.batchId ?? null, activity: sync.activity, eligible: sync.generation === connection.generation })) }))} /></div>;
}
