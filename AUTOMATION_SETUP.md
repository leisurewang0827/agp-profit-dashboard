# Automation Setup

This repository currently holds static dashboard artifacts and public Codex operating pages adapted from a reference template. The remaining automation work is to connect the user's own data sources, rebuild the dashboard from trusted data, and publish updates safely.

## Current Completion

- Local development tools: mostly ready.
- User-owned GitHub repository handoff: pending remote creation under `leisurewang0827`.
- Public setup/management pages: ready.
- Main dashboard static artifact: ready through 2026-06-24.
- Repeatable data refresh pipeline: not yet proven on this computer.
- Secrets/API configuration: pending local `.env.local` setup.
- Browser automation/login sessions: pending Chrome profile or connector confirmation.

## Local Computer Setup

1. Work from this repository path.
2. Copy `.env.example` to `.env.local`.
3. Fill `.env.local` only on the local computer or a proper secret store.
   - Use `SUPABASE_URL` without `/rest/v1/`, e.g. `https://project-ref.supabase.co`.
   - Use the legacy `service_role` JWT from Supabase `API Keys > Legacy anon, service_role API keys`.
   - Do not use a newer `sb_secret_*` key for the current REST checks unless the API confirms it works.
4. Run:

```powershell
npm.cmd run check
npm.cmd run check:data
```

PowerShell may block `npm`; use `npm.cmd` and `npx.cmd` on Windows.

## Source Of Truth

Use Supabase as the source of truth for dashboard data where available. The public static files are deployable artifacts, not canonical data.

Known referenced tables/views:

- `public.meta_ad_profit_daily_summary`
- `public.meta_ad_profit_creative_daily`
- `public.vw_ad_profit_platform_category_daily`
- `public.vw_ad_profit_platform_daily_summary`
- `public.vw_ad_profit_platform_category_monthly`
- `mart_daily_profit_gauge_latest_closed`
- `stg_ads_daily`

## Safe Operating Rules

- Read/report operations can be automated after credentials are configured.
- Writes require explicit approval:
  - ad budget changes
  - campaign/ad/ad set on/off changes
  - database writes
  - Slack or external message sending
  - GitHub push if the diff has not been reviewed
- Never put secrets in Markdown, HTML, Git commits, Slack, or plain chat.

## Suggested Work Split

- Laptop:
  - Obsidian task instructions
  - report and dashboard review
  - lightweight planning or copy edits
  - browser-only reads when a login session exists only on the laptop
- Main computer:
  - GitHub repo updates
  - static dashboard edits
  - Supabase/API read-only checks
  - scheduled refresh scripts
  - handoff documentation
  - Chrome/session-based execution when the main computer has the logged-in profile

## Next Technical Milestones

1. Apply `supabase/migrations/001_init_agp_dashboard.sql` in Supabase SQL Editor.
2. Confirm `.env.local` values exist without printing them.
3. Run `npm.cmd run check:supabase` until the baseline tables/views return `OK`.
4. Add or recover the data extraction script that queries Supabase/API sources.
5. Rebuild `index.html` from current data for 2026-06-25.
6. Validate dashboard rendering locally.
7. Commit and push the generated artifact.
8. Add a scheduled runner only after manual refresh succeeds twice.

## Current Local Verification Commands

- `npm.cmd run check`: verifies local tools and required secret placeholders.
- `npm.cmd run check:data`: reads committed static dashboard files and reports the latest data dates.
- `npm.cmd run check:all`: runs both checks.

Current known output:

- Main dashboard: latest date `2026-06-24`.
- Ad dashboard: latest date `2026-04-27`.
