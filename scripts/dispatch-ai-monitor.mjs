import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

class MonitorDispatchError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    if (status !== undefined) this.status = status;
  }
}

export function monitorDispatchFailureDetails(error) {
  return error instanceof MonitorDispatchError
    ? { message: 'monitor_dispatch_failed', code: error.code, ...(error.status === undefined ? {} : { httpStatus: error.status }) }
    : { message: 'monitor_dispatch_failed', code: 'UNEXPECTED_ERROR' };
}

export async function dispatchAiMonitor({ url, token, fetcher = fetch }) {
  let target;
  try { target = new URL(url); } catch { throw new MonitorDispatchError('INVALID_CONFIGURATION'); }
  const approved = ['revory.app', 'monitor-hml.revory.app'].includes(target.hostname) ||
    /^revory-[a-z0-9-]+-henrxques-projects\.vercel\.app$/.test(target.hostname);
  if (target.protocol !== 'https:' || !approved || target.port || target.username || target.password || target.search || target.hash ||
      target.pathname !== '/api/jobs/ai-integrity-monitor' || typeof token !== 'string' || token.length < 32 || /\s/.test(token)) {
    throw new MonitorDispatchError('INVALID_CONFIGURATION');
  }
  let response;
  try {
    response = await fetcher(target.href, { method: 'GET', redirect: 'manual',
      headers: { authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(330000) });
  } catch { throw new MonitorDispatchError('NETWORK_OR_REDIRECT_ERROR'); }
  if (!response.ok) throw new MonitorDispatchError('HTTP_ERROR', response.status);
  let text;
  try { text = await response.text(); } catch { throw new MonitorDispatchError('RESPONSE_READ_ERROR'); }
  if (text.length > 12000) throw new MonitorDispatchError('INVALID_RESPONSE');
  let body;
  try { body = JSON.parse(text); } catch { throw new MonitorDispatchError('INVALID_RESPONSE'); }
  if (body?.enabled === false) throw new MonitorDispatchError('DISABLED_RUNTIME');
  if (!body || !Number.isSafeInteger(body.processed) || body.processed < 0 ||
      !Number.isSafeInteger(body.sent) || body.sent < 0) throw new MonitorDispatchError('INVALID_RESPONSE');
  return { processed: body.processed, sent: body.sent };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await dispatchAiMonitor({ url: process.env.REVORY_MONITOR_DISPATCH_URL, token: process.env.REVORY_MONITOR_DISPATCH_SECRET });
    console.log(JSON.stringify({ message: 'monitor_dispatch_complete', ...result }));
  } catch (error) {
    console.error(JSON.stringify(monitorDispatchFailureDetails(error)));
    process.exitCode = 1;
  }
}
