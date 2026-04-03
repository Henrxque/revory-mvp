# Fallback And Structured Output QA Review

## Files altered
- `services/llm/get-llm-runtime-status.ts`
- `scripts/check-llm-env.mjs`
- `scripts/smoke-llm-bounded-runtime.mjs`
- `scripts/qa-llm-fallback-structured-output.mjs`
- `.env.example`
- `.env.local`
- `package.json`

## What was validated
- Happy path with real structured output from the provider
- Timeout behavior
- Retry behavior on provider failure
- Invalid JSON handling
- Schema mismatch handling
- Deterministic fallback continuity at the product-read level

## Hardening applied
- Removed the unsupported `reasoning.effort` parameter from the shared Responses payload earlier in Sprint 08 validation.
- Increased the bounded runtime timeout default from `2500ms` to `4000ms` after QA exposed that `2500ms` was too brittle for repeated real calls.
- Added a dedicated QA harness with one real bounded scenario and controlled failure simulations.

## QA results

### Runtime configuration used
```json
{
  "apiKeyPresent": true,
  "model": "gpt-4o-mini",
  "timeoutMs": 4000
}
```

### Happy path
```json
{
  "attempts": 1,
  "latencyMs": 1620,
  "ok": true,
  "responseId": "resp_0c2167c956e7164e0169cef7484d1481a3b8ae4eabf75f6def",
  "status": 200,
  "usage": {
    "input_tokens": 347,
    "output_tokens": 40,
    "total_tokens": 387
  }
}
```

Result: pass. Structured output matched the expected bounded contract.

### Timeout
```json
{
  "attempts": 2,
  "error": {
    "code": "timeout"
  },
  "ok": false
}
```

Result: pass. Timeout falls back cleanly after retry exhaustion.

### Provider failure
```json
{
  "attempts": 2,
  "error": {
    "code": "server_error",
    "status": 503
  },
  "providerCallCount": 2,
  "ok": false
}
```

Result: pass. Retry executed twice and then returned fallback-safe failure.

### Invalid JSON
```json
{
  "attempts": 1,
  "error": {
    "code": "invalid_json",
    "status": 200
  },
  "ok": false
}
```

Result: pass. The runtime rejects malformed text output without breaking continuity.

### Schema mismatch
```json
{
  "attempts": 1,
  "error": {
    "code": "schema_validation_failed",
    "status": 200
  },
  "ok": false
}
```

Result: pass. The runtime rejects outputs that do not fit the allowed REVORY enums.

### Fallback continuity
```json
{
  "lowConfidenceKeepsFallback": true,
  "nullClassificationAndPatchKeepFallback": true
}
```

Result: pass. The deterministic read remains intact when classification or patching cannot be trusted.

## Product impact
- The LLM still behaves as a bounded utility layer.
- The deterministic core still wins whenever the provider is slow, down, malformed, or semantically off-contract.
- No new UI was added.
- No open-ended AI behavior was introduced.

## Validation
- `npm run llm:qa` ?
- `npm run llm:smoke` ?
- `npm run lint` ?
- `npm run typecheck` ?
- `npm run build` ?

## Verdict
**Approved.** Timeout, retry, fallback, and structured-output integrity are now validated with both real and simulated failure paths, and the bounded REVORY LLM layer remains subordinate to the deterministic product core.
