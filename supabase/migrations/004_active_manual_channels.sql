-- Active manual/admin channel reporting schema
-- Channels: Naver Place, Danggeun Ads, Instagram notices/promotions.

create table if not exists public.stg_active_channel_daily (
  report_date date not null,
  channel text not null check (channel in ('naver_place', 'daangn_ads', 'instagram_notice')),
  campaign_name text not null default '',
  spend numeric not null default 0,
  impressions integer not null default 0,
  clicks integer not null default 0,
  inquiries integer not null default 0,
  reservations integer not null default 0,
  revenue numeric not null default 0,
  followers_delta integer not null default 0,
  profile_visits integer not null default 0,
  messages integer not null default 0,
  notes text,
  source_url text,
  source text not null default 'manual_csv',
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (report_date, channel, campaign_name)
);

create index if not exists idx_stg_active_channel_daily_channel_date
  on public.stg_active_channel_daily (channel, report_date desc);

create or replace view public.vw_active_channel_daily_summary as
select
  report_date,
  channel,
  sum(spend) as spend,
  sum(impressions) as impressions,
  sum(clicks) as clicks,
  sum(inquiries) as inquiries,
  sum(reservations) as reservations,
  sum(revenue) as revenue,
  sum(followers_delta) as followers_delta,
  sum(profile_visits) as profile_visits,
  sum(messages) as messages,
  case when sum(spend) > 0 then sum(revenue) / nullif(sum(spend), 0) else 0 end as roas,
  max(updated_at) as updated_at
from public.stg_active_channel_daily
group by report_date, channel;

alter table public.stg_active_channel_daily enable row level security;

drop policy if exists "service role full access active channel daily" on public.stg_active_channel_daily;
create policy "service role full access active channel daily"
  on public.stg_active_channel_daily
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
