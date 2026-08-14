import { Diagnostic, Metrics } from "./types";
import { pct } from "./metrics";

type Move={name:string; value?:number; direction:"up"|"down"; action:string};

export function diagnose(current:Metrics, baseline:Metrics):Diagnostic {
  const gmvh=pct(current.gmvPerHour,baseline.gmvPerHour) ?? 0;
  const moves:Move[]=[
    {name:"Traffic / Entry",value:pct(current.err,baseline.err),direction:"down",action:"Review opening execution, traffic source, account health and entry-room appeal."},
    {name:"Retention",value:pct(current.avd,baseline.avd),direction:"down",action:"Review host pacing, PK/use-case loop, demo frequency and dead air."},
    {name:"Engagement",value:pct(current.engagementRate,baseline.engagementRate),direction:"down",action:"Add interaction triggers, questions, comment hooks and clearer participation mechanics."},
    {name:"Product Click Intent",value:pct(current.ctr,baseline.ctr),direction:"down",action:"Review pinned SKU, product bridging, demo, offer clarity and CTA reason-to-click."},
    {name:"Conversion",value:pct(current.coRate,baseline.coRate),direction:"down",action:"Check promo competitiveness, stock, voucher, PDP, trust objections and closing."},
    {name:"Basket Size",value:pct(current.aov,baseline.aov),direction:"down",action:"Push bundles, quantity ladders, upsell and cross-sell."},
    {name:"Viewer Monetization",value:pct(current.watchGpm,baseline.watchGpm),direction:"down",action:"Audit the full viewer-to-order chain; traffic exists but monetization per 1K viewers weakened."},
  ].filter(x=>x.value!=null);

  const worst=[...moves].sort((a,b)=>(a.value??0)-(b.value??0))[0];
  let status:Diagnostic["status"]="NORMAL";
  if(gmvh>=0.1) status="GOOD";
  else if(gmvh<=-0.30) status="CRITICAL";
  else if(gmvh<=-0.10) status="WATCH";

  const primary=worst && (worst.value??0)<-0.08 ? worst.name : "No single dominant funnel break";
  const summary =
    `${current.gmvPerHour.toLocaleString("id-ID",{maximumFractionDigits:0})} GMV/H `+
    `(${gmvh>=0?"+":""}${(gmvh*100).toFixed(1)}% vs baseline). `+
    (primary==="No single dominant funnel break"
      ? "Funnel movement is relatively balanced."
      : `Largest negative signal: ${primary} ${((worst.value??0)*100).toFixed(1)}%.`);

  const actions = primary==="No single dominant funnel break"
    ? ["Maintain execution and inspect session-level outliers before changing strategy."]
    : [worst.action];

  return {status,primaryDriver:primary,summary,actions};
}
