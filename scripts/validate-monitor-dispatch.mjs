import assert from 'node:assert/strict';
import { dispatchAiMonitor, monitorDispatchFailureDetails } from './dispatch-ai-monitor.mjs';
const token = 'fixture-only-' + 'a'.repeat(40);
const url = 'https://revory.app/api/jobs/ai-integrity-monitor';
let requests = 0;
const fetcher = async (target, options) => {
  requests++;
  assert.equal(target, url);
  assert.equal(options.redirect, 'error');
  assert.equal(options.headers.authorization, 'Bearer ' + token);
  return new Response(JSON.stringify({ processed: 1, sent: 0 }));
};
assert.deepEqual(await dispatchAiMonitor({ url, token, fetcher }), { processed: 1, sent: 0 });
for (const target of [url.replace('revory.app', 'attacker.example'), url + '?secret=bad', url.replace('https:', 'http:'), 'https://revory.app/api/health', url.replace('revory.app','monitor-hml.revory.app.attacker.example')]) {
  await assert.rejects(dispatchAiMonitor({ url: target, token, fetcher }));
}
assert.equal(requests, 1, 'Unapproved destinations receive no credential or request.');
await assert.rejects(dispatchAiMonitor({ url, token, fetcher: async () => new Response(JSON.stringify({ enabled: false, processed: 0 })) }));
await assert.rejects(dispatchAiMonitor({ url, token, fetcher: async () => new Response('private error '+token, { status: 401 }) }), error => {
  assert.deepEqual(monitorDispatchFailureDetails(error), { message: 'monitor_dispatch_failed', code: 'HTTP_ERROR', httpStatus: 401 });
  assert.equal(JSON.stringify(error).includes(token), false);
  return true;
});
await assert.rejects(dispatchAiMonitor({ url, token, fetcher: async () => { throw Error('secret='+token); } }), error => {
  assert.equal(monitorDispatchFailureDetails(error).code, 'NETWORK_OR_REDIRECT_ERROR');
  assert.equal(JSON.stringify(error).includes(token), false);
  return true;
});
assert.equal(JSON.stringify(monitorDispatchFailureDetails(Error('secret='+token))).includes(token), false);
console.log('PASS: dispatcher target, credential, redirect and disabled-runtime guards.');
