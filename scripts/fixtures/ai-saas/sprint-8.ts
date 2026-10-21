import { sprint4Fixture } from "./sprint-4";

export function sprint8Fixture(day: number, providerQuantity = "120", unattributedCost = "1.25") {
  const input = sprint4Fixture();
  const date = (offset: number) => new Date(Date.UTC(2026, 7, day + offset)).toISOString();
  const start = date(0), end = date(1), exported = date(3);
  input.asOf = date(4);
  input.batches = input.batches.map((b) => ({ ...b, id: `${b.id}_${day}`, windowStart: start, windowEnd: end }));
  const identity = <T extends { id: string; externalId: string; importBatchId: string }>(r: T) => ({ ...r, id: `${r.id}_${day}`, externalId: `${r.externalId}_${day}`, importBatchId: `${r.importBatchId}_${day}` });
  input.sourceReviews = input.batches.map((b) => ({ batchId: b.id, exportedAt: exported, completeThrough: end }));
  input.usage = input.usage.map((r) => ({ ...identity(r), occurredAt: new Date(Date.parse(start) + 3600000).toISOString(), providerRequestId: `request_${day}` }));
  input.revenue = input.revenue.map((r) => ({ ...identity(r), occurredAt: start }));
  input.buckets = input.buckets.map((r, i) => ({ ...identity(r), windowStart: start, windowEnd: end, reportedAt: exported,
    usageQuantity: i === 0 ? providerQuantity : r.usageQuantity, costAmount: i === 1 ? unattributedCost : r.costAmount }));
  input.mappings = input.mappings.map((r) => ({ ...r, id: `${r.id}_${day}`, validFrom: start, validUntil: end, provenanceJson: {} }));
  input.knownUsage = input.usage; input.knownBuckets = input.buckets;
  return input;
}
