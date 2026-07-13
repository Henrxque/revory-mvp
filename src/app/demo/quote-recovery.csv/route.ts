import { quoteRecoverySample } from "@/services/demo/quote-recovery-sample";

function csvCell(value: string | number | null) {
  const safe = value === null ? "" : String(value);
  const escaped = /^[=+\-@]/.test(safe) ? `'${safe}` : safe;
  return `"${escaped.replaceAll('"', '""')}"`;
}

export function GET() {
  const rows = [
    ["estimate_external_id", "type", "confidence", "value_basis", "value_cents", "reason", "recommended_action"],
    ...quoteRecoverySample.opportunities.map((opportunity) => [
      opportunity.estimateExternalId,
      opportunity.type,
      opportunity.confidence,
      opportunity.valueBasis,
      opportunity.valueCents,
      opportunity.reason,
      opportunity.recommendedAction,
    ]),
  ];
  return new Response(rows.map((row) => row.map(csvCell).join(",")).join("\r\n"), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": 'attachment; filename="revory-sample-quote-recovery.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
