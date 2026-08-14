import { LiveRow, Metrics } from "./types";

const sum = (xs:number[]) => xs.reduce((a,b)=>a+(Number.isFinite(b)?b:0),0);
const weighted = (rows:LiveRow[], key:keyof LiveRow, weight:keyof LiveRow) => {
  let n=0,d=0;
  for(const r of rows){
    const v=Number(r[key]), w=Number(r[weight]);
    if(Number.isFinite(v)&&Number.isFinite(w)&&w>0){n+=v*w;d+=w;}
  }
  return d ? n/d : undefined;
};

export function aggregate(rows:LiveRow[]):Metrics {
  const hours=sum(rows.map(r=>r.duration));
  const gmv=sum(rows.map(r=>r.gmv));
  const views=sum(rows.map(r=>r.views));
  const impressions=sum(rows.map(r=>r.impressions||0));
  const clicks=sum(rows.map(r=>r.productClicks||0));
  const productImpressions=sum(rows.map(r=>r.productImpressions||0));
  const orders=sum(rows.map(r=>r.orders||0));
  const aov = orders ? gmv/orders : weighted(rows,"aov","gmv");
  const platform=rows[0]?.platform;

  return {
    hours, gmv, views,
    gmvPerHour: hours ? gmv/hours : 0,
    viewsPerHour: hours ? views/hours : 0,
    impressions: platform==="TikTok" ? impressions : undefined,
    err: platform==="TikTok" && impressions ? views/impressions : weighted(rows,"err","impressions"),
    avd: weighted(rows,"avd","views"),
    engagementRate: weighted(rows,"engagementRate","views"),
    ctr: productImpressions ? clicks/productImpressions : weighted(rows,"ctr","views"),
    coRate: clicks ? orders/clicks : weighted(rows,"coRate","views"),
    aov,
    showGpm: platform==="TikTok" && impressions ? gmv/impressions*1000 : undefined,
    watchGpm: views ? gmv/views*1000 : undefined
  };
}

export const pct = (current?:number, base?:number) =>
  current!=null && base ? (current-base)/base : undefined;
