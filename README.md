# Live Commerce Performance Engine

V1 decision dashboard for TikTok Live + Shopee Live.

## What V1 does
- Reads raw TikTok and Shopee tabs from Google Sheets.
- Keeps platform logic separate.
- TikTok: ERR, AVD, Engagement, CTR, CO Rate, AOV, Show GPM, Watch GPM, GMV/H.
- Shopee: AVD, Engagement, CTR, CO Rate, AOV, Watch GPM, GMV/H. **No Show GPM**, because Shopee raw data has no impression field.
- Produces health status and primary-driver diagnosis.
- Sends daily AE email: Result → Driver → Diagnosis → Action → Owner.
- Includes demo data automatically until Google credentials are configured.

## Core formulas
- GMV/H = GMV / Live Hours
- Views/H = Views / Live Hours
- TikTok ERR = Views / Live Impressions
- CTR = Product Clicks / Product Impressions (or source CTR if raw counts unavailable)
- CO Rate = Orders / Product Clicks (or source CO Rate)
- AOV = GMV / Orders
- TikTok Show GPM = GMV / Live Impressions × 1,000
- Watch GPM = GMV / Views × 1,000

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local`.
3. Create a Google Cloud service account with Sheets read access.
4. Share the source Google Sheet to the service-account email as Viewer.
5. Fill Google credentials and sheet tab names.
6. `npm run dev`
7. Open `http://localhost:3000`.

## Daily AE email
Fill `RESEND_API_KEY`, `EMAIL_FROM`, `AE_ROUTING_JSON`, and `CRON_SECRET`.
`vercel.json` calls `/api/cron/daily-ae` at 01:00 UTC (08:00 WIB) daily.

Example routing:
`[{"name":"Dio","email":"dio@company.com","brands":["Quaker"]}]`

## Important V1 assumption
The raw-sheet parser matches common column aliases. If the actual raw tabs use different exact header names, add aliases in `lib/sheets.ts`. This is intentional: the calculation engine is stable while ingestion can adapt to platform export changes.

## Diagnosis logic
The engine compares current vs baseline performance and looks for the largest negative movement across entry, retention, engagement, click intent, conversion, basket size, and viewer monetization. Thresholds are deliberately conservative in V1 and should be calibrated against each brand's historical distribution in V2.
