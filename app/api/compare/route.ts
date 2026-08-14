import {NextRequest,NextResponse} from "next/server";
import {loadAll} from "@/lib/sheets";
import {analyzeComparison} from "@/lib/analytics";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
  const q=request.nextUrl.searchParams,leftBrand=q.get("leftBrand"),rightBrand=q.get("rightBrand"),leftStart=q.get("leftStart"),leftEnd=q.get("leftEnd"),rightStart=q.get("rightStart"),rightEnd=q.get("rightEnd");
  if(!leftBrand||!rightBrand||!leftStart||!leftEnd||!rightStart||!rightEnd)return NextResponse.json({error:"Both brands and date ranges are required."},{status:400});
  try{const rows=await loadAll();return NextResponse.json({source:"google-sheet",...analyzeComparison(rows,{brand:leftBrand,range:{start:leftStart,end:leftEnd}},{brand:rightBrand,range:{start:rightStart,end:rightEnd}},q.get("platform")||undefined)})}catch(error:any){return NextResponse.json({source:"error",error:error?.message||"Comparison failed"},{status:500})}
}
