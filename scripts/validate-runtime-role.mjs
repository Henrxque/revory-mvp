import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { runtimeRolePolicy } from "./lib/runtime-role-policy.mjs";
import { dedicatedMigrationDatasource } from "./lib/migration-datasource.mjs";

export async function verifyRuntimeRole(url) {
 const parsed = new URL(url);
 assert.ok(["localhost","127.0.0.1","::1"].includes(parsed.hostname));
 assert.match(parsed.pathname,/^\/revory_sprint1_[a-f0-9]{12}$/);
 const admin = new PrismaClient({ datasourceUrl: url, log: [] });
 const role = "revory_qa_"+randomBytes(6).toString("hex");
 const runtimeUrl = new URL(url);runtimeUrl.username=role;runtimeUrl.password="";
 const runtime = new PrismaClient({ datasourceUrl: runtimeUrl.toString(), log: [] });
 let created=false;
 try{
   const [{ current_user: migrator }] = await admin.$queryRawUnsafe("SELECT current_user");
   const statements=runtimeRolePolicy({ runtimeRole:role,migrationRole:migrator,database:parsed.pathname.slice(1) });
   await admin.$transaction(async tx=>{for(const sql of statements)await tx.$executeRawUnsafe(sql);});created=true;
   // The local disposable cluster uses trust auth. Production gets a generated
   // password through the coordinated private-secret rollout, never this test.
   await admin.$executeRawUnsafe(`ALTER ROLE "${role}" LOGIN`);
   assert.equal((await runtime.workspace.findMany()).length,3);
   await runtime.workspace.update({where:{id:"security-ws-0"},data:{name:"Runtime CRUD fixture"}});
   for(const sql of ["CREATE TABLE forbidden_runtime_table(id text)","CREATE ROLE forbidden_runtime_role","CREATE DATABASE forbidden_runtime_database","SET ROLE postgres","DELETE FROM public._prisma_migrations"]) await assert.rejects(()=>runtime.$executeRawUnsafe(sql));
   assert.throws(()=>runtimeRolePolicy({runtimeRole:"neondb_owner",migrationRole:migrator,database:"fixture"}));
   assert.throws(()=>dedicatedMigrationDatasource("postgresql://r:fixture@ep-prod-pooler.test/db?sslmode=require","postgresql://m:fixture@ep-other.test/db?sslmode=require"));
   assert.throws(()=>dedicatedMigrationDatasource("postgresql://r:fixture@ep-prod-pooler.test/db?sslmode=require","postgresql://m:fixture@ep-prod.test/other?sslmode=require"));
   assert.throws(()=>dedicatedMigrationDatasource("postgresql://r:fixture@ep-prod-pooler.test/db?sslmode=require","postgresql://m:fixture@ep-prod.test/db"));
   assert.ok(dedicatedMigrationDatasource("postgresql://r:fixture@ep-prod-pooler.test/db?sslmode=require","postgresql://m:fixture@ep-prod.test/db?sslmode=require"));
   return {crud:true,ddlDenied:true,createRoleDenied:true,createDatabaseDenied:true,roleEscalationDenied:true,migrationHistoryWriteDenied:true,migrationTargetDriftDenied:true};
 }finally{
   await runtime.$disconnect();
   if(created){await admin.$executeRawUnsafe(`DROP OWNED BY "${role}"`);await admin.$executeRawUnsafe(`DROP ROLE "${role}"`);}
   await admin.$disconnect();
 }
}
