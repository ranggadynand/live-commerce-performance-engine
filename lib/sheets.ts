import { google } from "googleapis";
import { LiveRow, Platform } from "./types";

const aliases:Record<string,string[]>={
  date:["date","tanggal","start date"],
  brand:["brand","account","account name"],
  host:["host","host name","talent"],
  duration:["duration","live hours","hours","hour"],
  gmv:["gmv","revenue","live gmv"],
  views:["views","view","watch pv"],
  impressions:["live impression","live impressions","impression","impressions"],
  productImpressions:["product impression","product impressions"],
  productClicks:["product click","product clicks","clicks"],
  orders:["co","order","orders"],
  buyers:["buyers","buyer"],
  itemSold:["item sold","items sold"],
  addToCart:["add to cart","atc"],
  aov:["aov"],
  avd:["avd","average viewing duration","avg viewing duration"],
  engagementRate:["engagement rate","er"],
  comments:["comment","comments"],
  likes:["like","likes"],
  follows:["follow","follows"],
  err:["err","enter room rate"],
  ctr:["ctr"],
  coRate:["co rate","conversion rate"]
};

const norm=(s:any)=>String(s??"").trim().toLowerCase().replace(/\s+/g," ");
const num=(v:any)=>{
  if(typeof v==="number") return v;
  const s=String(v??"").replace(/rp/gi,"").replace(/,/g,"").replace(/%/g,"").trim();
  const n=Number(s);
  if(!Number.isFinite(n)) return 0;
  return String(v).includes("%") ? n/100 : n;
};

function indexHeaders(headers:any[]){
  const out:Record<string,number>={};
  headers.forEach((h,i)=>{
    const n=norm(h);
    for(const [key,vals] of Object.entries(aliases)){
      if(vals.includes(n) && out[key]==null) out[key]=i;
    }
  });
  return out;
}

function parseRows(values:any[][], platform:Platform):LiveRow[]{
  if(!values.length) return [];
  // Find the most likely header row within first 15 rows.
  let hi=0, best=-1;
  for(let i=0;i<Math.min(15,values.length);i++){
    const idx=indexHeaders(values[i]);
    const score=Object.keys(idx).length;
    if(score>best){best=score;hi=i;}
  }
  const idx=indexHeaders(values[hi]);
  return values.slice(hi+1).map(r=>({
    platform,
    date: idx.date!=null ? String(r[idx.date]??"") : undefined,
    brand: idx.brand!=null ? String(r[idx.brand]??"").trim() : "",
    host: idx.host!=null ? String(r[idx.host]??"").trim() : undefined,
    duration:num(r[idx.duration]),
    gmv:num(r[idx.gmv]),
    views:num(r[idx.views]),
    impressions:platform==="TikTok" ? num(r[idx.impressions]) : undefined,
    productImpressions:num(r[idx.productImpressions]),
    productClicks:num(r[idx.productClicks]),
    orders:num(r[idx.orders]),
    buyers:num(r[idx.buyers]),
    itemSold:num(r[idx.itemSold]),
    addToCart:num(r[idx.addToCart]),
    aov:num(r[idx.aov]),
    avd:num(r[idx.avd]),
    engagementRate:num(r[idx.engagementRate]),
    comments:num(r[idx.comments]),
    likes:num(r[idx.likes]),
    follows:num(r[idx.follows]),
    err:platform==="TikTok" ? num(r[idx.err]) : undefined,
    ctr:num(r[idx.ctr]),
    coRate:num(r[idx.coRate])
  })).filter(r=>r.brand && (r.duration||r.gmv||r.views));
}

async function client(){
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key=process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g,"\n");
  if(!email||!key) throw new Error("Google service account env vars are missing.");
  const auth=new google.auth.JWT({email,key,scopes:["https://www.googleapis.com/auth/spreadsheets.readonly"]});
  return google.sheets({version:"v4",auth});
}

export async function loadPlatform(platform:Platform){
  const sheets=await client();
  const spreadsheetId=process.env.GOOGLE_SHEET_ID!;
  const sheetName=platform==="TikTok"
    ? (process.env.TIKTOK_SHEET_NAME||"RAW LS TIKTOK")
    : (process.env.SHOPEE_SHEET_NAME||"RAW LS SHOPEE");
  const res=await sheets.spreadsheets.values.get({spreadsheetId,range:`'${sheetName}'!A:ZZ`});
  return parseRows((res.data.values||[]) as any[][],platform);
}

export async function loadAll(){
  const [tiktok,shopee]=await Promise.all([loadPlatform("TikTok"),loadPlatform("Shopee")]);
  return [...tiktok,...shopee];
}
