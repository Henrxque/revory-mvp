import {proveMultiProviderBrowser} from "./fixtures/multi-provider-browser";
import assert from "node:assert/strict";
import {randomBytes,randomUUID} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import {prisma} from "../db/prisma";
import {registerAiCustomerSource,syncAiCustomerSource,revokeAiCustomerSource,listAiCustomerSources} from "../services/ai-integrity/customer-sources";
import {promoteAiCustomerSource} from "../services/ai-integrity/promote-source";
import {persistConnectedLedger} from "../services/ai-integrity/connected-ledger";
import {reviewAiIntakeFile,buildAiIntakePlan} from "../services/ai-integrity/intake";
import {createAiIdentityMapping} from "../services/ai-integrity/identity";
import {saveConnectedReportDraft} from "../services/ai-integrity/report-draft";
import {runAiIntegrityScan,getAiIntegrityScan,exportAiIntegrityScan} from "../services/ai-integrity/scan";
import {configureMonitor,submitMonitorLedger,executeMonitorRun,changeMonitorStatus} from "../services/ai-integrity/recurring-monitor";
import {MONITOR_OFFER,type MonitorRun} from "../services/ai-integrity/recurring-access";
import {recordLegalAcceptance} from "../services/legal/acceptance";
import {buildWorkspaceExport} from "../services/data-portability/workspace-export";
import {anthropicFixtureTransport,geminiFixtureTransport,googleFixtureCredential} from "./fixtures/ai-multi-provider";
import {reconcileAiIntegrity,type AiScanInput} from "../domain/ai-integrity/reconciliation";
import type {AiSourceTransport} from "../domain/ai-integrity/connected-sources";

if(!/^\/revory_sprint1_[a-f0-9]{12}$/.test(new URL(process.env.DATABASE_URL??"").pathname))throw new Error("Disposable local database required.");
Object.assign(process.env,{REVORY_AI_SAAS_PREVIEW:"true",REVORY_AI_SAAS_SYNTHETIC_ONLY:"false",REVORY_AI_CUSTOMER_SOURCES:"true",REVORY_AI_CONNECTED_REPORTS:"true",REVORY_AI_RECURRING_MONITOR:"true",REVORY_AI_MULTI_PROVIDER_ENABLED:"true",REVORY_AI_CONNECTION_ACTIVE_KEY:"fixture",REVORY_AI_CONNECTION_KEYRING:JSON.stringify({fixture:randomBytes(32).toString("base64")}),REVORY_AI_MONITOR_PRICE_ID:"price_multi_fixture"});delete process.env.VERCEL_ENV;
const day=(offset:number)=>new Date(Date.now()+offset*86400000).toISOString().slice(0,10)+"T00:00:00.000Z";
const start=day(-9),end=day(-8),suffix=randomUUID(),google=googleFixtureCredential();let activeStart=start,activeEnd=end,iteration=0;
const transport=(provider:string):AiSourceTransport=>async read=>{
  if(provider==="ANTHROPIC")return anthropicFixtureTransport(activeStart,activeEnd,"12500",iteration?45:50)(read);
  if(provider==="GEMINI")return geminiFixtureTransport(activeStart,activeEnd,"developer",iteration?"80":"100")(read);
  const from=Date.parse(activeStart)/1000,to=Date.parse(activeEnd)/1000;
  if(provider==="STRIPE")return{object:"list",has_more:false,data:[{id:"in_"+from,object:"invoice",livemode:false,status:"paid",created:from,amount_paid:9900,currency:"usd",customer:"cus_fixture"}]};
  return{object:"page",has_more:false,data:[{object:"bucket",start_time:from,end_time:to,results:read.path.endsWith("costs")?[{object:"organization.costs.result",project_id:"proj_fixture",amount:{value:1.25,currency:"usd"}}]:[{object:"organization.usage.completions.result",project_id:"proj_fixture",model:"gpt-fixture",input_tokens:iteration?80:100,output_tokens:20}]}]};
};
try{
 const user=await prisma.user.create({data:{email:`multi-${suffix}@example.invalid`,authProvider:"google",authSubject:suffix,status:"ACTIVE",emailVerifiedAt:new Date()}});
 const ws=await prisma.workspace.create({data:{name:"Multi-provider fixture only",slug:"multi-"+suffix,ownerUserId:user.id}});
 const stranger=await prisma.user.create({data:{email:`stranger-${suffix}@example.invalid`}});
 await recordLegalAcceptance({userId:user.id,workspaceId:ws.id,event:"ACCOUNT_CREATED"});
 const order=await prisma.aiIntegrityScanOrder.create({data:{workspaceId:ws.id,actorUserId:user.id,requestKey:randomUUID(),offerVersion:"fixture-only-not-payment",amountMinor:9900,currency:"usd",status:"PAID",checkoutDriver:"stripe-test",paidAt:new Date()}});
 const grant=await prisma.aiIntegrityScanGrant.create({data:{workspaceId:ws.id,orderId:order.id}});
 const consent={windowStart:start,windowEnd:end,consentConfirmed:true};
 const connections=[];
 for(const provider of ["STRIPE","OPENAI","ANTHROPIC","GEMINI"]){
  const accountId=provider==="STRIPE"?"acct_fixture":provider==="OPENAI"?"org-fixture":provider==="ANTHROPIC"?"org_anthropic_fixture":google.projectId;
  const secret=provider==="STRIPE"?"rk_test_"+randomBytes(20).toString("hex"):provider==="OPENAI"?"sk-admin-"+randomBytes(20).toString("hex"):provider==="ANTHROPIC"?"sk-ant-admin01-fixture-"+randomBytes(20).toString("hex"):JSON.stringify(google);
  if(provider==="GEMINI")await assert.rejects(()=>registerAiCustomerSource(ws.id,user.id,{...consent,provider,accountId,secret},transport(provider)),/Authorize bounded/);
  connections.push(await registerAiCustomerSource(ws.id,user.id,{...consent,provider,accountId,secret,...(provider==="GEMINI"?{googleQueryConsentConfirmed:true}:{})},transport(provider)));
 }
 assert.equal(connections.length,4);assert.ok(!JSON.stringify(await listAiCustomerSources(ws.id,user.id)).includes("private_key"));
 await assert.rejects(()=>listAiCustomerSources(ws.id,stranger.id),/owner/);
 const prepared=new Map<string,string>();
 for(const connection of connections){const read=await syncAiCustomerSource(ws.id,user.id,{connectionId:connection.id,requestKey:randomUUID()},transport(connection.provider));const batch=await promoteAiCustomerSource(ws.id,user.id,read.syncId);prepared.set(connection.provider,batch.batchId);assert.equal((await promoteAiCustomerSource(ws.id,user.id,read.syncId)).batchId,batch.batchId);}
 const googleCosts=await prisma.aiIntegrityProviderBucket.findMany({where:{importBatchId:prepared.get("GEMINI")!,costBasis:"REPORTED"}});assert.deepEqual(googleCosts.map(row=>row.costAmount!.toString()).sort(),["-5","40"]);
 const claudeCost=await prisma.aiIntegrityProviderBucket.findFirstOrThrow({where:{importBatchId:prepared.get("ANTHROPIC")!,costBasis:"REPORTED"}});assert.equal(claudeCost.costAmount!.toString(),"125");
 async function ledger(from:string,through:string){
  const rows=[['o_input','80','input_tokens','openai','proj_fixture','gpt-fixture'],['o_output','20','output_tokens','openai','proj_fixture','gpt-fixture'],['a_input','100','input_tokens_uncached','anthropic','wrk_fixture','claude-fixture'],['a_cached','20','input_tokens_cached','anthropic','wrk_fixture','claude-fixture'],['a_write5','5','input_tokens_cache_write_5m','anthropic','wrk_fixture','claude-fixture'],['a_write1','0','input_tokens_cache_write_1h','anthropic','wrk_fixture','claude-fixture'],['a_output','45','output_tokens','anthropic','wrk_fixture','claude-fixture'],['g_output','80','gemini_reported_output_tokens','gemini',google.projectId,'gemini-fixture'],['outside','10','input_tokens','unconnected-provider','outside','outside']];
  const csv="event_id,occurred_at,quantity,unit,internal_customer_id,provider,project_id,model\n"+rows.map(([id,quantity,unit,provider,project,model])=>[id+'_'+from.slice(0,10),from,quantity,unit,'customer_fixture',provider,project,model].join(',')).join('\n')+'\n';
  const file={bytes:Buffer.from(csv),fileName:"multi-provider-ledger.csv",mimeType:"text/csv"};const reviewed=await reviewAiIntakeFile(file,"INTERNAL_LEDGER");
  const plan=await buildAiIntakePlan(file,{workspaceId:ws.id,sourceKind:"INTERNAL_LEDGER",sourceSystem:"multi-product-ledger",windowStart:from,windowEnd:through,sourceTimezone:"UTC"},reviewed.suggestedMapping);assert.equal(plan.acceptedCount,9);
  return(await persistConnectedLedger(plan.batch!,user.id,true)).batch.id;
 }
 const ledgerId=await ledger(start,end);
 for(const [provider,accountId,project] of [["openai","org-fixture","proj_fixture"],["anthropic","org_anthropic_fixture","wrk_fixture"],["gemini",google.projectId,google.projectId]])await createAiIdentityMapping({workspaceId:ws.id,actorUserId:user.id,kind:"PROVIDER_PROJECT",externalId:project,provider,organizationId:accountId,internalCustomerExternalId:"customer_fixture",sourceBatchId:prepared.get(provider.toUpperCase())!,ledgerBatchId:ledgerId,validFrom:start,validUntil:end,exclusiveProjectConfirmed:true});
 await new Promise(resolve=>setTimeout(resolve,1100));
 const providers=[prepared.get("OPENAI")!,prepared.get("ANTHROPIC")!,prepared.get("GEMINI")!],ids=[prepared.get("STRIPE")!,ledgerId,...providers],asOf=new Date().toISOString().slice(0,19)+".000Z";
 const setup={selected:{STRIPE_REVENUE:ids[0],INTERNAL_LEDGER:ledgerId,PROVIDER_REPORT:providers[0]},timing:{},lag:"48",asOf:asOf.slice(0,19),providerBatchIds:providers,providerTiming:{}};
 await saveConnectedReportDraft(ws.id,user.id,{revision:0,setup});await assert.rejects(()=>saveConnectedReportDraft(ws.id,user.id,{revision:1,setup:{...setup,providerBatchIds:[...providers,"foreign"]}}),/selection/);
 const request={workspaceId:ws.id,actorUserId:user.id,batchIds:ids,asOf,lagHours:48,syntheticDataConfirmed:false,connectedReportAuthorized:true,grantId:grant.id,sourceReviews:ids.map(batchId=>({batchId,exportedAt:asOf,completeThrough:end}))};
 if(process.env.REVORY_QA_MULTI_BROWSER === "true")await proveMultiProviderBrowser({email:user.email,authSubject:suffix,revenueId:ids[0],ledgerId,providerIds:providers,asOf,end});
 const first=await runAiIntegrityScan(request);assert.equal(first.result.ruleVersion,"ai-integrity/4.3.0");assert.equal(first.result.dataQuality.providerSources!.length,3);assert.deepEqual(first.result.dataQuality.uncoveredLedgerProviders,["unconnected-provider"]);
 const mismatches=first.result.findings.filter(f=>f.findingType==="LEDGER_PROVIDER_USAGE_MISMATCH");assert.deepEqual(mismatches.map(f=>[f.evidence.provider,f.evidence.unit,f.evidence.delta]).sort(),[["anthropic","input_tokens_uncached","20"],["anthropic","output_tokens","5"],["gemini","gemini_reported_output_tokens","20"],["openai","input_tokens","20"]]);
 assert.ok(mismatches.every(f=>f.valueAmount===null));assert.equal((await runAiIntegrityScan(request)).snapshotId,first.snapshotId);assert.equal((await prisma.aiIntegrityScanGrant.findUniqueOrThrow({where:{id:grant.id}})).consumedSnapshotId,first.snapshotId);
 const snapshot=await prisma.aiIntegritySnapshot.findUniqueOrThrow({where:{id:first.snapshotId}});
 const manifest=snapshot.inputManifestJson as unknown as {input:AiScanInput};
 const duplicatedProvider=structuredClone(manifest.input);for(const bucket of duplicatedProvider.buckets)if(bucket.provider==="anthropic")bucket.provider="openai";
 assert.throws(()=>reconcileAiIntegrity(duplicatedProvider),/repeated provider/);
 const foreignBucket=structuredClone(manifest.input);foreignBucket.buckets[0].importBatchId="unselected-source";
 assert.throws(()=>reconcileAiIntegrity(foreignBucket),/outside the selected/);
 const openAnthropic=structuredClone(manifest.input);openAnthropic.sourceReviews.find(review=>review.batchId===prepared.get("ANTHROPIC"))!.completeThrough=start;
 const partiallyClosed=reconcileAiIntegrity(openAnthropic);
 assert.ok(!partiallyClosed.findings.some(f=>f.findingType==="LEDGER_PROVIDER_USAGE_MISMATCH"&&f.evidence.provider==="anthropic"));
 assert.ok(partiallyClosed.findings.some(f=>f.findingType==="LEDGER_PROVIDER_USAGE_MISMATCH"&&f.evidence.provider==="openai"));
 const historical=exportAiIntegrityScan((await getAiIntegrityScan(ws.id,first.snapshotId))!,"json");assert.ok(!historical.includes("private_key"));assert.ok(!historical.includes("sk-ant-admin"));
 await prisma.aiIntegrityMonitorState.create({data:{workspaceId:ws.id,kind:"SUBSCRIPTION",key:"primary",status:"ACTIVE",dataJson:{customerId:"cus_fixture",subscriptionId:"sub_fixture",priceId:"price_multi_fixture",offerVersion:MONITOR_OFFER.version,amountMinor:19900,livemode:false,paidThrough:day(20),verifiedAt:new Date().toISOString()}}});
 await assert.rejects(()=>configureMonitor(ws.id,user.id,{start,periodDays:1,lagHours:24,consentUntil:day(20),emailEnabled:false,consentConfirmed:true,scopeReviewed:true}),/48 hours/);
 await configureMonitor(ws.id,user.id,{start,periodDays:1,lagHours:48,consentUntil:day(20),emailEnabled:false,consentConfirmed:true,scopeReviewed:true});
 const monitorSnapshots:string[]=[];
 for(iteration=0;iteration<3;iteration++){
  activeStart=day(-9+iteration);activeEnd=day(-8+iteration);
  if(iteration===2){await changeMonitorStatus(ws.id,user.id,"PAUSED");await revokeAiCustomerSource(ws.id,user.id,{connectionId:connections.find(c=>c.provider==="OPENAI")!.id});await changeMonitorStatus(ws.id,user.id,"ACTIVE",day(20),false);}
  const batchId=iteration===0?ledgerId:await ledger(activeStart,activeEnd);
  const queued=await submitMonitorLedger(ws.id,user.id,{batchId,exportedAt:new Date().toISOString(),completeThrough:activeEnd});
  const result=await executeMonitorRun(queued.runId,transport);assert.equal(result.status,"COMPLETED");monitorSnapshots.push(result.snapshotId!);
  if(iteration===1||iteration===2){
    const run=await prisma.aiIntegrityMonitorState.findUniqueOrThrow({where:{id:queued.runId}}),data=run.dataJson as unknown as MonitorRun;
    const comparison=await prisma.aiIntegrityMonitorComparison.findUniqueOrThrow({where:{id:data.comparisonId}}),artifact=comparison.artifactJson as unknown as {comparable:boolean;comparisonLimit:string|null;counts:{noLongerObserved:number};movements:Array<{movement:string}>};
    if(iteration===1){assert.equal(artifact.comparable,true);assert.equal(artifact.counts.noLongerObserved,3);}else{assert.equal(artifact.comparable,false);assert.equal(artifact.comparisonLimit,"SOURCE_OR_BUCKET_SCOPE_CHANGED");assert.ok(artifact.movements.every(m=>m.movement==="SUPPRESSED"));}
  }
 }
 await revokeAiCustomerSource(ws.id,user.id,{connectionId:connections.find(c=>c.provider==="ANTHROPIC")!.id});assert.equal(exportAiIntegrityScan((await getAiIntegrityScan(ws.id,first.snapshotId))!,"json"),historical);
 assert.ok(!JSON.stringify(await buildWorkspaceExport(ws.id)).includes("private_key"));
 const proof={fixtureOnly:true,providers:["OpenAI","Anthropic","Gemini"],scanRule:"ai-integrity/4.3.0",providerReports:3,batches:5,usageDifferences:mismatches.map(f=>({provider:f.evidence.provider,unit:f.evidence.unit,delta:f.evidence.delta})),scanGrantsConsumed:1,monitorPeriods:3,scopeChangeSuppressed:true,historicalReplayAfterRevocation:true,credentialsExported:false,realAccountsValidated:false,externalReads:0,providerGenerationRequests:0};
 await mkdir("docs/qa/multi-provider",{recursive:true});await writeFile("docs/qa/multi-provider/controlled-integration.json",JSON.stringify(proof,null,2)+'\n');
 console.log("Multi-provider DB PASS: four encrypted connections, three provider sources, 5-batch/one-grant report, four exact usage differences, three recurring periods, comparable resolutions, changed-scope suppression, workspace authorization, explicit Google query consent and immutable replay after revocation. Controlled data only.");
}finally{await prisma.$disconnect();}
