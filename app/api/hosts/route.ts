import {NextRequest,NextResponse} from "next/server";
import {loadAll} from "@/lib/sheets";
import {analyzeHostReport} from "@/lib/analytics";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
  const q=request.nextUrl.searchParams,start=q.get("start"),end=q.get("end");
  if(!start||!end)return NextResponse.json({error:"start and end are required"},{status:400});
  try{const rows=await loadAll();return NextResponse.json({source:"google-sheet",...analyzeHostReport(rows,{start,end},q.get("platform")||undefined,q.get("brand")||undefined)})}catch(error:any){return NextResponse.json({source:"error",error:error?.message||"Host report failed"},{status:500})}
}
