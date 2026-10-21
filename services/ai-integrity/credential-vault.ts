import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type SourceCredentialScope = { workspaceId: string; connectionId: string; provider: "OPENAI" | "STRIPE"; generation: number };
export type SealedSourceCredential = { keyVersion: string; iv: string; authTag: string; ciphertext: string };
const VERSION = /^[a-zA-Z0-9_-]{1,40}$/;
const base64 = (text: string, length?: number) => {
  const bytes = Buffer.from(text, "base64");
  if (bytes.toString("base64") !== text || (length !== undefined && bytes.length !== length)) throw new Error("Source credential storage is unavailable.");
  return bytes;
};

function keyring() {
  try {
    const active = process.env.REVORY_AI_CONNECTION_ACTIVE_KEY ?? "";
    const raw: unknown = JSON.parse(process.env.REVORY_AI_CONNECTION_KEYRING ?? "{}");
    if (!VERSION.test(active) || !raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error();
    const entries = Object.entries(raw);
    if (!entries.length || entries.length > 4 || entries.some(([version, value]) => !VERSION.test(version) || typeof value !== "string")) throw new Error();
    const keys = new Map(entries.map(([version, value]) => [version, base64(value as string, 32)]));
    if (!keys.has(active)) throw new Error();
    return { active, keys };
  } catch { throw new Error("Source credential storage is unavailable."); }
}

export function isSourceCredentialStorageConfigured() {
  try { keyring(); return true; } catch { return false; }
}

function associatedData(scope: SourceCredentialScope, keyVersion: string) {
  if (!scope.workspaceId || !scope.connectionId || !["OPENAI", "STRIPE"].includes(scope.provider) || !Number.isSafeInteger(scope.generation) || scope.generation < 1) throw new Error("Invalid source credential scope.");
  return Buffer.from(JSON.stringify(["revory-source-credential/v1", keyVersion, scope.workspaceId, scope.connectionId, scope.provider, scope.generation]), "utf8");
}

export function sealSourceCredential(secret: string, scope: SourceCredentialScope): SealedSourceCredential {
  if (typeof secret !== "string" || secret.length < 16 || secret.length > 512 || /\s/.test(secret)) throw new Error("Invalid source credential.");
  const { active, keys } = keyring();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keys.get(active)!, iv);
  cipher.setAAD(associatedData(scope, active));
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return { keyVersion: active, iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") };
}

export function openSourceCredential(envelope: SealedSourceCredential, scope: SourceCredentialScope) {
  try {
    const { keys } = keyring();
    const key = keys.get(envelope.keyVersion);
    if (!key || envelope.ciphertext.length > 1024) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", key, base64(envelope.iv, 12));
    decipher.setAAD(associatedData(scope, envelope.keyVersion));
    decipher.setAuthTag(base64(envelope.authTag, 16));
    const value = Buffer.concat([decipher.update(base64(envelope.ciphertext)), decipher.final()]).toString("utf8");
    if (value.length < 16 || value.length > 512 || /\s/.test(value)) throw new Error();
    return value;
  } catch { throw new Error("Source credential could not be opened."); }
}
