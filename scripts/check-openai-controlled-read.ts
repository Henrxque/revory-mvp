import { AI_OPENAI_SOURCE_MODE, AI_OPENAI_SOURCE_VERSION, readAiConnectedSource } from "../domain/ai-integrity/connected-sources";
import { createOpenAiReadTransport } from "../services/ai-integrity/openai-http";

const adminKey = process.env.REVORY_AI_OPENAI_ADMIN_KEY ?? "";
const organizationId = process.env.REVORY_AI_OPENAI_ORG_ID ?? "";
if (!adminKey || adminKey === process.env.OPENAI_API_KEY || !organizationId) throw new Error("Use a separate OpenAI Admin API key and organization ID in the private process environment.");
const utcDay = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10) + "T00:00:00.000Z";
const windowStart = process.env.REVORY_AI_OPENAI_READ_START ?? utcDay(2);
const windowEnd = process.env.REVORY_AI_OPENAI_READ_END ?? utcDay(1);
const artifact = await readAiConnectedSource({ workspaceId: "ws_controlled_probe", provider: "OPENAI", accountId: organizationId, windowStart, windowEnd, asOf: new Date().toISOString(), lagHours: 24 }, createOpenAiReadTransport(adminKey, organizationId), async () => {}, { mode: AI_OPENAI_SOURCE_MODE, version: AI_OPENAI_SOURCE_VERSION });
console.log(JSON.stringify({ status: "READ_COMPLETED", activity: artifact.activity, windowStart: artifact.windowStart, windowEnd: artifact.windowEnd, channels: artifact.channels.map(({ channel, rowCount }) => ({ channel, rowCount })) }));
