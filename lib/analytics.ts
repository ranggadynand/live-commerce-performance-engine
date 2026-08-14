import {aggregate,movement} from "./metrics";
import {diagnose} from "./diagnostics";
import {DataWarning,DateRange,LiveRow,Metrics,Platform} from "./types";
import {inRange} from "./dates";

const platforms:Platform[]=["TikTok","Shopee"];
const group=<T,>(rows:LiveRow[],key:(r:LiveRow)=>string|undefined,make:(name:string,rows:LiveRow[])=>T)=>{
  const map=new Map<string,LiveRow[]>();
  for(const row of rows){const name=(key(row)||"Unknown").trim()||"Unknown";map.set(name,[...(map.get(name)||[]),row])}
  return [...map.entries()].map(([name,items])=>make(name,items));
};
const ratio=(value?:number,baseline?:number)=>value==null||baseline==null||baseline<=0?undefined:Math.max(0,Math.min(2,value/baseline));
const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);if(!sorted.length)return 0;const middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2};
const isoDate=(date:Date)=>date.toISOString().slice(0,10);
const calendarMonth=(value:string,offset:number)=>{const date=new Date(value+"T00:00:00Z"),start=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+offset,1)),end=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+offset+1,0));return{start:isoDate(start),end:isoDate(end)}};
const average=(values:(number|undefined)[])=>{const valid=values.filter((value):value is number=>Number.isFinite(value));return valid.length?valid.reduce((total,value)=>total+value,0)/valid.length:undefined};
const total=(rows:LiveRow[],key:keyof LiveRow)=>rows.reduce((sum,row)=>sum+(Number.isFinite(row[key] as number)?Number(row[key]):0),0);
const metricConfigs={
  All:[{key:"views",label:"Views",format:"number",target:"viewsTarget"},{key:"conversion",label:"Conversion",format:"percent"},{key:"aov",label:"AOV",format:"money",target:"aovTarget"},{key:"gmv",label:"GMV",format:"money",target:"gmvTarget"}],
  Shopee:[{key:"views",label:"Views",format:"number",target:"viewsTarget"},{key:"viewsToCo",label:"Views to Order",format:"percent",target:"viewsToCoTarget"},{key:"orders",label:"Orders",format:"number"},{key:"aov",label:"AOV",format:"money",target:"aovTarget"},{key:"gmv",label:"GMV",format:"money",target:"gmvTarget"}],
  TikTok:[{key:"impressions",label:"Impressions",format:"number"},{key:"err",label:"ERR",format:"percent",target:"errTarget"},{key:"views",label:"Views",format:"number",target:"viewsTarget"},{key:"productImpressions",label:"Product Impressions",format:"number"},{key:"ctr",label:"CTR",format:"percent",target:"ctrTarget"},{key:"productClicks",label:"Product Clicks",format:"number"},{key:"coRate",label:"Conversion",format:"percent",target:"coRateTarget"},{key:"orders",label:"Orders",format:"number"},{key:"aov",label:"AOV",format:"money",target:"aovTarget"},{key:"gmv",label:"GMV",format:"money",target:"gmvTarget"}]
} as const;
function summaryValue(rows:LiveRow[],platform:string,key:string){
  if(!rows.length)return undefined;
  const sessions=rows.length,gmv=total(rows,"gmv"),views=total(rows,"views"),orders=total(rows,"orders");
  if(key==="gmv")return gmv/sessions;
  if(key==="views")return views/sessions;
  if(key==="orders")return orders/sessions;
  if(key==="conversion")return views?orders/views:undefined;
  const metrics=aggregate(platform==="All"?rows:rows.filter(row=>row.platform===platform));
  if(["impressions","productImpressions","productClicks"].includes(key)){const value=metrics[key as keyof Metrics] as number|undefined;return value==null?undefined:value/sessions}
  return metrics[key as keyof Metrics] as number|undefined;
}
function buildSummaryMetrics(current:LiveRow[],previous:LiveRow[],lastMonth:LiveRow[],platform:string){
  const config=metricConfigs[platform as keyof typeof metricConfigs]||metricConfigs.All;
  return config.map(metric=>{
    const value=summaryValue(current,platform,metric.key),previousAverage=summaryValue(previous,platform,metric.key),lastMonthAverage=summaryValue(lastMonth,platform,metric.key);
    const target="target" in metric?average(current.map(row=>row[metric.target as keyof LiveRow] as number|undefined)):undefined;
    return{...metric,value,previousAverage,lastMonthAverage,target,deltaPrevious:movement(value,previousAverage),deltaLastMonth:movement(value,lastMonthAverage),deltaTarget:movement(value,target)};
  });
}

function weightedScore(parts:{v?:number;w:number}[]){
  const valid=parts.filter(part=>part.v!=null),weight=valid.reduce((total,part)=>total+part.w,0);
  return weight?Math.round(valid.reduce((total,part)=>total+(part.v||0)*part.w,0)/weight*100):0;
}
export function hostScore(host:Metrics,baseline:Metrics,platform:Platform){
  if(platform==="TikTok")return weightedScore([
    {v:ratio(host.gmvPerHour,baseline.gmvPerHour),w:.40},{v:ratio(host.err,baseline.err),w:.10},{v:ratio(host.ctr,baseline.ctr),w:.15},
    {v:ratio(host.coRate,baseline.coRate),w:.15},{v:ratio(host.aov,baseline.aov),w:.10},{v:ratio(host.watchGpm,baseline.watchGpm),w:.10}
  ]);
  return weightedScore([
    {v:ratio(host.gmvPerHour,baseline.gmvPerHour),w:.45},{v:ratio(host.viewsPerHour,baseline.viewsPerHour),w:.20},
    {v:ratio(host.viewsToCo,baseline.viewsToCo),w:.20},{v:ratio(host.aov,baseline.aov),w:.10},{v:ratio(host.watchGpm,baseline.watchGpm),w:.05}
  ]);
}
function validSession(row:LiveRow){return row.duration!=null&&row.duration>=.5&&row.views!=null&&row.gmv!=null}
function consistency(rows:LiveRow[]){
  const values=rows.filter(validSession).map(row=>aggregate([row]).gmvPerHour);
  if(values.length<2)return values.length?70:0;
  const mean=values.reduce((a,b)=>a+b,0)/values.length;
  if(mean===0)return values.every(value=>value===0)?100:0;
  const deviation=Math.sqrt(values.reduce((total,value)=>total+(value-mean)**2,0)/values.length);
  return Math.max(0,Math.round((1-Math.min(deviation/mean,1))*100));
}
function rankedHost(name:string,items:LiveRow[],baseline:Metrics,platform:Platform){
  const metrics=aggregate(items),stable=consistency(items),sample=Math.min(100,Math.round(metrics.sessions/6*100));
  const score=Math.round(hostScore(metrics,baseline,platform)*.8+stable*.15+sample*.05);
  return{name,metrics,score,consistency:stable,sampleScore:sample};
}
function healthFor(platformsResult:any[],quality:number,brandConsistency:number,gmvhDelta?:number){
  const resultScore=gmvhDelta==null?50:Math.max(0,Math.min(100,50+gmvhDelta*100));
  const funnelScore=platformsResult.length?platformsResult.reduce((total,item)=>total+(item.diagnostics.funnelHealth==="CRITICAL"?20:item.diagnostics.funnelHealth==="WATCH"?55:90),0)/platformsResult.length:50;
  const score=Math.round(resultScore*.4+funnelScore*.3+brandConsistency*.2+quality*.1);
  return{score,status:score>=70?"GOOD":score>=45?"WATCH":"CRITICAL"};
}

export function analyzePlatform(rows:LiveRow[],prevRows:LiveRow[],platform:Platform){
  const cur=rows.filter(row=>row.platform===platform),prev=prevRows.filter(row=>row.platform===platform);
  const current=aggregate(cur),previous=aggregate(prev),diagnostics=diagnose(current,previous,platform);
  const sessions=cur.filter(validSession).map(row=>({...row,metrics:aggregate([row]),lowSample:(row.duration??0)<1})).sort((a,b)=>b.metrics.gmvPerHour-a.metrics.gmvPerHour);
  const hosts=group(cur,row=>row.host,(name,items)=>rankedHost(name,items,current,platform))
    .filter(item=>item.name!=="Unknown"&&item.metrics.hours>=4&&item.metrics.sessions>=2).sort((a,b)=>b.score-a.score);
  const dimensions=(key:(row:LiveRow)=>string|undefined)=>group(cur,key,(name,items)=>({name,metrics:aggregate(items)})).filter(item=>item.name!=="Unknown").sort((a,b)=>b.metrics.gmvPerHour-a.metrics.gmvPerHour);
  const warnings=cur.flatMap(row=>row.dataWarnings||[]);
  return{
    platform,current,previous,diagnostics,
    delta:{gmv:movement(current.gmv,previous.gmv),gmvh:movement(current.gmvPerHour,previous.gmvPerHour),views:movement(current.views,previous.views),viewsPerHour:movement(current.viewsPerHour,previous.viewsPerHour),avd:movement(current.avd,previous.avd),ctr:movement(current.ctr,previous.ctr),coRate:movement(current.coRate,previous.coRate),viewsToCo:movement(current.viewsToCo,previous.viewsToCo),aov:movement(current.aov,previous.aov),watchGpm:movement(current.watchGpm,previous.watchGpm)},
    bestSession:sessions[0]||null,worstSession:sessions.length?sessions[sessions.length-1]:null,
    hosts,bestHost:hosts[0]||null,worstHost:hosts.length?hosts[hosts.length-1]:null,
    timeSlots:dimensions(row=>row.slot),days:dimensions(row=>row.day),campaigns:dimensions(row=>row.campaignType),sessions:sessions.slice(0,100),
    consistency:consistency(cur),dataQuality:{warnings:warnings.length,rows:cur.length,score:cur.length?Math.max(0,Math.round(100-warnings.length/cur.length*20)):0},warnings
  };
}
export function analyzeBrand(all:LiveRow[],brand:string,range:DateRange,prev:DateRange){
  const current=all.filter(row=>row.brand===brand&&inRange(row.date,range)),previous=all.filter(row=>row.brand===brand&&inRange(row.date,prev));
  return{brand,platforms:platforms.map(platform=>analyzePlatform(current,previous,platform)).filter(item=>item.current.sessions>0||item.previous.sessions>0)};
}
export function analyzeDashboard(all:LiveRow[],range:DateRange,prev:DateRange,platformFilter?:string,brandFilter?:string,asOf=isoDate(new Date())){
  const currentRange=all.filter(row=>inRange(row.date,range)),previousRange=all.filter(row=>inRange(row.date,prev));
  const filterPlatform=(row:LiveRow)=>row.brand&&(!platformFilter||platformFilter==="All"||row.platform===platformFilter);
  const availableBrands=[...new Set(currentRange.filter(filterPlatform).map(row=>row.brand))].sort();
  let current=currentRange,previous=previousRange;
  if(platformFilter&&platformFilter!=="All"){current=current.filter(row=>row.platform===platformFilter);previous=previous.filter(row=>row.platform===platformFilter)}
  if(brandFilter&&brandFilter!=="All"){current=current.filter(row=>row.brand===brandFilter);previous=previous.filter(row=>row.brand===brandFilter)}
  current=current.filter(row=>!!row.brand);previous=previous.filter(row=>!!row.brand);
  const brands=[...new Set(current.map(row=>row.brand))].sort();
  const dated=all.filter(row=>row.brand&&row.date);
  const cards=brands.map(brand=>{
    const rows=current.filter(row=>row.brand===brand),baselineRows=previous.filter(row=>row.brand===brand);
    const platformResults=platforms.map(platform=>analyzePlatform(rows,baselineRows,platform)).filter(item=>item.current.sessions>0||item.previous.sessions>0);
    const metrics=aggregate(rows),baseline=aggregate(baselineRows),gmvhDelta=movement(metrics.gmvPerHour,baseline.gmvPerHour),brandConsistency=consistency(rows);
    const warningCount=rows.reduce((total,row)=>total+(row.dataWarnings?.length||0),0),quality=rows.length?Math.max(0,Math.round(100-warningCount/rows.length*20)):0;
    const activityStatus=metrics.sessions===0&&baseline.sessions>0?"NO_LIVE":metrics.sessions>0?"ACTIVE":"NO_DATA";
    const health=healthFor(platformResults,quality,brandConsistency,gmvhDelta);
    const brandDates=dated.filter(row=>row.brand===brand).map(row=>row.date!).sort(),activeFrom=brandDates[0],activeTo=brandDates.at(-1),lifecycleStatus=activeTo&&activeTo>=asOf?"STILL ACTIVE":"DORMANT";
    return{brand,current:metrics,previous:baseline,gmvhDelta:activityStatus==="ACTIVE"?gmvhDelta:undefined,platforms:platformResults,status:health.status,activityStatus,performanceScore:health.score,consistency:brandConsistency,dataQualityScore:quality,activeFrom,activeTo,lifecycleStatus};
  }).sort((a,b)=>b.current.gmv-a.current.gmv);
  const comparable=cards.filter(card=>card.activityStatus==="ACTIVE"&&card.previous.sessions>0&&card.gmvhDelta!=null).sort((a,b)=>(b.gmvhDelta??0)-(a.gmvhDelta??0));
  const positive=comparable.filter(card=>(card.gmvhDelta??0)>0),declining=comparable.filter(card=>(card.gmvhDelta??0)<0),allDeclined=comparable.length>0&&declining.length===comparable.length;
  const inactive=cards.filter(card=>card.activityStatus==="NO_LIVE").sort((a,b)=>b.previous.gmvPerHour-a.previous.gmvPerHour);
  const sessions=current.filter(validSession).map(row=>({...row,metrics:aggregate([row])})).sort((a,b)=>b.metrics.gmvPerHour-a.metrics.gmvPerHour);
  const hosts=brands.flatMap(brand=>platforms.flatMap(platform=>{
    const baselineRows=current.filter(row=>row.brand===brand&&row.platform===platform),baseline=aggregate(baselineRows);
    return group(baselineRows,row=>row.host,(name,items)=>({...rankedHost(name,items,baseline,platform),brand,platform}))
      .filter(item=>item.name!=="Unknown"&&item.metrics.hours>=4&&item.metrics.sessions>=2);
  })).sort((a,b)=>b.score-a.score);
  const activeCards=cards.filter(card=>card.activityStatus==="ACTIVE"),trafficMedian=median(activeCards.map(card=>card.current.viewsPerHour)),efficiencyMedian=median(activeCards.map(card=>card.current.gmvPerHour));
  const efficiency=activeCards.map(card=>({...card,quadrant:card.current.viewsPerHour>=trafficMedian?(card.current.gmvPerHour>=efficiencyMedian?"HIGH TRAFFIC / HIGH EFFICIENCY":"HIGH TRAFFIC / LOW EFFICIENCY"):(card.current.gmvPerHour>=efficiencyMedian?"LOW TRAFFIC / HIGH EFFICIENCY":"LOW TRAFFIC / LOW EFFICIENCY"),benchmarks:{trafficMedian,efficiencyMedian}}));
  const priority=[...cards].sort((a,b)=>{const rank=(item:any)=>item.activityStatus==="NO_LIVE"?-1:item.status==="CRITICAL"?0:item.status==="WATCH"?1:2;return rank(a)-rank(b)||((a.gmvhDelta??0)-(b.gmvhDelta??0))}).slice(0,10);
  const orphanWarnings=all.filter(row=>(!row.date||!row.brand)&&(!platformFilter||platformFilter==="All"||row.platform===platformFilter)&&(!brandFilter||brandFilter==="All"||row.brand===brandFilter)).flatMap(row=>row.dataWarnings||[]);
  const warnings:DataWarning[]=[...current.flatMap(row=>row.dataWarnings||[]),...orphanWarnings];
  const summarySource=all.filter(row=>row.brand&&row.date&&(!platformFilter||platformFilter==="All"||row.platform===platformFilter)&&(!brandFilter||brandFilter==="All"||row.brand===brandFilter));
  const lastMonth=calendarMonth(range.end,-1),lastMonthRows=summarySource.filter(row=>inRange(row.date,lastMonth));
  const summaryMetrics=buildSummaryMetrics(current,previous,lastMonthRows,platformFilter||"All");
  return{
    filters:{brands:availableBrands,platforms},
    summary:{current:aggregate(current),previous:aggregate(previous),gmvhDelta:movement(aggregate(current).gmvPerHour,aggregate(previous).gmvPerHour),dataWarnings:warnings.length},
    brands:cards,efficiency,priority,warnings,
    summaryMetrics:{platform:platformFilter||"All",basis:"Average per live session",lastMonthRange:lastMonth,cards:summaryMetrics},
    highlights:{bestSession:sessions[0]||null,worstSession:sessions.length?sessions[sessions.length-1]:null,bestHost:hosts[0]||null,worstHost:hosts.length?hosts[hosts.length-1]:null,topGrowth:positive[0]||null,smallestDecline:allDeclined?declining[0]:null,biggestDecline:declining.length?declining[declining.length-1]:null,noLive:inactive[0]||null,noLiveCount:inactive.length}
  };
}

export function analyzeComparison(all:LiveRow[],left:{brand:string;range:DateRange},right:{brand:string;range:DateRange},platformFilter?:string){
  const select=(side:{brand:string;range:DateRange})=>all.filter(row=>row.brand===side.brand&&inRange(row.date,side.range)&&(!platformFilter||platformFilter==="All"||row.platform===platformFilter));
  const leftRows=select(left),rightRows=select(right),leftMetrics=aggregate(leftRows),rightMetrics=aggregate(rightRows);
  const metricKeys:(keyof Metrics)[]=["gmv","gmvPerHour","hours","sessions","views","viewsPerHour","err","ctr","coRate","viewsToCo","aov","watchGpm"];
  const metrics=metricKeys.map(key=>{const a=leftMetrics[key] as number|undefined,b=rightMetrics[key] as number|undefined;return{key,left:a,right:b,gap:a!=null&&b!=null?a-b:undefined,gapPercent:a!=null&&b!=null&&b!==0?(a-b)/b:undefined,winner:a==null||b==null||a===b?"TIE":a>b?"LEFT":"RIGHT"}});
  return{left:{...left,metrics:leftMetrics,platforms:platforms.map(platform=>({platform,metrics:aggregate(leftRows.filter(row=>row.platform===platform))})).filter(item=>item.metrics.sessions>0)},right:{...right,metrics:rightMetrics,platforms:platforms.map(platform=>({platform,metrics:aggregate(rightRows.filter(row=>row.platform===platform))})).filter(item=>item.metrics.sessions>0)},metrics};
}

export function analyzeHostReport(all:LiveRow[],range:DateRange,platformFilter?:string,brandFilter?:string){
  let rows=all.filter(row=>inRange(row.date,range)&&row.host);
  if(platformFilter&&platformFilter!=="All")rows=rows.filter(row=>row.platform===platformFilter);
  if(brandFilter&&brandFilter!=="All")rows=rows.filter(row=>row.brand===brandFilter);
  const assignments=[...new Set(rows.map(row=>`${row.brand}\u0000${row.platform}`))].flatMap(key=>{
    const[brand,platform]=key.split("\u0000") as [string,Platform],baseRows=rows.filter(row=>row.brand===brand&&row.platform===platform),baseline=aggregate(baseRows);
    return group(baseRows,row=>row.host,(name,items)=>({...rankedHost(name,items,baseline,platform),brand,platform,rows:items}));
  });
  const eligible=assignments.filter(item=>item.name!=="Unknown"&&item.metrics.hours>=4&&item.metrics.sessions>=2);
  const hostNames=[...new Set(assignments.map(item=>item.name).filter(name=>name!=="Unknown"))];
  const ranking=hostNames.map(name=>{
    const hostAssignments=eligible.filter(item=>item.name===name),hostRows=rows.filter(row=>row.host===name),metrics=aggregate(hostRows),totalHours=hostAssignments.reduce((sum,item)=>sum+item.metrics.hours,0);
    const score=totalHours?Math.round(hostAssignments.reduce((sum,item)=>sum+item.score*item.metrics.hours,0)/totalHours):0;
    const stable=totalHours?Math.round(hostAssignments.reduce((sum,item)=>sum+item.consistency*item.metrics.hours,0)/totalHours):consistency(hostRows);
    return{name,score,consistency:stable,metrics,eligible:hostAssignments.length>0,assignments:hostAssignments.map(({rows:_,...item})=>item),status:hostAssignments.length===0?"INSUFFICIENT SAMPLE":score>=110?"TOP PERFORMER":score>=90?"STRONG":"WATCH"};
  }).sort((a,b)=>Number(b.eligible)-Number(a.eligible)||b.score-a.score);
  const championMetrics:{key:keyof Metrics;label:string;platform?:Platform}[]=[
    {key:"gmvPerHour",label:"GMV/H"},{key:"viewsPerHour",label:"Views/H"},{key:"aov",label:"AOV"},{key:"watchGpm",label:"Watch GPM"},
    {key:"err",label:"ERR",platform:"TikTok"},{key:"ctr",label:"CTR",platform:"TikTok"},{key:"coRate",label:"CO Rate",platform:"TikTok"},{key:"viewsToCo",label:"Views-to-CO",platform:"Shopee"}
  ];
  const champions=championMetrics.map(metric=>{
    const pool=eligible.filter(item=>!metric.platform||item.platform===metric.platform).filter(item=>item.metrics[metric.key]!=null).sort((a,b)=>(b.metrics[metric.key] as number)-(a.metrics[metric.key] as number));
    const winner=pool[0];return{...metric,host:winner?.name||null,brand:winner?.brand||null,value:winner?.metrics[metric.key],platform:metric.platform||winner?.platform};
  });
  return{range,ranking,champions,bestOverall:ranking.find(item=>item.eligible)||null,eligibility:{minimumHours:4,minimumSessions:2},brands:[...new Set(rows.map(row=>row.brand))].sort()};
}
