import { NextResponse } from "next/server";
import { loadAll } from "@/lib/sheets";
import { sampleRows } from "@/lib/sample";
import { aggregate } from "@/lib/metrics";
import { diagnose } from "@/lib/diagnostics";

export const dynamic="force-dynamic";

export async function GET(){
  let rows=sampleRows, source="sample";
  try { rows=await loadAll(); source="google-sheet"; } catch {}
  const brands=[...new Set(rows.map(r=>r.brand))].sort();
  const result=brands.flatMap(brand=>
    (["TikTok","Shopee"] as const).map(platform=>{
      const p=rows.filter(r=>r.brand===brand&&r.platform===platform);
      if(!p.length) return null;
      const dated=[...p].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
      const split=Math.max(1,Math.ceil(dated.length/2));
      const current=aggregate(dated.slice(0,split));
      const baseline=aggregate(dated.slice(split).length?dated.slice(split):dated.slice(0,split));
      return {brand,platform,current,baseline,diagnostic:diagnose(current,baseline)};
    }).filter(Boolean)
  );
  return NextResponse.json({source,generatedAt:new Date().toISOString(),data:result});
}