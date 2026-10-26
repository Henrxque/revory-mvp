import { randomUUID } from "node:crypto";
import { canonicalAiJson, type AiProviderBucketInput } from "./contracts";
import { type AiSourceTransport, validateAiSourceWindow } from "./connected-sources";
import { geminiBillingBody, GEMINI_OUTPUT_METRIC, GOOGLE_QUERY_BYTE_LIMIT, VERTEX_TOKEN_METRIC, type GeminiScope } from "./gemini-contract";
import { sourceObject, sourceWindow, providerRow, providerChannel, providerArtifact, type ProviderReadContext } from "./provider-artifact";
import { aiDecimal } from "./reconciliation";

export const GEMINI_SOURCE_VERSION = "gemini-google-cloud/v1";
export async function readGeminiSource(context: ProviderReadContext, scope: GeminiScope, transport: AiSourceTransport, checkActive: () => Promise<void>, verifiedProjectResource: string) {
  validateAiSourceWindow(context.windowStart, context.windowEnd, context.asOf, Math.max(48,context.lagHours));
  if (scope.projectId !== context.accountId || !/^projects\/\d+$/.test(verifiedProjectResource)) throw new Error("Google project scope changed.");
  const metric = scope.platform === "developer" ? GEMINI_OUTPUT_METRIC : VERTEX_TOKEN_METRIC;
  await checkActive();
  let descriptorAvailable = true;
  try {
    const descriptor = sourceObject(await transport({ method:"GET",origin:"https://monitoring.googleapis.com",path:`/v3/projects/${scope.projectId}/metricDescriptors/${encodeURIComponent(metric)}`,query:{} }));
    if (descriptor.type !== metric || descriptor.metricKind !== "DELTA" || descriptor.valueType !== "INT64" || descriptor.unit !== "1") throw new Error("Google usage metric semantics are not supported.");
  } catch(error) {
    // An unavailable descriptor is an explicit coverage limitation. Permission,
    // network, schema and other failures must fail the read, not fabricate zero.
    if (!(error instanceof Error) || !error.message.includes("HTTP 404")) throw error;
    descriptorAvailable = false;
  }
  const aggregate = new Map<string,{ start:string; end:string; model:string; unit:string; quantity:bigint }>();
  if (descriptorAvailable) {
    let cursor: string | null = null; const seen = new Set<string>(), pointIds = new Set<string>(); let completed = false;
    for(let page=0;page<20;page++) {
      await checkActive();
      const response = sourceObject(await transport({ method:"GET",origin:"https://monitoring.googleapis.com",path:`/v3/projects/${scope.projectId}/timeSeries`,query:{ filter:`metric.type="${metric}"`, "interval.startTime":context.windowStart,"interval.endTime":context.windowEnd,"aggregation.alignmentPeriod":"86400s","aggregation.perSeriesAligner":"ALIGN_SUM",view:"FULL",pageSize:"1000",...(cursor?{pageToken:cursor}:{}) } }));
      if (response.timeSeries !== undefined && !Array.isArray(response.timeSeries)) throw new Error("Invalid Google time series.");
      const series = (response.timeSeries ?? []) as unknown[]; if(series.length>1000) throw new Error("Google time-series limit exceeded.");
      for(const value of series) {
        const row=sourceObject(value), resource=sourceObject(row.resource), labels=sourceObject(resource.labels), description=sourceObject(row.metric), dimensions=sourceObject(description.labels);
        if(description.type!==metric || row.metricKind!=="DELTA" || row.valueType!=="INT64" || ![scope.projectId,`projects/${scope.projectId}`,verifiedProjectResource,verifiedProjectResource.slice(9)].includes(String(labels.resource_container))) throw new Error("Google usage belongs to another scope or metric type.");
        let model: unknown, unit: string;
        if(scope.platform==="vertex") {
          if(resource.type!=="aiplatform.googleapis.com/PublisherModel" || labels.publisher!=="google" || !String(labels.model_user_id).startsWith("gemini-")) continue;
          model=labels.model_user_id;
          if (dimensions.explicit_caching !== undefined && !["true","false"].includes(String(dimensions.explicit_caching))) throw new Error("Unrecognized Vertex cache dimension.");
          if(!["input","output"].includes(String(dimensions.type))) throw new Error("Unrecognized Vertex token type.");
          unit=`vertex_${dimensions.type}_tokens${dimensions.explicit_caching==="true"?"_explicit_cache":""}`;
        } else {
          if(resource.type!=="generativelanguage.googleapis.com/Location") throw new Error("Unexpected Gemini usage resource.");
          model=dimensions.model; unit="gemini_reported_output_tokens";
        }
        if(typeof model!=="string" || !/^[A-Za-z0-9_.:/-]{1,160}$/.test(model) || !Array.isArray(row.points) || row.points.length>1000) throw new Error("Invalid Google usage dimensions.");
        for(const raw of row.points) {
          const point=sourceObject(raw), interval=sourceObject(point.interval), quantity=sourceObject(point.value).int64Value;
          const window=sourceWindow(interval.startTime,interval.endTime,context);
          if(Date.parse(window.windowEnd)-Date.parse(window.windowStart)!==86400000 || !window.windowStart.endsWith("T00:00:00.000Z") || typeof quantity!=="string" || !/^\d{1,18}$/.test(quantity)) throw new Error("Google usage must be exact daily delta counts.");
          const pointId=canonicalAiJson([resource,description,window]); if(pointIds.has(pointId) || pointIds.size>=10000) throw new Error("Duplicate or excessive Google usage points."); pointIds.add(pointId);
          const key=canonicalAiJson([window,model,unit]), old=aggregate.get(key);
          aggregate.set(key,{start:window.windowStart,end:window.windowEnd,model,unit,quantity:(old?.quantity??BigInt(0))+BigInt(quantity)});
        }
      }
      if(!response.nextPageToken){completed=true;break;}
      if(typeof response.nextPageToken!=="string" || response.nextPageToken.length>2048 || seen.has(response.nextPageToken)) throw new Error("Google usage pagination did not advance.");
      cursor=response.nextPageToken;seen.add(cursor);
    }
    if(!completed)throw new Error("Google usage pagination is incomplete.");
  }
  const usageRows=[...aggregate.values()].map(row=>providerRow(context,"gemini",[scope.platform,context.accountId,row.start,row.end,row.model,row.unit],{windowStart:row.start,windowEnd:row.end,projectId:scope.projectId,model:row.model,usageQuantity:String(row.quantity),usageUnit:row.unit,costBasis:"UNAVAILABLE"}));
  await checkActive();
  let result=sourceObject(await transport({method:"POST",origin:"https://bigquery.googleapis.com",path:`/bigquery/v2/projects/${scope.queryProjectId}/queries`,query:{},body:geminiBillingBody(scope,context.windowStart,context.windowEnd,randomUUID())}));
  const costRows: AiProviderBucketInput[]=[]; let complete=false, rowCount=0; const pages=new Set<string>();
  for(let page=0;page<20;page++){
    await checkActive();
    if(result.errors || (result.totalBytesProcessed!==undefined && (typeof result.totalBytesProcessed!=="string" || !/^\d+$/.test(result.totalBytesProcessed) || BigInt(result.totalBytesProcessed)>BigInt(GOOGLE_QUERY_BYTE_LIMIT)))) throw new Error("Google billing query failed or exceeded its approved cap.");
    if(result.jobComplete!==true && result.jobComplete!==false) throw new Error("Google billing query status is unavailable.");
    if(result.jobComplete===true){
      const schema=sourceObject(result.schema), expected=["window_start","project_id","currency","cost_amount","credit_amount","adjustment_count"];
      if(!Array.isArray(schema.fields) || canonicalAiJson(schema.fields.map(field=>sourceObject(field).name))!==canonicalAiJson(expected) || (result.rows!==undefined&&!Array.isArray(result.rows)))throw new Error("Google billing export schema changed.");
      for(const raw of (result.rows??[]) as unknown[]){
        if(++rowCount>1000)throw new Error("Google billing export row limit exceeded.");
        const row=sourceObject(raw);if(!Array.isArray(row.f)||row.f.length!==6)throw new Error("Invalid Google billing row.");
        const [start,project,currency,cost,credit,adjustments]=row.f.map(field=>sourceObject(field).v);
        if(typeof start!=="string" || project!==scope.projectId || typeof currency!=="string" || !/^[A-Z]{3}$/.test(currency) || typeof cost!=="string" || typeof credit!=="string" || typeof adjustments!=="string" || !/^\d+$/.test(adjustments))throw new Error("Invalid Google billing evidence.");
        const window=sourceWindow(start,new Date(Date.parse(start)+86400000).toISOString(),context);
        aiDecimal(cost);aiDecimal(credit);
        costRows.push(providerRow(context,"gemini",[scope.platform,scope.projectId,window,currency,"cost"],{...window,projectId:scope.projectId,model:null,costAmount:cost,costCurrency:currency,costBasis:"REPORTED",adjustmentKind:adjustments!=="0"?"BILLING_ADJUSTMENT":null}));
        if(aiDecimal(credit)!==BigInt(0))costRows.push(providerRow(context,"gemini",[scope.platform,scope.projectId,window,currency,"credit"],{...window,projectId:scope.projectId,model:null,costAmount:credit,costCurrency:currency,costBasis:"REPORTED",adjustmentKind:"CREDIT"}));
      }
      if(!result.pageToken){complete=true;break;}
    }
    const job=sourceObject(result.jobReference);
    if(job.projectId!==scope.queryProjectId || typeof job.jobId!=="string" || !/^[A-Za-z0-9_-]{1,200}$/.test(job.jobId) || (job.location!==undefined&&String(job.location).toLowerCase()!==scope.location.toLowerCase()))throw new Error("Google billing job scope changed.");
    const cursor=result.pageToken;
    if(cursor!==undefined&&(typeof cursor!=="string"||cursor.length>2048||pages.has(cursor)))throw new Error("Google billing pagination did not advance.");
    if(typeof cursor==="string")pages.add(cursor);
    result=sourceObject(await transport({method:"GET",origin:"https://bigquery.googleapis.com",path:`/bigquery/v2/projects/${scope.queryProjectId}/queries/${job.jobId}`,query:{location:scope.location,maxResults:"1000",timeoutMs:"8000",...(typeof cursor==="string"?{pageToken:cursor}:{})}}));
  }
  if(!complete)throw new Error("Google billing query did not complete within the bounded read.");
  await checkActive();
  const usageScope=!descriptorAvailable?"Usage metric unavailable in this project. Costs only; usage coverage is unknown.":scope.platform==="developer"?"Gemini Developer API reported output tokens only. Input, cache, batch and other generation usage are not proven complete. Quota metrics are never substituted for billable token usage.":"Vertex Gemini online-serving DELTA token counts. Explicit-cache traffic uses distinct units. Batch and other platforms are not included. Match exact ledger unit/model semantics.";
  const artifact=providerArtifact(context,"GEMINI",[providerChannel(context,"gemini-usage",usageRows,usageScope,GEMINI_SOURCE_VERSION),providerChannel(context,"gemini-costs",costRows,`Google Cloud Billing export for ${scope.platform}; selected project/service only, Vertex Gemini SKUs when applicable. Credits/adjustments are separate. Reporting may exceed 48h; operator closure is required. Customer-configured export table; table provenance and completeness are not certified. No model/customer cost allocation.`,GEMINI_SOURCE_VERSION)],GEMINI_SOURCE_VERSION);
  return {...artifact,googleScope:{platform:scope.platform,projectId:scope.projectId,metric:descriptorAvailable?metric:null,usageCoverage:descriptorAvailable?"DOCUMENTED_METRIC_ONLY":"UNAVAILABLE",queryMaximumBytesBilled:GOOGLE_QUERY_BYTE_LIMIT}};
}
