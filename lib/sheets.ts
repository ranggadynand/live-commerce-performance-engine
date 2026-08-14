import {google} from "googleapis";
import {LiveRow,Platform} from "./types";
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
function parseRows(v:any[][],platform:Platform):LiveRow[]{
  if(!v.length)return[];
  let hi=0,b=-1;
  for(let i=0;i<Math.min(15,v.length);i++){const s=Object.keys(indexHeaders(v[i])).length;if(s>b){b=s;hi=i}}
  const idx=indexHeaders(v[hi]);
  return v.slice(hi+1).map(r=>{
    const warnings:string[]=[];
    const duration=num(r[idx.duration]),gmv=num(r[idx.gmv]),views=num(r[idx.views]);
    if(r[idx.host]&&badText(String(r[idx.host])))warnings.push("Host missing");
    if(r[idx.gmv]!==undefined&&gmv===undefined)warnings.push("Invalid GMV");
    if(r[idx.views]!==undefined&&views===undefined)warnings.push("Invalid Views");
    const row:LiveRow={
      platform,
      brand:cleanText(r[idx.brand])||"",
      liveId:cleanText(r[idx.liveId]),
      date:normalizeDate(idx.date!=null?String(r[idx.date]??""):""),
      day:cleanText(r[idx.day]),
      slot:cleanText(r[idx.slot]),
      campaignType:cleanText(r[idx.campaignType]),
      host:cleanText(r[idx.host]),
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
      dataWarnings:warnings
    };
    return row;
  }).filter(r=>r.brand&&r.date&&((r.duration??0)>0||(r.gmv??0)>0||(r.views??0)>0))
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
  return parseRows((res.data.values||[]) as any[][],platform)
}
export async function loadAll(){const[tiktok,shopee]=await Promise.all([loadPlatform("TikTok"),loadPlatform("Shopee")]);return[...tiktok,...shopee]}
