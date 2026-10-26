import "server-only";
import { createPrivateKey, createSign } from "node:crypto";
import { assertGeminiBillingBody, GEMINI_OUTPUT_METRIC, VERTEX_TOKEN_METRIC, validateGeminiScope, type GeminiScope } from "@/domain/ai-integrity/gemini-contract";
import { sourceObject } from "@/domain/ai-integrity/provider-artifact";
import type { AiSourceTransport } from "@/domain/ai-integrity/connected-sources";
import { providerRequest } from "./provider-http";

export type GeminiCredential = GeminiScope & { serviceAccount: { type: string; project_id: string; client_email: string; private_key: string; token_uri?: string } };
export function parseGeminiCredential(secret: string, expectedProject: string): GeminiCredential {
  let raw: Record<string, unknown>;
  try { raw = sourceObject(JSON.parse(secret)); } catch { throw new Error("Use the documented Google connection JSON."); }
  if (Object.keys(raw).some(key => !["platform", "projectId", "queryProjectId", "billingTable", "location", "serviceAccount"].includes(key))) throw new Error("Unsupported Google connection fields.");
  const scope = raw as unknown as GeminiCredential;
  validateGeminiScope(scope);
  const account = sourceObject(raw.serviceAccount);
  if (scope.projectId !== expectedProject || account.type !== "service_account" || typeof account.client_email !== "string"
    || !/^[A-Za-z0-9._-]+@[a-z][a-z0-9-]+\.iam\.gserviceaccount\.com$/.test(account.client_email)
    || typeof account.private_key !== "string" || account.private_key.length > 12000 || (account.token_uri !== undefined && account.token_uri !== "https://oauth2.googleapis.com/token")) throw new Error("Google service-account scope is invalid.");
  try { const key = createPrivateKey(account.private_key); if (key.asymmetricKeyType !== "rsa" || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) throw new Error(); }
  catch { throw new Error("Use a valid dedicated Google service-account RSA credential."); }
  return scope;
}
export function createGeminiReadTransport(secret: string, projectId: string, fetcher: typeof fetch = fetch, pause?: (ms: number) => Promise<void>): AiSourceTransport {
  const config = parseGeminiCredential(secret, projectId), metric = config.platform === "developer" ? GEMINI_OUTPUT_METRIC : VERTEX_TOKEN_METRIC;
  let token: string | null = null, expires = 0;
  const queryJobs = new Set<string>();
  async function accessToken() {
    if (token && Date.now() < expires) return token;
    const now = Math.floor(Date.now()/1000), encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const unsigned = encode({ alg: "RS256", typ: "JWT" }) + "." + encode({ iss: config.serviceAccount.client_email, scope: "https://www.googleapis.com/auth/cloud-platform", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now+300 });
    const signer = createSign("RSA-SHA256"); signer.update(unsigned); signer.end();
    const assertion = unsigned + "." + signer.sign(config.serviceAccount.private_key,"base64url");
    const response = sourceObject(await providerRequest(new URL("https://oauth2.googleapis.com/token"), { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString() }, fetcher, pause));
    if (typeof response.access_token !== "string" || !/^[A-Za-z0-9._~+/-]{16,4096}$/.test(response.access_token) || response.token_type !== "Bearer" || typeof response.expires_in !== "number" || response.expires_in < 60 || response.expires_in > 3600) throw new Error("Google authentication could not be verified.");
    token = response.access_token; expires = Date.now() + Math.min(240, response.expires_in-30)*1000; return token;
  }
  return async read => {
    // Validate before obtaining a token. No caller-controlled host, SQL, body,
    // resource project, generation API or redirect can reach the network.
    const keys = Object.keys(read.query);
    let allowed = false;
    if (read.origin === "https://cloudresourcemanager.googleapis.com" && read.path === `/v3/projects/${config.projectId}` && read.method === "GET" && !keys.length && read.body === undefined) allowed = true;
    if (read.origin === "https://monitoring.googleapis.com" && read.method === "GET" && read.body === undefined) {
      if (read.path === `/v3/projects/${config.projectId}/metricDescriptors/${encodeURIComponent(metric)}` && !keys.length) allowed = true;
      if (read.path === `/v3/projects/${config.projectId}/timeSeries`) {
        const expectedFilter = `metric.type="${metric}"`;
        allowed = keys.every(key => ["filter", "interval.startTime", "interval.endTime", "aggregation.alignmentPeriod", "aggregation.perSeriesAligner", "view", "pageSize", "pageToken"].includes(key))
          && read.query.filter === expectedFilter && read.query["aggregation.alignmentPeriod"] === "86400s" && read.query["aggregation.perSeriesAligner"] === "ALIGN_SUM" && read.query.view === "FULL" && read.query.pageSize === "1000";
        const start = read.query["interval.startTime"], end = read.query["interval.endTime"];
        allowed = allowed && typeof start === "string" && typeof end === "string" && /^\d{4}-\d\d-\d\dT00:00:00\.000Z$/.test(start) && /^\d{4}-\d\d-\d\dT00:00:00\.000Z$/.test(end) && Date.parse(end)>Date.parse(start) && Date.parse(end)-Date.parse(start)<=31*86400000;
      }
    }
    if (read.origin === "https://bigquery.googleapis.com") {
      if (read.path === `/bigquery/v2/projects/${config.queryProjectId}/queries` && read.method === "POST" && !keys.length) { assertGeminiBillingBody(read.body,config); allowed = true; }
      if (new RegExp(`^/bigquery/v2/projects/${config.queryProjectId}/queries/[A-Za-z0-9_-]{1,200}$`).test(read.path) && read.method === "GET" && read.body === undefined && queryJobs.has(read.path.split("/").at(-1)!)) allowed = keys.every(key=>["location","maxResults","pageToken","timeoutMs"].includes(key)) && read.query.location === config.location && read.query.maxResults === "1000" && read.query.timeoutMs === "8000";
    }
    if (!allowed || keys.some(key=> { const value=read.query[key]; return typeof value !== "string" || value.length>2048; })) throw new Error("Only allowlisted, bounded Google evidence reads are supported.");
    const url = new URL(read.path, read.origin); for (const [name,value] of Object.entries(read.query)) url.searchParams.set(name,value as string);
    const response = await providerRequest(url,{ method: read.method, headers: { Authorization: `Bearer ${await accessToken()}`, Accept: "application/json", ...(read.body ? { "Content-Type":"application/json" } : {}) }, ...(read.body ? { body: JSON.stringify(read.body) } : {}) },fetcher,pause);
    if (read.origin === "https://bigquery.googleapis.com" && read.method === "POST") {
      const job = sourceObject(response).jobReference as Record<string,unknown> | undefined;
      if (job) { if (job.projectId !== config.queryProjectId || typeof job.jobId !== "string" || !/^[A-Za-z0-9_-]{1,200}$/.test(job.jobId)) throw new Error("Unexpected Google billing job identity."); queryJobs.add(job.jobId); }
    }
    return response;
  };
}
export async function verifyGeminiProject(transport: AiSourceTransport, projectId: string) {
  const response = sourceObject(await transport({ method:"GET", origin:"https://cloudresourcemanager.googleapis.com",path:`/v3/projects/${projectId}`,query:{} }));
  if (response.projectId !== projectId || response.state !== "ACTIVE" || typeof response.name !== "string" || !/^projects\/\d+$/.test(response.name)) throw new Error("The Google project could not be verified.");
  return response.name;
}
