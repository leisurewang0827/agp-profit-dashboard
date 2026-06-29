# Manual channel reporting workflow

Use this workflow for the active channels that are not API-connected yet:

- Naver Place
- Danggeun Ads
- Instagram notices/promotions

## Files

- Web console: `manual-channel-console/index.html`
- Template: `data/manual-channel-template.csv`
- Import script: `scripts/import-manual-channel-report.mjs`
- Supabase migration: `supabase/migrations/004_active_manual_channels.sql`

## Web console

Open the local input console:

```powershell
npm.cmd run open:manual-console
```

The console stores draft rows in the browser on this computer and exports a CSV compatible with the import script.

## Channel codes

Use exactly these values in the `channel` column:

- `naver_place`
- `daangn_ads`
- `instagram_notice`

## CSV columns

- `report_date`: `YYYY-MM-DD`
- `channel`: one of the channel codes above
- `campaign_name`: campaign, post, or daily bucket name
- `spend`: ad spend
- `impressions`: exposures/views
- `clicks`: clicks/taps
- `inquiries`: inquiries, leads, or meaningful contacts
- `reservations`: reservations/bookings
- `revenue`: directly attributed revenue when known
- `followers_delta`: Instagram follower increase/decrease
- `profile_visits`: profile or place page visits
- `messages`: DM/chat count
- `notes`: free memo
- `source_url`: optional admin/report URL

Blank numeric cells are treated as `0`.

## Safe dry-run

Validate the template without writing to Supabase:

```powershell
npm.cmd run manual:channels:dry-run
```

Validate a copied report file:

```powershell
npm.cmd run manual:channels:dry-run -- --file=data/my-report.csv
```

## Supabase setup

Before importing for real, apply:

```text
supabase/migrations/004_active_manual_channels.sql
```

Use Supabase SQL Editor, then run the dry-run again.

## Import

After migration 004 is applied:

```powershell
npm.cmd run manual:channels:import -- --file=data/my-report.csv
```

The import upserts rows by:

- `report_date`
- `channel`
- `campaign_name`

## Operating boundary

This workflow is reporting-only. It does not change budgets, campaigns, ads, Naver Place settings, Danggeun settings, or Instagram posts.
