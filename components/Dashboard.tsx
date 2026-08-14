"use client";
import { useEffect,useMemo,useState } from "react";

type Item=any;
const money=(n:number)=>new Intl.NumberFormat("id-ID",{notation:"compact",maximumFractionDigits:1}).format(n||0);
const pct=(n?:number)=>n==null?"—":`${(n*100).toFixed(1)}%`;
const sec=(n?:number)=>n==null?"—":`${n.toFixed(1)}s`;

export default function Dashboard(){
 const [payload,setPayload]=useState<any>(null);
 const [platform,setPlatform]=useState("All");
 const [brand,setBrand]=useState("All");
 useEffect(()=>{fetch("/api/dashboard").then(r=>r.json()).then(setPayload)},[]);
 const rows:Item[]=payload?.data||[];
 const brands=useMemo(()=>[...new Set(rows.map(x=>x.brand))],[rows]);
 const filtered=rows.filter(x=>(platform==="All"||x.platform===platform)&&(brand==="All"||x.brand===brand));
 const totals=filtered.reduce((a,x)=>({gmv:a.gmv+x.current.gmv,h:a.h+x.current.hours}),{gmv:0,h:0});
 return <main>
   <header><div><span className="eyebrow">ORCA · PERFORMANCE ENGINE</span><h1>Live Commerce Control Tower</h1><p>Result → Driver → Diagnosis → Action → Owner</p></div>
   <div className="source">{payload?.source==="google-sheet"?"LIVE · GOOGLE SHEET":"DEMO DATA · CONNECT GOOGLE SHEET"}</div></header>

   <section className="filters">
    <select value={platform} onChange={e=>setPlatform(e.target.value)}><option>All</option><option>TikTok</option><option>Shopee</option></select>
    <select value={brand} onChange={e=>setBrand(e.target.value)}><option>All</option>{brands.map((b:any)=><option key={b}>{b}</option>)}</select>
   </section>

   <section className="hero">
    <div><small>GMV</small><strong>Rp {money(totals.gmv)}</strong></div>
    <div><small>LIVE HOURS</small><strong>{totals.h.toFixed(1)}</strong></div>
    <div><small>BLENDED GMV/H</small><strong>Rp {money(totals.h?totals.gmv/totals.h:0)}</strong></div>
    <div><small>ACCOUNTS</small><strong>{filtered.length}</strong></div>
   </section>

   <section className="grid">{filtered.map((x:any)=><article className="card" key={`${x.brand}-${x.platform}`}>
     <div className="cardhead"><div><small>{x.platform}</small><h2>{x.brand}</h2></div><span className={`status ${x.diagnostic.status}`}>{x.diagnostic.status}</span></div>
     <div className="gmvh"><span>GMV/H</span><b>Rp {money(x.current.gmvPerHour)}</b></div>
     <div className="metrics">
       {x.platform==="TikTok"&&<Metric k="ERR" v={pct(x.current.err)}/>}
       <Metric k="AVD" v={sec(x.current.avd)}/>
       <Metric k="Engagement" v={pct(x.current.engagementRate)}/>
       <Metric k="CTR" v={pct(x.current.ctr)}/>
       <Metric k="CO Rate" v={pct(x.current.coRate)}/>
       <Metric k="AOV" v={`Rp ${money(x.current.aov)}`}/>
       {x.platform==="TikTok"&&<Metric k="Show GPM" v={`Rp ${money(x.current.showGpm)}`}/>}
       <Metric k="Watch GPM" v={`Rp ${money(x.current.watchGpm)}`}/>
     </div>
     <div className="diagnosis"><small>PRIMARY DRIVER</small><b>{x.diagnostic.primaryDriver}</b><p>{x.diagnostic.summary}</p><div className="action"><strong>Action:</strong> {x.diagnostic.actions[0]}</div></div>
   </article>)}</section>
 </main>
}
function Metric({k,v}:{k:string,v:string}){return <div><span>{k}</span><b>{v}</b></div>}