import {NextRequest,NextResponse} from "next/server";
import {loadAll} from "@/lib/sheets";
import {buildWeeklyEmail,routes,sendWeekly} from "@/lib/email";

export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
  const supplied=request.headers.get("authorization");
  if(process.env.CRON_SECRET&&supplied!==`Bearer ${process.env.CRON_SECRET}`)return new NextResponse("Unauthorized",{status:401});
  const rows=await loadAll(),routing=routes(),enabled=process.env.EMAIL_SENDING_ENABLED==="true";
  if(!enabled)return NextResponse.json({ok:true,mode:"disabled",sent:0,routes:routing.map(route=>({name:route.name,email:route.email,brands:route.brands,preview:buildWeeklyEmail(route,rows)}))});
  const results=[];
  for(const route of routing)results.push({ae:route.email,result:await sendWeekly(route,rows)});
  return NextResponse.json({ok:true,mode:"send",sent:results.length,results});
}
