import {NextRequest,NextResponse} from "next/server";
import {loadAll} from "@/lib/sheets";
import {previousEquivalent,resolvePeriod} from "@/lib/dates";
import {PeriodKey} from "@/lib/types";
import {analyzeDashboard} from "@/lib/analytics";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
  const q=req.nextUrl.searchParams,period=(q.get("period")||"last7") as PeriodKey,range=resolvePeriod(period,q.get("start")||undefined,q.get("end")||undefined),previous=previousEquivalent(range);
  try{const rows=await loadAll();return NextResponse.json({source:"google-sheet",range,previous,...analyzeDashboard(rows,range,previous,q.get("platform")||undefined,q.get("brand")||undefined)})}
  catch(error:any){return NextResponse.json({source:"error",range,previous,error:error?.message||"Unknown data error"},{status:500})}
}