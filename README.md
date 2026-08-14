# Live Commerce Performance Engine V2.1

Data-integrity + performance-complete release.

Key upgrades:
- Separate TikTok and Shopee funnel engines.
- Shopee uses Views/H, AVD, Views-to-CO, AOV, Watch GPM, GMV/H.
- TikTok retains ERR, AVD, Engagement, CTR, CO Rate, AOV, Show GPM, Watch GPM, GMV/H.
- Blank/missing values remain N/A instead of becoming zero.
- Invalid host values such as #N/A are excluded from host ranking.
- Result Status and Funnel Health are separated to avoid contradictory "GOOD" states.
- Host scoring is platform-specific and re-normalizes weights when a metric is unavailable.
- Session validity rule and host minimum-hours rule.
- Asia/Jakarta period handling.
- Data quality warnings.
- Brand performance score, consistency, priority queue, and efficiency matrix.
- Full brand drilldown remains available.
