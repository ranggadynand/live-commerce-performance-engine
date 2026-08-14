import {Diagnostic,Metrics,Platform,Health,ResultStatus} from "./types";
import {movement} from "./metrics";

type D={name:string;value?:number;action:string};

function resultStatus(c:Metrics,b:Metrics):ResultStatus{
  if(b.sessions===0||b.hours===0)return"N/A";
  const m=movement(c.gmvPerHour,b.gmvPerHour);
  if(m==null)return"N/A";
  if(m>=.10)return"ABOVE";
  if(m<=-.10)return"BELOW";
  return"ON TRACK"
}
export function diagnose(c:Metrics,b:Metrics,p:Platform):Diagnostic{
  const ds:D[]=p==="TikTok"?[
    {name:"Traffic / Entry",value:movement(c.err,b.err),action:"Review traffic source, account health, opening execution and entry-room appeal."},
    {name:"Retention",value:movement(c.avd,b.avd),action:"Review host pacing, dead air, demo frequency and PK/use-case loop."},
    {name:"Engagement",value:movement(c.engagementRate,b.engagementRate),action:"Increase questions, interaction triggers and comment hooks."},
    {name:"Product Click Intent",value:movement(c.ctr,b.ctr),action:"Review pinned SKU, product bridging, demo clarity, promo communication and CTA."},
    {name:"Conversion",value:movement(c.coRate,b.coRate),action:"Check promo competitiveness, stock, voucher, PDP, objections and closing."},
    {name:"Basket Size",value:movement(c.aov,b.aov),action:"Push bundles, quantity ladders, upsell and cross-sell."},
    {name:"Viewer Monetization",value:movement(c.watchGpm,b.watchGpm),action:"Audit viewer-to-order chain; monetization per 1K viewers weakened."}
  ]:[
    {name:"Traffic Efficiency",value:movement(c.viewsPerHour,b.viewsPerHour),action:"Review slot, traffic source, platform support and session duration."},
    {name:"Retention",value:movement(c.avd,b.avd),action:"Review host pacing, demo density, dead air and interaction loop."},
    {name:"View-to-Order",value:movement(c.viewsToCo,b.viewsToCo),action:"Review promo competitiveness, offer clarity, trust objections and closing."},
    {name:"Basket Size",value:movement(c.aov,b.aov),action:"Push bundles, quantity ladder, upsell and cross-sell."},
    {name:"Viewer Monetization",value:movement(c.watchGpm,b.watchGpm),action:"Audit conversion and basket quality per 1K viewers."}
  ];
  const clean=ds.filter(x=>x.value!=null),worst=[...clean].sort((a,b)=>(a.value??0)-(b.value??0))[0];
  let health:Health="HEALTHY";
  const w=worst?.value;
  if(w!=null&&w<=-.25)health="CRITICAL";else if(w!=null&&w<=-.10)health="WATCH";
  const primary=worst&&(worst.value??0)<-.08?worst.name:"No dominant funnel break";
  const rs=resultStatus(c,b);
  const summary=`Result ${rs}; GMV/H ${movement(c.gmvPerHour,b.gmvPerHour)==null?"N/A":`${(movement(c.gmvPerHour,b.gmvPerHour)!*100).toFixed(1)}%`} vs previous equivalent period. `+
    (primary==="No dominant funnel break"?"Funnel is relatively stable.":`Largest negative signal: ${primary} ${((worst?.value??0)*100).toFixed(1)}%.`);
  const actions=primary==="No dominant funnel break"||!worst?["Maintain execution and inspect session-level outliers."]:[worst.action];
  const observed=clean.length;
  const confidence:"HIGH"|"MEDIUM"|"LOW"=c.sessions>=8&&b.sessions>=8&&observed>=3?"HIGH":c.sessions>=2&&b.sessions>=2&&observed>=2?"MEDIUM":"LOW";
  const owner=health==="CRITICAL"?"AE + Live Manager":"AE";
  return{resultStatus:rs,funnelHealth:health,primaryDriver:primary,summary,actions,owner,confidence}
}
