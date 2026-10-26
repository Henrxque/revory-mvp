import { generateKeyPairSync } from "node:crypto";
import type { AiSourceTransport } from "../../domain/ai-integrity/connected-sources";
import { GEMINI_OUTPUT_METRIC, VERTEX_TOKEN_METRIC } from "../../domain/ai-integrity/gemini-contract";

export const multiFixturePeriod = { windowStart:"2026-09-01T00:00:00.000Z",windowEnd:"2026-09-02T00:00:00.000Z",asOf:"2026-09-05T00:00:00.000Z",lagHours:48 };
export function anthropicFixtureTransport(start=multiFixturePeriod.windowStart,end=multiFixturePeriod.windowEnd,amount="12500",output=50):AiSourceTransport {
  return async read => {
    if(read.path==="/v1/organizations/me")return{id:"org_anthropic_fixture"};
    if(read.path==="/v1/organizations/usage_report/messages")return{data:[{starting_at:start,ending_at:end,results:[{workspace_id:"wrk_fixture",model:"claude-fixture",uncached_input_tokens:120,cache_read_input_tokens:20,cache_creation:{ephemeral_5m_input_tokens:5,ephemeral_1h_input_tokens:0},output_tokens:output}]}],has_more:false,next_page:null};
    if(read.path==="/v1/organizations/cost_report")return{data:[{starting_at:start,ending_at:end,results:[{workspace_id:"wrk_fixture",amount,currency:"USD"}]}],has_more:false,next_page:null};
    throw new Error("Unexpected Anthropic fixture read.");
  };
}
export function googleFixtureCredential(platform:"developer"|"vertex"="developer") {
  const {privateKey}=generateKeyPairSync("rsa",{modulusLength:2048,privateKeyEncoding:{type:"pkcs8",format:"pem"},publicKeyEncoding:{type:"spki",format:"pem"}});
  return {platform,projectId:"my-google-project",queryProjectId:"my-google-project",billingTable:"my-google-project.billing.gcp_billing_export_v1_fixture",location:"US",serviceAccount:{type:"service_account",project_id:"my-google-project",client_email:"revory-fixture@my-google-project.iam.gserviceaccount.com",private_key:privateKey,token_uri:"https://oauth2.googleapis.com/token"}};
}
export function geminiFixtureTransport(start=multiFixturePeriod.windowStart,end=multiFixturePeriod.windowEnd,platform:"developer"|"vertex"="developer",output="100",cost="40"):AiSourceTransport {
  const metric=platform==="developer"?GEMINI_OUTPUT_METRIC:VERTEX_TOKEN_METRIC;
  return async read => {
    if(read.origin==="https://cloudresourcemanager.googleapis.com")return{projectId:"my-google-project",name:"projects/123456789",state:"ACTIVE"};
    if(read.path.includes("/metricDescriptors/"))return{type:metric,metricKind:"DELTA",valueType:"INT64",unit:"1"};
    if(read.path.endsWith("/timeSeries"))return{timeSeries:[{metric:{type:metric,labels:platform==="developer"?{model:"gemini-fixture",output_modality:"TEXT",thinking_enabled:"false"}:{type:"output",explicit_caching:"false"}},resource:{type:platform==="developer"?"generativelanguage.googleapis.com/Location":"aiplatform.googleapis.com/PublisherModel",labels:{resource_container:"projects/my-google-project",location:"us-central1",...(platform==="vertex"?{publisher:"google",model_user_id:"gemini-fixture"}:{})}},metricKind:"DELTA",valueType:"INT64",points:[{interval:{startTime:start,endTime:end},value:{int64Value:output}}]}]};
    if(read.origin==="https://bigquery.googleapis.com")return{jobComplete:true,totalBytesProcessed:"10485760",schema:{fields:["window_start","project_id","currency","cost_amount","credit_amount","adjustment_count"].map(name=>({name}))},rows:[{f:[start,"my-google-project","USD",cost,"-5","0"].map(v=>({v}))}]};
    throw new Error("Unexpected Gemini fixture read.");
  };
}
