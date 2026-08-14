import {NextRequest,NextResponse} from "next/server";
import {loadAll} from "@/lib/sheets";
import {previousEquivalent,resolvePeriod} from "@/lib/dates";
import {PeriodKey} from "@/lib/types";
import {analyzeBrand} from "@/lib/analytics";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
  const q=req.nextUrl.searchParams,brand=q.get("brand");
  if(!brand)return NextResponse.json({error:"brand is required"},{status:400});
  const period=(q.get("period")||"last7") as PeriodKey,range=resolvePeriod(period,q.get("start")||undefined,q.get("end")||undefined),previous=previousEquivalent(range);
  try{const rows=await loadAll();return NextResponse.json({source:"google-sheet",range,previous,...analyzeBrand(rows,brand,range,previous)})}
  catch(error:any){return NextResponse.json({error:error?.message||"Unknown data error"},{status:500})}
}