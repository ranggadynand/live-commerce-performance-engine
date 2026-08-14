export type Platform="TikTok"|"Shopee";
export type LiveRow={platform:Platform;brand:string;liveId?:string;date?:string;day?:string;slot?:string;campaignType?:string;host?:string;duration:number;gmv:number;views:number;impressions?:number;productImpressions?:number;productClicks?:number;orders?:number;buyers?:number;itemSold?:number;addToCart?:number;aov?:number;avd?:number;engagementRate?:number;comments?:number;likes?:number;follows?:number;err?:number;ctr?:number;coRate?:number};
export type Metrics={sessions:number;hours:number;gmv:number;gmvPerHour:number;views:number;viewsPerHour:number;impressions?:number;err?:number;avd?:number;engagementRate?:number;ctr?:number;coRate?:number;aov?:number;showGpm?:number;watchGpm?:number};
export type Diagnostic={status:"GOOD"|"NORMAL"|"WATCH"|"CRITICAL";primaryDriver:string;summary:string;actions:string[]};
export type PeriodKey="today"|"yesterday"|"last7"|"last30"|"thisWeek"|"lastWeek"|"thisMonth"|"lastMonth"|"custom";
export type DateRange={start:string;end:string};
