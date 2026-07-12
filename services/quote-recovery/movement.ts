import "server-only";

import { prisma } from "@/db/prisma";
import { classifyQuoteRecoveryMovement,type MovementFinding } from "@/domain/revory/movement";

function snapshot(value: unknown): MovementFinding[]{return Array.isArray(value)?value.filter((item):item is MovementFinding=>Boolean(item&&typeof item==="object"&&"fingerprint" in item)):[]}
export async function getQuoteRecoveryMovement(workspaceId:string){const [current,previous]=await prisma.quoteRecoveryAnalysisRun.findMany({where:{workspaceId},orderBy:{createdAt:"desc"},take:2});if(!current)return {hasComparison:false,newCount:0,persistentCount:0,worseningCount:0,resolvedCount:0,recoveredCount:0,recoveredValueCents:0,current:null,previous:null};const movement=classifyQuoteRecoveryMovement(snapshot(current.findingSnapshotJson),snapshot(previous?.findingSnapshotJson));const recovered=await prisma.quoteRecoveryFinding.aggregate({where:{workspaceId,disposition:"RECOVERED",dispositionedAt:previous?.createdAt?{gte:previous.createdAt}:undefined},_count:{_all:true},_sum:{recoveredValueCents:true}});return {hasComparison:Boolean(previous),...movement,recoveredCount:recovered._count._all,recoveredValueCents:recovered._sum.recoveredValueCents??0,current,previous:previous??null}}
