"use server";

import { revalidatePath } from "next/cache";
import type { QuoteRecoveryDisposition, RevenueLeakStatus } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { getAppContext } from "@/services/app/get-app-context";

async function setDisposition(input:{id:string;status:RevenueLeakStatus;disposition:QuoteRecoveryDisposition;recoveredValueCents?:number|null}){const context=await getAppContext();if(!context)return;const finding=await prisma.quoteRecoveryFinding.findFirst({where:{id:input.id,workspaceId:context.workspace.id}});if(!finding)return;await prisma.$transaction([prisma.quoteRecoveryFinding.update({where:{id:finding.id},data:{status:input.status,disposition:input.disposition,recoveredValueCents:input.recoveredValueCents??null,dispositionedAt:new Date(),resolvedAt:input.status==="RESOLVED"?new Date():null}}),prisma.workspaceAuditEvent.create({data:{workspaceId:context.workspace.id,actorUserId:context.user.id,action:`FINDING_${input.disposition}`,metadataJson:{findingId:finding.id,estimatedValueCents:finding.valueCents,recoveredValueCents:input.recoveredValueCents??null}}})]);revalidatePath("/app/dashboard");revalidatePath("/app/revenue-leaks");revalidatePath(`/app/revenue-leaks/${input.id}`);revalidatePath("/app/history")}
export async function acknowledgeQuoteRecoveryFinding(id:string){const context=await getAppContext();if(!context)return;const finding=await prisma.quoteRecoveryFinding.findFirst({where:{id,workspaceId:context.workspace.id}});if(!finding)return;await prisma.quoteRecoveryFinding.update({where:{id},data:{status:"ACKNOWLEDGED"}});revalidatePath(`/app/revenue-leaks/${id}`)}
export async function resolveQuoteRecoveryFinding(id:string){await setDisposition({id,status:"RESOLVED",disposition:"REVIEWED"})}
export async function dismissQuoteRecoveryFinding(id:string){await setDisposition({id,status:"DISMISSED",disposition:"FALSE_POSITIVE"})}
export async function recoverQuoteRecoveryFinding(id:string,formData:FormData){const dollars=Number(formData.get("recoveredValue"));if(!Number.isFinite(dollars)||dollars<0)return;await setDisposition({id,status:"RESOLVED",disposition:"RECOVERED",recoveredValueCents:Math.round(dollars*100)})}
