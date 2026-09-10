export function summarizeDigestResults(results: ReadonlyArray<{ sent: boolean; reason?: string | null }>) {
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const result of results) {
    if (result.sent) sent += 1;
    else if (result.reason === "GROWTH_ENTITLEMENT_REQUIRED" || result.reason === "DIGEST_DISABLED") skipped += 1;
    else failed += 1;
  }
  return { sent, skipped, failed };
}
