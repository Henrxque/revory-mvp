# Real Runtime Validation Review

## Best bounded smoke point
The safest end-to-end smoke point was the same bounded structured-output path used by REVORY Seller for intent classification. It is narrow, schema-locked, cheap, and already aligned with the product's real runtime contract.

## What was implemented
- Added a dedicated smoke runner in `scripts/smoke-llm-bounded-runtime.mjs`.
- Added `npm run llm:smoke` in `package.json`.
- Removed `reasoning.effort` from the shared Responses API payload in `services/llm/request-bounded-structured-output.ts` because `gpt-4o-mini` rejected that parameter in real runtime.

## Real smoke execution
Command used:

```bash
npm run llm:smoke
```

Observed successful result:

```json
{
  "apiKeyPresent": true,
  "latencyMs": 1706,
  "model": "gpt-4o-mini",
  "ok": true,
  "parsed": {
    "confidenceBand": "high",
    "intent": "START_BOOKED_PROOF",
    "objection": "PROOF_NOT_VISIBLE",
    "rationale": "The booked proof is not visible, which is crucial for proceeding with the booking."
  },
  "providerReached": true,
  "responseId": "resp_0bb731120d4e323a0169cef5dd66ec81a183e8b8d6f9327862",
  "status": 200,
  "usage": {
    "input_tokens": 347,
    "output_tokens": 43,
    "total_tokens": 390
  }
}
```

## Objective evidence of real billable usage
- HTTP status `200`
- OpenAI `responseId` present
- `usage.input_tokens`, `usage.output_tokens`, and `usage.total_tokens` returned by the provider
- Parsed structured output matched the bounded REVORY contract

This is sufficient evidence that the request executed against the real provider and consumed tokens.

## Important runtime finding
The first real smoke attempt failed before the fix because the shared payload still sent `reasoning.effort`, which `gpt-4o-mini` does not support. That was corrected in the shared runtime layer, and the next smoke passed with the same bounded use case.

## Validation
- `npm run llm:smoke` ?
- `npm run lint` ?
- `npm run typecheck` ?
- `npm run build` ?

## Verdict
**Approved.** REVORY Seller now has verified real bounded LLM runtime with successful provider response, token usage evidence, and a corrected shared payload compatible with `gpt-4o-mini`.
