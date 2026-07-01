# Ad Profit Dashboard

This folder is a rendered dashboard artifact.

Business-specific views:

- `index.html`: legacy ad profit dashboard
- `deposit-reconciliation.html`: Tennis Clubhouse deposit reconciliation and settlement dashboard

Public-safe data files:

- `data/ad_profit_dashboard_data.json`
- `data/deposit_reconciliation_dashboard_data.json`

Local checks:

```powershell
npm.cmd run check:deposit-dashboard
```

GitHub Actions also runs the dashboard data checks on push and pull request.

Source of truth:
- `public.meta_ad_profit_daily_summary`
- `public.meta_ad_profit_creative_daily`
- `public.vw_ad_profit_platform_category_daily`
- `public.vw_ad_profit_platform_daily_summary`
- `public.vw_ad_profit_platform_category_monthly`

Deposit reconciliation source of truth:

- `app-automation-vault`
- `40-Database/processed/deposit_reconciliation_public_monthly_channel_summary.csv`
- `90-Dashboard/deposit_reconciliation_dashboard_data.json`

Do not treat the JSON in this folder as the canonical dataset. Rebuild from Supabase or the private vault export after data sync.
