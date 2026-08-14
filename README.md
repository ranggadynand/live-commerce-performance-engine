# Live Commerce Performance Engine — V2

TikTok + Shopee Live control tower.

## Included
- Global period filter: Today, Yesterday, Last 7/30 Days, This/Last Week, This/Last Month, Custom.
- Previous-equivalent-period comparison for the whole dashboard.
- TikTok: ERR, AVD, Engagement, CTR, CO Rate, AOV, Show GPM, Watch GPM, GMV/H.
- Shopee: AVD, Engagement, CTR, CO Rate, AOV, Watch GPM, GMV/H. No Show GPM.
- Best / worst session.
- Best / worst host using normalized quality score instead of raw GMV only.
- Best time slot, day and campaign type.
- Top growth / biggest decline.
- Click any brand card to open full brand view with funnel, diagnosis, host ranking and session table.
- Daily AE email automation: Result → Driver → Diagnosis → Action → Owner.

## Keep existing Vercel variables
GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, TIKTOK_SHEET_NAME, SHOPEE_SHEET_NAME.

Optional email variables: RESEND_API_KEY, EMAIL_FROM, AE_ROUTING_JSON, CRON_SECRET.
