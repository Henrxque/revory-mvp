import assert from "node:assert/strict";

export function databaseIdentity(connectionString) {
  const parsed = new URL(connectionString);
  assert.match(parsed.protocol, /^postgres(?:ql)?:$/, "PostgreSQL required.");
  return { database: parsed.pathname.replace(/^\//, ""), host: parsed.hostname.toLowerCase().replace("-pooler.", "."), port: parsed.port || "5432" };
}
export function assertIsolatedRestore(source, target) {
  assert.notEqual(databaseIdentity(source).host, databaseIdentity(target).host, "Restore requires a distinct endpoint, including pooled/direct aliases.");
}
const quote = value => `"${value.replaceAll('"', '""')}"`;
export async function readRestoreManifest(client) {
  return client.$transaction(async tx => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '15000ms'");
    const tables = await tx.$queryRawUnsafe("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name");
    const columns = await tx.$queryRawUnsafe("SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position");
    const constraints = await tx.$queryRawUnsafe("SELECT c.relname AS table_name,con.conname,pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con JOIN pg_class c ON con.conrelid=c.oid JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='public' ORDER BY c.relname,con.conname");
    const rows = [];
    for (const { table_name: table } of tables) {
      const [row] = await tx.$queryRawUnsafe(`SELECT count(*)::text AS rows, encode(sha256(convert_to(COALESCE(string_agg(encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex'),'' ORDER BY encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex')),''),'UTF8')),'hex') AS digest FROM public.${quote(table)} t`);
      rows.push({ table, ...row });
    }
    return { columns, constraints, rows };
  }, { timeout: 120000, maxWait: 15000 });
}
export function compareRestoreManifests(source, target) {
  assert.deepEqual(target.columns, source.columns, "Restored columns differ from source.");
  assert.deepEqual(target.constraints, source.constraints, "Restored constraints differ from source.");
  assert.ok(source.rows.length, "An empty schema does not prove application recovery.");
  assert.deepEqual(target.rows, source.rows, "Restored row counts/content differ. Live-source drift requires investigation, never a PASS override.");
  return { structuralMatch: true, contentHashesMatch: true, tablesChecked: source.rows.length,
    sourceRows: source.rows.reduce((sum,row)=>sum+BigInt(row.rows),0n).toString(), countMismatches: 0 };
}
