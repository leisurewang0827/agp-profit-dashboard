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

## Apply Active Manual Channel Schema

Use this after confirming the active operation channels are Naver Place, Danggeun Ads, and Instagram notices/promotions.

1. Open Supabase.
2. Choose the project used in `.env.local`.
3. Go to `SQL Editor`.
4. Open `supabase/migrations/004_active_manual_channels.sql`.
5. Paste the whole SQL file into the editor.
6. Run it once.
7. Return to the local repo and validate the CSV template:

```powershell
npm.cmd run manual:channels:dry-run
```

8. Import a filled report file only after reviewing it:

```powershell
npm.cmd run manual:channels:import -- --file=data/my-report.csv
```

Expected after the migration:

- `stg_active_channel_daily`: stores manual/admin daily rows.
- `vw_active_channel_daily_summary`: summarizes active channel metrics by date and channel.

## Notes

- Keep `.env.local` local only.
- Use the legacy Supabase `service_role` JWT for local automation checks.
- Rotate the service role key before production use because it was briefly exposed during setup.
