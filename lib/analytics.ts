import {aggregate,movement} from "./metrics";
import {diagnose} from "./diagnostics";
import {DateRange,LiveRow,Metrics,Platform} from "./types";
import {inRange} from "./dates";
const platforms:Platform[]=["TikTok","Shopee"];
const group=<T,>(rows:LiveRow[],key:(r:LiveRow)=>string|undefined,make:(name:string,rows:LiveRow[])=>T)=>{const m=new Map<string,LiveRow[]>();for(const r of rows){const k=(key(r)||"Unknown").trim()||"Unknown";m.set(k,[...(m.get(k)||[]),r])}return[...m.entries()].map(([n,rs])=>make(n,rs))};
const ratio=(v?:number,b?:number)=>v==null||b==null||b<=0?undefined:Math.max(0,Math.min(2,v/b));
function weightedScore(parts:{v?:number;w:number}[]){
  const valid=parts.filter(x=>x.v!=null);
  const tw=valid.reduce((a,b)=>a+b.w,0);
  return tw?Math.round(valid.reduce((a,b)=>a+(b.v||0)*b.w,0)/tw*100):0
}
export function hostScore(h:Metrics,b:Metrics,p:Platform){
  if(p==="TikTok")return weightedScore([
    {v:ratio(h.gmvPerHour,b.gmvPerHour),w:.35},{v:ratio(h.avd,b.avd),w:.10},{v:ratio(h.engagementRate,b.engagementRate),w:.10},
    {v:ratio(h.ctr,b.ctr),w:.15},{v:ratio(h.coRate,b.coRate),w:.15},{v:ratio(h.watchGpm,b.watchGpm),w:.10},{v:ratio(h.showGpm,b.showGpm),w:.05}
  ]);
  return weightedScore([
    {v:ratio(h.gmvPerHour,b.gmvPerHour),w:.35},{v:ratio(h.viewsPerHour,b.viewsPerHour),w:.20},{v:ratio(h.avd,b.avd),w:.10},
    {v:ratio(h.viewsToCo,b.viewsToCo),w:.20},{v:ratio(h.aov,b.aov),w:.05},{v:ratio(h.watchGpm,b.watchGpm),w:.10}
  ])
}
function validSession(r:LiveRow){
  const minHours=.5;
  return (r.duration??0)>=minHours&&(r.views??0)>0&&(r.gmv??0)>=0
}
function consistency(rows:LiveRow[]){
  const vals=rows.filter(validSession).map(r=>aggregate([r]).gmvPerHour).filter(v=>v>0);
  if(vals.length<2)return 100;
  const mean=vals.reduce((a,b)=>a+b,0)/vals.length;
  const sd=Math.sqrt(vals.reduce((a,b)=>a+(b-mean)**2,0)/vals.length);
  const cv=mean?sd/mean:1;
  return Math.max(0,Math.round((1-Math.min(cv,1))*100))
}
export function analyzePlatform(rows:LiveRow[],prevRows:LiveRow[],platform:Platform){
  const cur=rows.filter(r=>r.platform===platform),prev=prevRows.filter(r=>r.platform===platform),current=aggregate(cur),previous=aggregate(prev),d=diagnose(current,previous.sessions?previous:current,platform);
  const sessions=cur.filter(validSession).map(r=>({...r,metrics:aggregate([r]),lowSample:(r.duration??0)<1})).sort((a,b)=>b.metrics.gmvPerHour-a.metrics.gmvPerHour);
  const hosts=group(cur,r=>r.host,(name,rs)=>{const metrics=aggregate(rs);return{name,metrics,score:hostScore(metrics,current,platform),consistency:consistency(rs)}})
    .filter(x=>x.name!=="Unknown"&&x.metrics.hours>=4).sort((a,b)=>b.score-a.score);
  const timeSlots=group(cur,r=>r.slot,(name,rs)=>({name,metrics:aggregate(rs)})).filter(x=>x.name!=="Unknown").sort((a,b)=>b.metrics.gmvPerHour-a.metrics.gmvPerHour);
  const days=group(cur,r=>r.day,(name,rs)=>({name,metrics:aggregate(rs)})).filter(x=>x.name!=="Unknown").sort((a,b)=>b.metrics.gmvPerHour-a.metrics.gmvPerHour);
  const campaigns=group(cur,r=>r.campaignType,(name,rs)=>({name,metrics:aggregate(rs)})).filter(x=>x.name!=="Unknown").sort((a,b)=>b.metrics.gmvPerHour-a.metrics.gmvPerHour);
  const dataWarnings=cur.flatMap(r=>r.dataWarnings||[]);
  return{
    platform,current,previous,diagnostics:d,
    delta:{gmv:movement(current.gmv,previous.gmv),gmvh:movement(current.gmvPerHour,previous.gmvPerHour),views:movement(current.views,previous.views),viewsPerHour:movement(current.viewsPerHour,previous.viewsPerHour),avd:movement(current.avd,previous.avd),ctr:movement(current.ctr,previous.ctr),coRate:movement(current.coRate,previous.coRate),viewsToCo:movement(current.viewsToCo,previous.viewsToCo),aov:movement(current.aov,previous.aov),watchGpm:movement(current.watchGpm,previous.watchGpm)},
    bestSession:sessions[0]||null,worstSession:sessions.length?sessions[sessions.length-1]:null,hosts,bestHost:hosts[0]||null,worstHost:hosts.length?hosts[hosts.length-1]:null,timeSlots,days,campaigns,sessions:sessions.slice(0,100),
    consistency:consistency(cur),dataQuality:{warnings:dataWarnings.length,rows:cur.length}
  }
}
export function analyzeBrand(all:LiveRow[],brand:string,range:DateRange,prev:DateRange){
  const c=all.filter(r=>r.brand===brand&&inRange(r.date,range)),p=all.filter(r=>r.brand===brand&&inRange(r.date,prev));
  return{brand,platforms:platforms.map(x=>analyzePlatform(c,p,x)).filter(x=>x.current.sessions>0||x.previous.sessions>0)}
}
export function analyzeDashboard(all:LiveRow[],range:DateRange,prev:DateRange,pf?:string,bf?:string){
  let c=all.filter(r=>inRange(r.date,range)),p=all.filter(r=>inRange(r.date,prev));
  if(pf&&pf!=="All"){c=c.filter(r=>r.platform===pf);p=p.filter(r=>r.platform===pf)}
  if(bf&&bf!=="All"){c=c.filter(r=>r.brand===bf);p=p.filter(r=>r.brand===bf)}
  const brands=[...new Set(c.map(r=>r.brand))].sort();
  const cards=brands.map(brand=>{
    const cr=c.filter(r=>r.brand===brand),pr=p.filter(r=>r.brand===brand),bp=platforms.map(x=>analyzePlatform(cr,pr,x)).filter(x=>x.current.sessions>0),ca=aggregate(cr),pa=aggregate(pr),gd=movement(ca.gmvPerHour,pa.gmvPerHour);
    const performanceScore=Math.round((bp.reduce((a,x)=>a+(x.bestHost?.score||100),0)/(bp.length||1)+bp.reduce((a,x)=>a+x.consistency,0)/(bp.length||1))/2);
    const status=bp.some(x=>x.diagnostics.funnelHealth==="CRITICAL")?"CRITICAL":bp.some(x=>x.diagnostics.funnelHealth==="WATCH")?"WATCH":"HEALTHY";
    return{brand,current:ca,previous:pa,gmvhDelta:gd,platforms:bp,status,performanceScore}
  }).sort((a,b)=>b.current.gmv-a.current.gmv);
  const cur=aggregate(c),pre=aggregate(p),growth=[...cards].filter(x=>x.gmvhDelta!=null).sort((a,b)=>(b.gmvhDelta??0)-(a.gmvhDelta??0));
  const sessions=c.filter(validSession).map(r=>({...r,metrics:aggregate([r])})).sort((a,b)=>b.metrics.gmvPerHour-a.metrics.gmvPerHour);
  const hosts=platforms.flatMap(platform=>{const rs=c.filter(r=>r.platform===platform),base=aggregate(rs);return group(rs,r=>r.host,(name,hrs)=>{const metrics=aggregate(hrs);return{name,platform,metrics,score:hostScore(metrics,base,platform)}}).filter(x=>x.name!=="Unknown"&&x.metrics.hours>=4)}).sort((a,b)=>b.score-a.score);
  const avgHours=cards.length?cards.reduce((a,b)=>a+b.current.hours,0)/cards.length:0,avgGmvh=cards.length?cards.reduce((a,b)=>a+b.current.gmvPerHour,0)/cards.length:0;
  const efficiency=cards.map(x=>({...x,quadrant:x.current.hours>=avgHours?(x.current.gmvPerHour>=avgGmvh?"SCALE":"FIX"):(x.current.gmvPerHour>=avgGmvh?"OPPORTUNITY":"REVIEW")}));
  const priority=[...cards].sort((a,b)=>{
    const rank=(x:any)=>x.status==="CRITICAL"?0:x.status==="WATCH"?1:2;
    return rank(a)-rank(b)||((a.gmvhDelta??0)-(b.gmvhDelta??0))
  }).slice(0,10);
  const dataWarnings=c.reduce((a,r)=>a+(r.dataWarnings?.length||0),0);
  return{
    summary:{current:cur,previous:pre,gmvhDelta:movement(cur.gmvPerHour,pre.gmvPerHour),dataWarnings},
    brands:cards,
    efficiency,
    priority,
    highlights:{bestSession:sessions[0]||null,worstSession:sessions.length?sessions[sessions.length-1]:null,bestHost:hosts[0]||null,worstHost:hosts.length?hosts[hosts.length-1]:null,topGrowth:growth[0]||null,biggestDecline:growth.length?growth[growth.length-1]:null}
  }
}
