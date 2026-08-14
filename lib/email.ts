import {Resend} from "resend";
import {LiveRow,Platform} from "./types";
import {aggregate} from "./metrics";
import {diagnose} from "./diagnostics";
import {inRange,todayWib} from "./dates";

export type AERoute={name:string;email:string;brands:string[]};
export type WeeklyWindow={current:{start:string;end:string};baseline:{start:string;end:string}};

export function routes():AERoute[]{
  try{
    const value=JSON.parse(process.env.AE_ROUTING_JSON||"[]");
    return Array.isArray(value)?value.filter(route=>route?.name&&route?.email&&Array.isArray(route?.brands)):[];
  }catch{return[]}
}
const iso=(date:Date)=>date.toISOString().slice(0,10);
const shift=(date:Date,days:number)=>{const value=new Date(date);value.setUTCDate(value.getUTCDate()+days);return value};
export function weeklyWindows(now=new Date()):WeeklyWindow{
  const today=todayWib(now),day=today.getUTCDay(),thisMonday=shift(today,-((day+6)%7));
  const end=shift(thisMonday,-1),start=shift(end,-6),baselineEnd=shift(start,-1),baselineStart=shift(baselineEnd,-6);
  return{current:{start:iso(start),end:iso(end)},baseline:{start:iso(baselineStart),end:iso(baselineEnd)}};
}
const escapeHtml=(value:unknown)=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));

export function buildWeeklyEmail(ae:AERoute,rows:LiveRow[],now=new Date()){
  const window=weeklyWindows(now);
  const cards=ae.brands.flatMap(brand=>(["TikTok","Shopee"] as Platform[]).map(platform=>{
    const currentRows=rows.filter(row=>row.brand===brand&&row.platform===platform&&inRange(row.date,window.current));
    const baselineRows=rows.filter(row=>row.brand===brand&&row.platform===platform&&inRange(row.date,window.baseline));
    if(!currentRows.length)return"";
    const current=aggregate(currentRows),baseline=aggregate(baselineRows),diagnostic=diagnose(current,baseline,platform);
    return `<div style="border:1px solid #e4e7ec;border-radius:12px;padding:16px;margin:12px 0">
      <b>${escapeHtml(brand)} - ${platform}</b>
      <p><b>Result:</b> ${diagnostic.resultStatus}; GMV/H Rp ${Math.round(current.gmvPerHour).toLocaleString("id-ID")}</p>
      <p><b>Driver:</b> ${escapeHtml(diagnostic.primaryDriver)}</p>
      <p><b>Diagnosis:</b> ${escapeHtml(diagnostic.summary)} (Confidence: ${diagnostic.confidence})</p>
      <p><b>Action:</b> ${escapeHtml(diagnostic.actions[0])}</p>
      <p><b>Owner:</b> ${escapeHtml(diagnostic.owner)}</p>
    </div>`;
  })).join("");
  return{
    subject:`Weekly Live Performance - ${ae.name} - ${window.current.start} to ${window.current.end}`,
    html:`<div style="font-family:Arial,sans-serif;max-width:760px"><h2>Weekly Live Commerce Brief</h2><p>${window.current.start} through ${window.current.end} WIB</p><p>Result &rarr; Driver &rarr; Diagnosis &rarr; Action &rarr; Owner</p>${cards||"<p>No mapped live data for the reporting week.</p>"}</div>`,
    window
  };
}
export async function sendWeekly(ae:AERoute,rows:LiveRow[],now=new Date()){
  if(process.env.EMAIL_SENDING_ENABLED!=="true")throw new Error("Email sending is disabled. Set EMAIL_SENDING_ENABLED=true only after routing, sender, credentials, and production behavior are verified.");
  if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM)throw new Error("Email credentials are missing.");
  const message=buildWeeklyEmail(ae,rows,now),resend=new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({from:process.env.EMAIL_FROM,to:ae.email,subject:message.subject,html:message.html});
}
