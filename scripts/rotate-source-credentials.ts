import { prisma } from "../db/prisma";
import { rewrapSourceCredentials } from "../services/ai-integrity/rotate-credentials";
const apply = process.argv.includes("--apply");
if (!process.env.DATABASE_URL) throw new Error("Set the target DATABASE_URL explicitly.");
if (apply && process.env.REVORY_CREDENTIAL_ROTATION_ACK !== "REWRAP_EXISTING_SOURCE_CREDENTIALS") throw new Error("Explicit rewrap acknowledgment is required.");
try {
  console.log(JSON.stringify(await rewrapSourceCredentials({ apply }), null, 2));
} catch { console.error("Credential rewrap failed. Keep the previous key versions; no secret details are logged.");process.exitCode=1; }
finally { await prisma.$disconnect(); }
