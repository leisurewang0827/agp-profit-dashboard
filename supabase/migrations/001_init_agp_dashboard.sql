-- AGP dashboard baseline schema
-- Run this in Supabase SQL Editor for the user-owned project.
-- This migration is intentionally read/report focused. It does not automate ad writes.

create table if not exists public.mart_daily_profit_gauge_latest_closed (
  report_date date primary key,
  revenue numeric not null default 0,
  self_revenue_api numeric not null default 0,
  naver_revenue_api numeric not null default 0,
  imweb_profit numeric not null default 0,
  naver_profit numeric not null default 0,
  meta_ad_spend numeric not null default 0,
  google_ad_spend numeric not null default 0,
  naver_search_ad_spend numeric not null default 0,
  imweb_delivery_fee numeric not null default 0,
  naver_delivery_fee numeric not null default 0,
  total_delivery_fee numeric not null default 0,
  quality text not null default 'MANUAL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mart_daily_profit_month
  on public.mart_daily_profit_gauge_latest_closed (report_date);

create table if not exists public.stg_ads_daily (
  report_date date not null,
  platform text not null,
  ad_spend numeric not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  ad_conversions numeric not null default 0,
  ad_conversion_value numeric not null default 0,
  source text not null default 'manual',
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (report_date, platform)
);

create index if not exists idx_stg_ads_daily_platform_date
  on public.stg_ads_daily (platform, report_date);

create table if not exists public.ad_profit_platform_category_daily (
  report_date date not null,
  platform text not null,
  category text not null,
  spend numeric not null default 0,
  revenue numeric not null default 0,
  net_profit numeric not null default 0,
  order_count integer not null default 0,
  real_roi numeric not null default 0,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (report_date, platform, category)
);

create index if not exists idx_ad_profit_category_daily_date
  on public.ad_profit_platform_category_daily (report_date, platform, category);

create or replace view public.meta_ad_profit_daily_summary as
select
  report_date,
  category,
  spend,
  revenue,
  net_profit,
  order_count,
  real_roi
from public.ad_profit_platform_category_daily
where platform = 'meta';

create or replace view public.meta_ad_profit_creative_daily as
select
  report_date,
  platform,
  category,
  spend,
  revenue,
  net_profit,
  order_count,
  real_roi
from public.ad_profit_platform_category_daily
where platform = 'meta';

create or replace view public.vw_ad_profit_platform_category_daily as
select
  report_date,
  platform,
  category,
  spend,
  revenue,
  net_profit,
  order_count,
  real_roi
from public.ad_profit_platform_category_daily;

create or replace view public.vw_ad_profit_platform_daily_summary as
select
  report_date,
  platform,
  sum(spend) as ad_spend,
  sum(revenue) as revenue,
  sum(net_profit) as net_profit,
  sum(order_count) as order_count,
  case
    when sum(spend) = 0 then 0
    else sum(net_profit) / nullif(sum(spend), 0)
  end as real_roi
from public.ad_profit_platform_category_daily
group by report_date, platform;

create or replace view public.vw_ad_profit_platform_category_monthly as
select
  to_char(report_date, 'YYYY-MM') as month,
  platform,
  category,
  sum(spend) as spend,
  sum(revenue) as revenue,
  sum(net_profit) as net_profit,
  sum(order_count) as order_count,
  case
    when sum(spend) = 0 then 0
    else sum(net_profit) / nullif(sum(spend), 0)
  end as real_roi
from public.ad_profit_platform_category_daily
group by to_char(report_date, 'YYYY-MM'), platform, category;

alter table public.mart_daily_profit_gauge_latest_closed enable row level security;
alter table public.stg_ads_daily enable row level security;
alter table public.ad_profit_platform_category_daily enable row level security;

drop policy if exists "service role full access mart daily profit" on public.mart_daily_profit_gauge_latest_closed;
create policy "service role full access mart daily profit"
  on public.mart_daily_profit_gauge_latest_closed
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role full access stg ads daily" on public.stg_ads_daily;
create policy "service role full access stg ads daily"
  on public.stg_ads_daily
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role full access ad profit daily" on public.ad_profit_platform_category_daily;
create policy "service role full access ad profit daily"
  on public.ad_profit_platform_category_daily
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
