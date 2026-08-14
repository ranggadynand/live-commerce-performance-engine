import {LiveRow,Metrics} from "./types";
const sum=(xs:(number|undefined)[])=>xs.reduce((a,b)=>a+(Number.isFinite(b as number)?(b as number):0),0);
function weighted(rows:LiveRow[],key:keyof LiveRow,weight:keyof LiveRow){
  let n=0,d=0;
  for(const r of rows){
    const v=Number(r[key]),w=Number(r[weight]);
    if(Number.isFinite(v)&&Number.isFinite(w)&&w>0){n+=v*w;d+=w}
  }
  return d?n/d:undefined
}
export function aggregate(rows:LiveRow[]):Metrics{
  const p=rows[0]?.platform,h=sum(rows.map(r=>r.duration)),gmv=sum(rows.map(r=>r.gmv)),views=sum(rows.map(r=>r.views));
  const imp=sum(rows.map(r=>r.impressions)),pi=sum(rows.map(r=>r.productImpressions)),clicks=sum(rows.map(r=>r.productClicks)),orders=sum(rows.map(r=>r.orders));
  let ctr: number|undefined, coRate:number|undefined, viewsToCo:number|undefined, aov:number|undefined;
  if(p==="TikTok"){
    ctr=pi?clicks/pi:weighted(rows,"ctr","views");
    coRate=clicks?orders/clicks:weighted(rows,"coRate","views");
  }else{
    viewsToCo=views?orders/views:weighted(rows,"viewsToCo","views");
  }
  aov=orders?gmv/orders:weighted(rows,"aov","gmv");
  return{
    sessions:rows.length,hours:h,gmv,gmvPerHour:h?gmv/h:0,views,viewsPerHour:h?views/h:0,
    impressions:p==="TikTok"?imp:undefined,
    err:p==="TikTok"?(imp?views/imp:weighted(rows,"err","views")):undefined,
    avd:weighted(rows,"avd","views"),
    engagementRate:p==="TikTok"?weighted(rows,"engagementRate","views"):undefined,
    ctr,coRate,viewsToCo,aov,
    showGpm:p==="TikTok"&&imp?gmv/imp*1000:undefined,
    watchGpm:views?gmv/views*1000:undefined
  }
}
export const movement=(c?:number,b?:number)=>c!=null&&b!=null&&b!==0?(c-b)/b:undefined;
