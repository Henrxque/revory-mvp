import "server-only";
import { assertAiSourceRead, type AiSourceTransport } from "@/domain/ai-integrity/connected-sources";

// Fixed synthetic accounts. No fetch, SDK client, API key or external connection.
export const aiSourceFixtureTransport: AiSourceTransport = async (read) => {
  assertAiSourceRead(read);
  const start = Number(read.query.start_time ?? read.query["created[gte]"]), end = Number(read.query.end_time ?? read.query["created[lt]"]);
  if (read.path === "/v1/invoices") {
    const offset = read.query.starting_after ? 1 : 0;
    return { object: "list", has_more: offset === 0, data: [{ object: "invoice", id: `in_rehearsal_${start}_${offset}`, created: start + 3600 + offset, status: "paid", livemode: false, customer: `cus_rehearsal_${offset}`, amount_paid: 9900, currency: "usd", customer_email: "excluded@example.invalid" }] };
  }
  const offset = read.query.page ? 1 : 0;
  const project = offset === 0 ? "proj_rehearsal" : null;
  const data = Array.from({ length: (end - start) / 86400 }, (_, day) => ({ object: "bucket", start_time: start + day * 86400, end_time: start + (day + 1) * 86400,
    results: [read.path.endsWith("costs") ? { object: "organization.costs.result", project_id: project, line_item: null, amount: { value: offset === 0 ? 12.5 : 3.25, currency: "usd" } }
      : { object: "organization.usage.completions.result", project_id: project, model: "gpt-fixture", input_tokens: 1000, input_cached_tokens: 250, output_tokens: 200, num_model_requests: 10 }] }));
  return { object: "page", has_more: offset === 0, next_page: offset === 0 ? "rehearsal_page_2" : null, data };
};
