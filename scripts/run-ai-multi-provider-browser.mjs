import {spawnSync} from "node:child_process";
const run=spawnSync(process.execPath,["scripts/validate-ai-integrity-sprint-1-db.mjs","scripts/validate-ai-multi-provider-db.ts"],{windowsHide:true,stdio:"inherit",env:{...process.env,REVORY_QA_MULTI_BROWSER:"true"}});
process.exitCode=run.status??1;
