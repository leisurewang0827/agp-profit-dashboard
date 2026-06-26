-- Shared automation operations schema
-- This creates the lightweight run log and approval queue used by AGP now
-- and reusable later for Tennis Clubhouse operations.

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null check (status in ('running', 'success', 'failed', 'skipped')),
  source text not null default 'main_computer',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  summary text,
  metrics jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_automation_runs_job_started
  on public.automation_runs (job_name, started_at desc);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  action_type text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'executed')),
  risk_level text not null default 'medium' check (risk_level in ('low', 'medium', 'high')),
  title text not null,
  description text,
  requested_payload jsonb not null default '{}'::jsonb,
  requested_by text not null default 'codex',
  approved_by text,
  approved_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_approval_requests_status_created
  on public.approval_requests (status, created_at desc);

create table if not exists public.daily_briefings (
  briefing_date date primary key,
  status text not null default 'draft' check (status in ('draft', 'ready', 'sent', 'archived')),
  title text not null,
  summary text not null,
  metrics jsonb not null default '{}'::jsonb,
  action_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.automation_runs enable row level security;
alter table public.approval_requests enable row level security;
alter table public.daily_briefings enable row level security;

drop policy if exists "service role full access automation runs" on public.automation_runs;
create policy "service role full access automation runs"
  on public.automation_runs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role full access approval requests" on public.approval_requests;
create policy "service role full access approval requests"
  on public.approval_requests
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role full access daily briefings" on public.daily_briefings;
create policy "service role full access daily briefings"
  on public.daily_briefings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
