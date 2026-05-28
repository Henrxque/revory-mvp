import "server-only";

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const PASSWORD_HASH_PREFIX = "scrypt";
const KEY_LENGTH = 64;

function toBuffer(value: string) {
  return Buffer.from(value, "base64url");
}

export function normalizePassword(value: string | null | undefined) {
  return value ?? "";
}

export function isPasswordStrongEnough(password: string) {
  return password.length >= 10;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  return `${PASSWORD_HASH_PREFIX}$${salt}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [prefix, salt, encodedHash] = storedHash.split("$");

  if (prefix !== PASSWORD_HASH_PREFIX || !salt || !encodedHash) {
    return false;
  }

  const expectedHash = toBuffer(encodedHash);
  const candidateHash = (await scrypt(password, salt, expectedHash.length)) as Buffer;

  if (candidateHash.length !== expectedHash.length) {
    return false;
  }

  return timingSafeEqual(candidateHash, expectedHash);
}
