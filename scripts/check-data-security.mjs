import { PrismaClient } from "@prisma/client";
import { readdirSync } from "node:fs";
const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL explicitly; this audit does not load secret files.");
const parsed = new URL(url);
const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
const client = new PrismaClient({ datasourceUrl: url, log: [] });
try {
  const result = await client.$transaction(async tx => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const [role] = await tx.$queryRawUnsafe("SELECT rolsuper AS superuser, rolcreatedb AS create_database, rolcreaterole AS create_role, rolbypassrls AS bypass_rls, rolreplication AS replication FROM pg_roles WHERE rolname=current_user");
    const memberships = await tx.$queryRawUnsafe("SELECT p.rolname AS role FROM pg_roles p WHERE p.rolname IN ('neon_superuser','pg_read_all_data','pg_write_all_data') AND pg_has_role(current_user,p.oid,'MEMBER')");
    const tables = await tx.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    const names = tables.map(t=>t.tablename);
    const migrations = names.includes("_prisma_migrations") ? await tx.$queryRawUnsafe("SELECT migration_name FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL") : [];
    const localMigrations = readdirSync("prisma/migrations", { withFileTypes: true }).filter(p=>p.isDirectory()).map(p=>p.name);
    const pendingMigrations = localMigrations.filter(name=>!migrations.some(m=>m.migration_name===name));
    const job = names.includes("operational_job_states") ? await tx.$queryRawUnsafe(`SELECT status, "lastSucceededAt", "leaseUntil" FROM public.operational_job_states WHERE key='RETENTION'`) : [];
    const [ownership] = await tx.$queryRawUnsafe("SELECT (SELECT count(*)::int FROM pg_tables WHERE schemaname='public' AND tableowner=current_user) AS owned_tables, has_schema_privilege(current_user,'public','CREATE') AS can_create_objects");
    const [size] = await tx.$queryRawUnsafe("SELECT pg_database_size(current_database())::text AS bytes");
    const admin = Object.values(role).some(Boolean) || memberships.some(m=>["neon_superuser","pg_read_all_data","pg_write_all_data"].includes(m.role));
    const blockers = [
      ...(admin ? ["RUNTIME_HAS_ADMINISTRATIVE_ACCESS"] : []),
      ...(!local && !["require","verify-ca","verify-full"].includes(parsed.searchParams.get("sslmode")) ? ["TLS_NOT_EXPLICITLY_REQUIRED"] : []),
      ...(ownership.owned_tables || ownership.can_create_objects ? ["RUNTIME_CAN_CHANGE_SCHEMA"] : []),
      ...(pendingMigrations.length ? ["PENDING_MIGRATIONS"] : []),
      ...(!job[0]?.lastSucceededAt || job[0].status!=="SUCCEEDED" || Date.now()-new Date(job[0].lastSucceededAt).valueOf()>36*3600000 ? ["RETENTION_SUCCESS_NOT_CURRENT"] : []),
    ];
    return { readOnly: true, scope: "Configured datasource only; provider backup and credential-rotation evidence are separate.", local,
      roleFlags: role, runtimeSchemaPrivileges: ownership, databaseBytes: size.bytes, tableCount: names.length, pendingMigrations,
      retention: job[0]??null, blockers, status: blockers.length ? "NOT_READY" : "DATASOURCE_CHECKS_PASS" };
  }, { timeout: 20000 });
  console.log(JSON.stringify(result,null,2));
  if(result.blockers.length)process.exitCode=2;
} catch { console.error("Data-security audit failed; details suppressed to protect credentials and customer data.");process.exitCode=1; }
finally { await client.$disconnect(); }
