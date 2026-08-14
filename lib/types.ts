export type Platform="TikTok"|"Shopee";
export type Health="HEALTHY"|"WATCH"|"CRITICAL"|"N/A";
export type ResultStatus="ABOVE"|"ON TRACK"|"BELOW"|"N/A";

export type LiveRow={
  platform:Platform;
  brand:string;
  liveId?:string;
  date?:string;
  day?:string;
  slot?:string;
  campaignType?:string;
  host?:string;
  duration?:number;
  gmv?:number;
  views?:number;
  impressions?:number;
  productImpressions?:number;
  productClicks?:number;
  orders?:number;
  aov?:number;
  avd?:number;
  engagementRate?:number;
  err?:number;
  ctr?:number;
  coRate?:number;
  viewsToCo?:number;
  gmvTarget?:number;
  gmvPerHourTarget?:number;
  viewsTarget?:number;
  viewsPerHourTarget?:number;
  viewsToCoTarget?:number;
  aovTarget?:number;
  errTarget?:number;
  ctrTarget?:number;
  coRateTarget?:number;
  dataWarnings?:string[];
};

export type Metrics={
  sessions:number;
  hours:number;
  gmv:number;
  gmvPerHour:number;
  views:number;
  viewsPerHour:number;
  impressions?:number;
  err?:number;
  avd?:number;
  engagementRate?:number;
  ctr?:number;
  coRate?:number;
  viewsToCo?:number;
  aov?:number;
  showGpm?:number;
  watchGpm?:number;
};

export type Diagnostic={
  resultStatus:ResultStatus;
  funnelHealth:Health;
  primaryDriver:string;
  summary:string;
  actions:string[];
};

export type PeriodKey="today"|"yesterday"|"last7"|"last30"|"thisWeek"|"lastWeek"|"thisMonth"|"lastMonth"|"custom";
export type DateRange={start:string;end:string};
