import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {proxy} from '../src/proxy';
const names=['VERCEL_ENV','DATABASE_URL','REVORY_AI_SAAS_PREVIEW','REVORY_AI_SAAS_SYNTHETIC_ONLY','REVORY_AI_SAAS_SYNTHETIC_DATABASE','REVORY_AI_COMMERCIAL_ENABLED','REVORY_AI_COMMERCIAL_DATABASE','REVORY_AI_COMMERCIAL_BRANCH','REVORY_AI_MONITOR_BILLING_MODE','REVORY_AI_CUSTOMER_STRIPE_MODE','VERCEL_GIT_COMMIT_REF'];
const saved=Object.fromEntries(names.map(name=>[name,process.env[name]]));
const request=(path:string)=>new NextRequest('https://preview.example'+path);
try{
 Object.assign(process.env,{VERCEL_ENV:'preview',DATABASE_URL:'postgresql://fixture@ep-test.example/revory_monitor_hml_123456abcdef',REVORY_AI_COMMERCIAL_ENABLED:'true',REVORY_AI_COMMERCIAL_DATABASE:'revory_monitor_hml_123456abcdef',REVORY_AI_COMMERCIAL_BRANCH:'release/monitor-hml',VERCEL_GIT_COMMIT_REF:'release/monitor-hml',REVORY_AI_MONITOR_BILLING_MODE:'test',REVORY_AI_CUSTOMER_STRIPE_MODE:'test'});
 assert.equal(proxy(request('/app/billing')).status,303);
 assert.equal(proxy(request('/api/billing/checkout')).status,404);
 assert.equal(proxy(request('/api/jobs/weekly-digest')).status,404);
 for(const path of ['/api/jobs/ai-integrity-monitor','/api/ai-integrity/recurring/webhook','/api/auth/session','/api/health'])assert.equal(proxy(request(path)).headers.get('x-middleware-next'),'1');
 Object.assign(process.env,{DATABASE_URL:'postgresql://fixture@ep-test.example/revory_ai_sandbox_123456abcdef',REVORY_AI_SAAS_PREVIEW:'true',REVORY_AI_SAAS_SYNTHETIC_ONLY:'true',REVORY_AI_SAAS_SYNTHETIC_DATABASE:'revory_ai_sandbox_123456abcdef'});
 assert.equal(proxy(request('/api/jobs/ai-integrity-monitor')).status,404);
 process.env.VERCEL_ENV='production';
 assert.equal(proxy(request('/api/billing/checkout')).headers.get('x-middleware-next'),'1','Existing production routes are untouched.');
 console.log('PASS: commercial Preview exposes only its monitor job and AI/auth routes; synthetic and production boundaries preserved.');
}finally{for(const name of names){if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name];}}
