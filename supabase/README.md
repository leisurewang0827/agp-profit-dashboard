# Supabase Setup

This folder contains SQL for the user-owned AGP dashboard automation database.

## Apply The Baseline Schema

1. Open Supabase.
2. Choose the project used in `.env.local`.
3. Go to `SQL Editor`.
4. Open `supabase/migrations/001_init_agp_dashboard.sql`.
5. Paste the whole SQL file into the editor.
6. Run it once.
7. Return to the local repo and run:

```powershell
npm.cmd run check:supabase
```

Expected after the migration:

- `mart_daily_profit_gauge_latest_closed`: `OK`
- `stg_ads_daily`: `OK`
- `meta_ad_profit_daily_summary`: `OK`
- `vw_ad_profit_platform_daily_summary`: `OK`

## Notes

- Keep `.env.local` local only.
- Use the legacy Supabase `service_role` JWT for local automation checks.
- Rotate the service role key before production use because it was briefly exposed during setup.

