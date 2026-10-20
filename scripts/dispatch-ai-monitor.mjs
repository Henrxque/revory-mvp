import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export async function dispatchAiMonitor({ url, token, fetcher = fetch }) {
  const target = new URL(url);
  const approved = target.hostname === 'revory.app' ||
    /^revory-[a-z0-9-]+-henrxques-projects\.vercel\.app$/.test(target.hostname);
  if (target.protocol !== 'https:' || !approved || target.port || target.username || target.password || target.search || target.hash ||
      target.pathname !== '/api/jobs/ai-integrity-monitor' || typeof token !== 'string' || token.length < 32 || /\s/.test(token)) {
    throw new Error('Monitoring dispatcher requires an approved target and scoped credential.');
  }
  const response = await fetcher(target.href, { method: 'GET', redirect: 'error',
    headers: { authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(330000) });
  if (!response.ok) throw new Error('Monitoring dispatcher request failed.');
  const text = await response.text();
  if (text.length > 12000) throw new Error('Unexpected monitoring response.');
  const body = JSON.parse(text);
  if (body.enabled === false || !Number.isSafeInteger(body.processed) || body.processed < 0 ||
      !Number.isSafeInteger(body.sent) || body.sent < 0) throw new Error('Monitoring is disabled or returned an unexpected result.');
  return { processed: body.processed, sent: body.sent };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await dispatchAiMonitor({ url: process.env.REVORY_MONITOR_DISPATCH_URL, token: process.env.REVORY_MONITOR_DISPATCH_SECRET });
    console.log(JSON.stringify({ message: 'monitor_dispatch_complete', ...result }));
  } catch {
    console.error('Monitoring dispatch failed: review target, access, configuration and job state. Provider bodies and credentials are not logged.');
    process.exitCode = 1;
  }
}
