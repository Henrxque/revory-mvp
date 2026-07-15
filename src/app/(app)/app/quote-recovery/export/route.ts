import { prisma } from "@/db/prisma";
import { summarizeQuoteRecoveryFinancialExposure } from "@/domain/revory/quote-recovery-financial-summary";
import { getAppContext } from "@/services/app/get-app-context";
import { getCapabilityAccess } from "@/services/billing/capabilities";
import { getQuoteRecoveryRead } from "@/services/quote-recovery/read-model";

function safe(value: unknown) {
  const text = String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ");
  const guarded = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${guarded.replaceAll('"', '""')}"`;
}

export async function GET() {
  const context = await getAppContext();
  if (!context) return new Response("Unauthorized", { status: 401 });
  if (!(await getCapabilityAccess(context.workspace.id, "QUOTE_RECOVERY")).allowed) {
    return new Response("Forbidden", { status: 403 });
  }

  const read = await getQuoteRecoveryRead(context.workspace.id);
  const financialSummary = summarizeQuoteRecoveryFinancialExposure(
    read.findings,
    read.summary.reportingCurrency,
  );
  const headers = [
    "finding_type",
    "estimate_external_id",
    "status",
    "severity",
    "confidence",
    "value_basis",
    "value_cents",
    "currency",
    "counted_in_estimated_total",
    "estimated_total_contribution_cents",
    "reason",
    "recommended_action",
  ];
  const rows = read.findings.map((finding, index) => {
    const annotation = financialSummary.annotations[index];
    return [
      finding.findingType,
      finding.estimateExternalId,
      finding.status,
      finding.severity,
      finding.confidence,
      finding.valueBasis,
      finding.valueCents ?? "",
      finding.currency,
      annotation.countedInEstimatedTotal,
      annotation.estimatedTotalContributionCents ?? "",
      finding.reason,
      finding.recommendedAction,
    ].map(safe).join(",");
  });

  await prisma.workspaceAuditEvent.create({
    data: {
      workspaceId: context.workspace.id,
      actorUserId: context.user.id,
      action: "QUOTE_RECOVERY_CSV_EXPORTED",
      metadataJson: {
        estimatedValueCents: financialSummary.estimatedValueCents,
        financialEstimateCount: financialSummary.financialCount,
        findingCount: read.findings.length,
        hasConflictingEstimateValues: financialSummary.hasConflictingEstimateValues,
        hasMixedCurrencies: financialSummary.hasMixedCurrencies,
      },
    },
  });

  return new Response([headers.join(","), ...rows].join("\r\n"), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="revory-quote-recovery-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
