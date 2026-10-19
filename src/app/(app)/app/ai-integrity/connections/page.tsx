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
  return <div className="space-y-6"><section className="rev-shell-hero rev-accent-mist rounded-[30px] p-6 md:p-8"><p className="rev-kicker">Development connector preview</p><h1 className="rev-display-hero mt-4">Connect data to this workspace.</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--text-muted)]">Save separate read-only source credentials for your company and review a closed period. Source reads require an unused confirmed test purchase. This preview supports Stripe test accounts and authorized OpenAI Usage/Costs reads; commercial checkout remains disabled. When connected report preparation is enabled, use each completed read in your report and add only the internal usage file.</p></section><AiCustomerConnections connectedReports={isAiConnectedReportsEnabled()} suggestedPeriod={suggestedPeriod} connections={connections.map((connection) => ({ id: connection.id, provider: connection.provider, status: connection.status, organizationId: connection.organizationId, consentStart: connection.consentStart?.toISOString() ?? null, consentEnd: connection.consentEnd?.toISOString() ?? null, completeThrough: connection.completeThrough?.toISOString() ?? null, syncs: connection.syncs.map((sync) => ({ id: sync.id, status: sync.status, windowStart: sync.windowStart.toISOString(), windowEnd: sync.windowEnd.toISOString(), batchId: sync.promotions[0]?.batchId ?? null, activity: sync.activity, eligible: sync.generation === connection.generation })) }))} /></div>;
}
