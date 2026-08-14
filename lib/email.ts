import { Resend } from "resend";
import { aggregate } from "./metrics";
import { diagnose } from "./diagnostics";
import { LiveRow } from "./types";

type Route={name:string;email:string;brands:string[]};

export function routes():Route[]{
  try{return JSON.parse(process.env.AE_ROUTING_JSON||"[]")}catch{return []}
}

export function buildDailyEmail(ae:Route, rows:LiveRow[]){
  const cards=ae.brands.flatMap(brand=>
    (["TikTok","Shopee"] as const).map(platform=>{
      const p=rows.filter(r=>r.brand===brand&&r.platform===platform).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
      if(!p.length)return "";
      const split=Math.max(1,Math.ceil(p.length/2));
      const cur=aggregate(p.slice(0,split)), base=aggregate(p.slice(split).length?p.slice(split):p.slice(0,split));
      const d=diagnose(cur,base);
      return `<div style="border:1px solid #e4e7ec;border-radius:12px;padding:16px;margin:12px 0">
      <b>${brand} · ${platform} · ${d.status}</b>
      <p><b>GMV/H:</b> Rp ${Math.round(cur.gmvPerHour).toLocaleString("id-ID")}</p>
      <p><b>Main driver:</b> ${d.primaryDriver}</p>
      <p>${d.summary}</p>
      <p><b>Action today:</b> ${d.actions[0]}</p>
      <p><b>Owner:</b> AE / Live Manager depending on escalation.</p></div>`;
    })
  ).join("");
  return {
    subject:`Daily Live Performance · ${ae.name}`,
    html:`<div style="font-family:Arial,sans-serif;max-width:720px"><h2>Daily Live Commerce Brief</h2>
    <p>Result → Driver → Diagnosis → Action → Owner</p>${cards||"<p>No mapped account data.</p>"}</div>`
  };
}

export async function sendDaily(ae:Route, rows:LiveRow[]){
  if(!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
  const resend=new Resend(process.env.RESEND_API_KEY);
  const msg=buildDailyEmail(ae,rows);
  return resend.emails.send({from:process.env.EMAIL_FROM!,to:ae.email,subject:msg.subject,html:msg.html});
}
