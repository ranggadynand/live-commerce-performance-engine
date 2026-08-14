import {DateRange,PeriodKey} from "./types";

const WIB_OFFSET=7*60*60*1000;
const pad=(n:number)=>String(n).padStart(2,"0");

function wibParts(now=new Date()){
  const d=new Date(now.getTime()+WIB_OFFSET);
  return {y:d.getUTCFullYear(),m:d.getUTCMonth(),day:d.getUTCDate(),dow:d.getUTCDay()};
}
function make(y:number,m:number,d:number){return new Date(Date.UTC(y,m,d));}
const iso=(d:Date)=>`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;

export function todayWib(now=new Date()){const p=wibParts(now);return make(p.y,p.m,p.day)}
export function parseDataDate(value?:string){
  if(!value)return null;
  const s=String(value).trim();
  if(!s)return null;
  const serial=Number(s);
  if(Number.isFinite(serial)&&serial>20000&&serial<80000){
    const d=new Date((serial-25569)*86400000);
    return Number.isNaN(d.getTime())?null:d;
  }
  const direct=new Date(s);
  if(!Number.isNaN(direct.getTime()))return make(direct.getUTCFullYear(),direct.getUTCMonth(),direct.getUTCDate());
  const m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(m)return make(+m[3],+m[2]-1,+m[1]);
  return null;
}
export const normalizeDate=(v?:string)=>{const d=parseDataDate(v);return d?iso(d):undefined};

function monday(d:Date){const x=new Date(d);const dow=x.getUTCDay();x.setUTCDate(x.getUTCDate()-((dow+6)%7));return x}
export function resolvePeriod(k:PeriodKey,cs?:string,ce?:string,now=new Date()):DateRange{
  const t=todayWib(now);let s=new Date(t),e=new Date(t);
  if(k==="yesterday"){s.setUTCDate(s.getUTCDate()-1);e=new Date(s)}
  if(k==="last7")s.setUTCDate(s.getUTCDate()-6);
  if(k==="last30")s.setUTCDate(s.getUTCDate()-29);
  if(k==="thisWeek")s=monday(t);
  if(k==="lastWeek"){e=monday(t);e.setUTCDate(e.getUTCDate()-1);s=new Date(e);s.setUTCDate(s.getUTCDate()-6)}
  if(k==="thisMonth")s=make(t.getUTCFullYear(),t.getUTCMonth(),1);
  if(k==="lastMonth"){s=make(t.getUTCFullYear(),t.getUTCMonth()-1,1);e=make(t.getUTCFullYear(),t.getUTCMonth(),0)}
  if(k==="custom"&&cs&&ce)return{start:cs,end:ce};
  return{start:iso(s),end:iso(e)}
}
export function previousEquivalent(r:DateRange){
  const s=new Date(r.start+"T00:00:00Z"),e=new Date(r.end+"T00:00:00Z");
  const days=Math.round((e.getTime()-s.getTime())/86400000)+1;
  const pe=new Date(s);pe.setUTCDate(pe.getUTCDate()-1);
  const ps=new Date(pe);ps.setUTCDate(ps.getUTCDate()-(days-1));
  return{start:iso(ps),end:iso(pe)}
}
export const inRange=(d:string|undefined,r:DateRange)=>!!d&&d>=r.start&&d<=r.end;
