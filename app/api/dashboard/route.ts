import {NextRequest,NextResponse} from "next/server";
import {loadAll} from "@/lib/sheets";
import {previousEquivalent,resolvePeriod} from "@/lib/dates";
import {PeriodKey} from "@/lib/types";
import {analyzeDashboard} from "@/lib/analytics";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
  const q=req.nextUrl.searchParams,period=(q.get("period")||"last7") as PeriodKey;
  try{
    const rows=await loadAll(),dates=rows.map(row=>row.date).filter((date):date is string=>!!date).sort();
    const range=period==="allTime"?{start:dates[0]||"2000-01-01",end:dates[dates.length-1]||"2000-01-01"}:resolvePeriod(period,q.get("start")||undefined,q.get("end")||undefined),previous=previousEquivalent(range);
    return NextResponse.json({source:"google-sheet",range,previous,...analyzeDashboard(rows,range,previous,q.get("platform")||undefined,q.get("brand")||undefined)})
  }catch(error:any){return NextResponse.json({source:"error",error:error?.message||"Unknown data error"},{status:500})}
}
