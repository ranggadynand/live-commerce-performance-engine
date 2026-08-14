const assert=require("node:assert/strict");
const ts=require("typescript");
require.extensions[".ts"]=(module,filename)=>{
  const source=require("node:fs").readFileSync(filename,"utf8");
  module._compile(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,filename);
};
const {analyzeComparison,analyzeDashboard,analyzeHostReport,analyzePlatform}=require("../lib/analytics.ts");
const {parseRows}=require("../lib/sheets.ts");
const {weeklyWindows}=require("../lib/email.ts");

const current={start:"2026-08-10",end:"2026-08-16"},previous={start:"2026-08-03",end:"2026-08-09"};
const row=(brand,date,gmv,extra={})=>({platform:"TikTok",brand,date,duration:2,gmv,views:100,impressions:1000,productImpressions:100,productClicks:10,orders:1,host:"Host A",...extra});
const rows=[row("A","2026-08-04",100),row("A","2026-08-10",90),row("A","2026-08-11",0),row("B","2026-08-04",100),row("B","2026-08-10",80),row("B","2026-08-11",80)];
const dashboard=analyzeDashboard(rows,current,previous,"All","A");
assert.equal(dashboard.highlights.topGrowth,null,"declining brands must not be Top Growth");
assert.equal(dashboard.highlights.smallestDecline.brand,"A");
assert.equal(dashboard.highlights.biggestDecline.brand,"A");
assert.deepEqual(dashboard.filters.brands,["A","B"],"brand options must survive a brand filter");
assert.equal(dashboard.highlights.worstSession.gmv,0,"zero-GMV sessions remain eligible for Worst Session");
assert.equal(dashboard.highlights.bestHost.name,"Host A","host with at least 4h and 2 sessions is eligible");

const lifecycleRows=[...rows,row("Stopped","2026-08-04",500),row("Future Active","2026-09-02",700)];
const withInactive=analyzeDashboard(lifecycleRows,current,previous,"All","All");
assert(!withInactive.brands.some(brand=>brand.brand==="Stopped"),"brands without activity in the selected period must not enter summary calculations");
const historical=analyzeDashboard(lifecycleRows,{start:"2026-08-01",end:"2026-08-31"},{start:"2026-07-01",end:"2026-07-31"},"All","All");
assert.equal(historical.brands.find(brand=>brand.brand==="Stopped").lifecycleStatus,"DORMANT");
assert.equal(historical.brands.find(brand=>brand.brand==="A").activeFrom,"2026-08-04");
assert(historical.executive.ytd.runRateGmv>0,"executive summary must expose a yearly run-rate");

const comparison=analyzeComparison(rows,{brand:"A",range:previous},{brand:"A",range:current},"All");
assert.equal(comparison.left.brand,"A");
assert(comparison.metrics.some(metric=>metric.key==="gmvPerHour"&&metric.winner==="LEFT"),"same-brand period comparison must identify metric winners");

const hostReport=analyzeHostReport(rows,current,"TikTok","A");
assert.equal(hostReport.bestOverall.name,"Host A");
assert(hostReport.champions.some(champion=>champion.key==="gmvPerHour"&&champion.host==="Host A"));

const shopee=analyzePlatform([{platform:"Shopee",brand:"S",date:"2026-08-10",duration:2,gmv:200,views:100,orders:2,aov:100,viewsToCo:.02}],[],"Shopee");
assert.equal(shopee.current.err,undefined);
assert.equal(shopee.current.ctr,undefined);
assert.equal(shopee.current.coRate,undefined);

const parsed=parseRows([["Brand","Date","Duration","GMV","Views","Host","ERR"],["S","2026-08-10",1,"bad",0,"Host S",""]],"Shopee","RAW LS SHOPEE");
assert.equal(parsed[0].views,0,"numeric zero must be preserved");
assert(parsed[0].dataWarnings.some(w=>w.field==="gmv"&&w.type==="INVALID"));
assert(!parsed[0].dataWarnings.some(w=>w.field==="err"),"Shopee must not warn on TikTok-only metrics");

assert.deepEqual(weeklyWindows(new Date("2026-08-17T10:00:00Z")).current,{start:"2026-08-10",end:"2026-08-16"});
console.log("Smoke checks passed");
