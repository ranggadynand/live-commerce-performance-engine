import {google} from "googleapis";
import {DataWarning,LiveRow,Platform} from "./types";
import {normalizeDate} from "./dates";

const aliases:Record<string,string[]>={
  brand:["brand","account","account name"],
  liveId:["live id","liveid"],
  date:["date","tanggal","start date"],
  day:["day"],
  slot:["ls time","live time","time slot"],
  campaignType:["campaign type","campaign","event type"],
  host:["host","host name","talent"],
  duration:["duration","live hours","hours","hour"],
  gmv:["gmv","revenue","live gmv"],
  views:["views","view","watch pv"],
  impressions:["live impression","live impressions","impression","impressions"],
  productImpressions:["product impression","product impressions"],
  productClicks:["product click","product clicks","clicks"],
  orders:["co","order","orders"],
  aov:["aov"],
  avd:["avd","avg. viewing duration (s)","avg. view duration (s)","average viewing duration","avg viewing duration"],
  engagementRate:["engagement rate","er"],
  err:["err (%)","err","enter room rate"],
  ctr:["ctr (%)","ctr"],
  coRate:["co rate (%)","co rate","conversion rate"],
  viewsToCo:["views to co","views to co (%)","view to co","view to order"],
  gmvTarget:["gmv target","target gmv"],
  gmvPerHourTarget:["gmv/hour target","target gmv/h","target gmv/hour","gmv/h target"],
  viewsTarget:["views target","target views"],
  viewsPerHourTarget:["views/h target","target views/h"],
  viewsToCoTarget:["views to co target","target views to co"],
  aovTarget:["target aov","aov target"],
  errTarget:["target err","err target"],
  ctrTarget:["target ctr","ctr target"],
  coRateTarget:["target co rate","co rate target"]
};

const norm=(s:any)=>String(s??"").trim().toLowerCase().replace(/\s+/g," ");
const badText=(s:string)=>["#n/a","#na","n/a","na","-","—","#value!","#div/0!"].includes(norm(s));
function num(v:any):number|undefined{
  if(v==null||v==="")return undefined;
  if(typeof v==="number")return Number.isFinite(v)?v:undefined;
  const raw=String(v).trim();
  if(!raw||badText(raw))return undefined;
  const pct=raw.includes("%");
  const clean=raw.replace(/rp/gi,"").replace(/[,\s]/g,"").replace(/%/g,"");
  const n=Number(clean);
  return Number.isFinite(n)?(pct?n/100:n):undefined;
}
function cleanText(v:any){
  if(v==null)return undefined;
  const s=String(v).trim();
  if(!s||badText(s))return undefined;
  return s;
}
function indexHeaders(h:any[]){
  const o:Record<string,number>={};
  h.forEach((x,i)=>{const n=norm(x);for(const[k,vals]of Object.entries(aliases))if(vals.includes(n)&&o[k]==null)o[k]=i});
  return o;
}
export function parseRows(v:any[][],platform:Platform,sourceSheet:string=platform):LiveRow[]{
  if(!v.length)return[];
  let hi=0,b=-1;
  for(let i=0;i<Math.min(15,v.length);i++){const s=Object.keys(indexHeaders(v[i])).length;if(s>b){b=s;hi=i}}
  const idx=indexHeaders(v[hi]);
  return v.slice(hi+1).map((r,offset)=>{
    const sourceRow=hi+offset+2;
    const warnings:DataWarning[]=[];
    const duration=num(r[idx.duration]),gmv=num(r[idx.gmv]),views=num(r[idx.views]);
    const brand=cleanText(r[idx.brand])||"",rawDate=idx.date==null?undefined:r[idx.date],date=normalizeDate(rawDate==null?"":String(rawDate));
    const host=cleanText(r[idx.host]),slot=cleanText(r[idx.slot]),liveId=cleanText(r[idx.liveId]);
    const addWarning=(field:string,rawValue:unknown,type:"MISSING"|"INVALID",explanation:string,recommendedFix:string)=>warnings.push({brand,platform,date,session:slot,host,sourceSheet,sourceRow,sourceId:liveId,field,rawValue,type,explanation,recommendedFix});
    const warnNumeric=(field:string,index:number|undefined,value:number|undefined,label:string)=>{
      const raw=index==null?undefined:r[index];
      if(index==null||raw==null||raw==="")addWarning(field,raw,"MISSING",`${label} is required for reliable session analysis.`,`Enter a numeric ${label} value; use 0 only when the observed value is genuinely zero.`);
      else if(value===undefined)addWarning(field,raw,"INVALID",`${label} could not be parsed as a number.`,`Replace the cell with a numeric ${label} value and remove text or spreadsheet errors.`);
    };
    if(!brand)addWarning("brand",idx.brand==null?undefined:r[idx.brand],idx.brand==null||r[idx.brand]==null||r[idx.brand]===""?"MISSING":"INVALID","Brand is required to assign this session to an account.","Enter the canonical brand/account name used by the dashboard.");
    if(!date)addWarning("date",rawDate,rawDate==null||rawDate===""?"MISSING":"INVALID","Date is required to place this session in a reporting period.","Enter a valid sheet date or YYYY-MM-DD value.");
    warnNumeric("duration",idx.duration,duration,"live duration");
    warnNumeric("gmv",idx.gmv,gmv,"GMV");
    warnNumeric("views",idx.views,views,"views");
    if(idx.host==null||r[idx.host]==null||r[idx.host]===""||badText(String(r[idx.host])))addWarning("host",idx.host==null?undefined:r[idx.host],idx.host==null||r[idx.host]==null||r[idx.host]===""?"MISSING":"INVALID","Host is unavailable, so this session cannot contribute to host rankings.","Enter the host name used for this live session.");
    const row:LiveRow={
      platform,
      brand,liveId,date,
      day:cleanText(r[idx.day]),
      slot:cleanText(r[idx.slot]),
      campaignType:cleanText(r[idx.campaignType]),
      host,
      duration,gmv,views,
      impressions:platform==="TikTok"?num(r[idx.impressions]):undefined,
      productImpressions:platform==="TikTok"?num(r[idx.productImpressions]):undefined,
      productClicks:platform==="TikTok"?num(r[idx.productClicks]):undefined,
      orders:num(r[idx.orders]),
      aov:num(r[idx.aov]),
      avd:num(r[idx.avd]),
      engagementRate:platform==="TikTok"?num(r[idx.engagementRate]):undefined,
      err:platform==="TikTok"?num(r[idx.err]):undefined,
      ctr:platform==="TikTok"?num(r[idx.ctr]):undefined,
      coRate:platform==="TikTok"?num(r[idx.coRate]):undefined,
      viewsToCo:platform==="Shopee"?num(r[idx.viewsToCo]):undefined,
      gmvTarget:num(r[idx.gmvTarget]),
      gmvPerHourTarget:num(r[idx.gmvPerHourTarget]),
      viewsTarget:num(r[idx.viewsTarget]),
      viewsPerHourTarget:num(r[idx.viewsPerHourTarget]),
      viewsToCoTarget:num(r[idx.viewsToCoTarget]),
      aovTarget:num(r[idx.aovTarget]),
      errTarget:num(r[idx.errTarget]),
      ctrTarget:num(r[idx.ctrTarget]),
      coRateTarget:num(r[idx.coRateTarget]),
      sourceSheet,sourceRow,dataWarnings:warnings
    };
    return row;
  }).filter(r=>(
    r.liveId||r.slot||r.host||r.duration!==undefined||r.gmv!==undefined||r.views!==undefined
  ))
}
async function client(){
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g,"\n");
  if(!email||!key)throw new Error("Google service account credentials are missing.");
  const auth=new google.auth.JWT({email,key,scopes:["https://www.googleapis.com/auth/spreadsheets.readonly"]});
  return google.sheets({version:"v4",auth})
}
export async function loadPlatform(platform:Platform){
  const sheets=await client(),spreadsheetId=process.env.GOOGLE_SHEET_ID;
  if(!spreadsheetId)throw new Error("GOOGLE_SHEET_ID missing.");
  const sheetName=platform==="TikTok"?(process.env.TIKTOK_SHEET_NAME||"RAW LS TIKTOK"):(process.env.SHOPEE_SHEET_NAME||"RAW LS SHOPEE");
  const res=await sheets.spreadsheets.values.get({spreadsheetId,range:`'${sheetName}'!A:ZZ`,valueRenderOption:"UNFORMATTED_VALUE"});
  return parseRows((res.data.values||[]) as any[][],platform,sheetName)
}
export async function loadAll(){const[tiktok,shopee]=await Promise.all([loadPlatform("TikTok"),loadPlatform("Shopee")]);return[...tiktok,...shopee]}
