import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import { sendWeeklyQuoteRecoveryDigest } from "@/services/email/weekly-quote-recovery-digest";

export async function POST(request:Request){const startedAt=Date.now(),secret=process.env.CRON_SECRET?.trim();if(!secret)return NextResponse.json({error:"Digest job is not configured."},{status:503});if(request.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({error:"Unauthorized"},{status:401});const preferences=await prisma.quoteRecoveryDigestPreference.findMany({where:{enabled:true},select:{workspaceId:true}});const results=[];for(const preference of preferences)results.push(await sendWeeklyQuoteRecoveryDigest(preference.workspaceId));console.log(JSON.stringify({level:"info",message:"weekly_digest_job_complete",workspaces:preferences.length,sent:results.filter((result)=>result.sent).length,durationMs:Date.now()-startedAt}));return NextResponse.json({processed:preferences.length,sent:results.filter((result)=>result.sent).length})}
