-- Tennis Clubhouse automation blueprint.
-- Keep this as a draft until the user chooses the target Supabase project/schema.
-- Do not apply to the AGP production project without confirming the target.

create table if not exists public.tc_members (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  phone text,
  kakao_channel_user_id text,
  status text not null default 'active' check (status in ('active', 'paused', 'inactive')),
  joined_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tc_coaches (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  phone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tc_lesson_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lesson_count integer not null,
  duration_minutes integer not null default 50,
  price numeric not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tc_lesson_balances (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.tc_members(id),
  product_id uuid references public.tc_lesson_products(id),
  total_count integer not null default 0,
  used_count integer not null default 0,
  remaining_count integer not null default 0,
  expires_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tc_lesson_schedules (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.tc_members(id),
  coach_id uuid references public.tc_coaches(id),
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 50,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'changed', 'no_show')),
  change_deadline_at timestamptz generated always as (scheduled_at - interval '24 hours') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tc_lesson_change_requests (
  id uuid primary key default gen_random_uuid(),
  lesson_schedule_id uuid not null references public.tc_lesson_schedules(id),
  requested_by_role text not null check (requested_by_role in ('member', 'coach', 'admin', 'automation')),
  requested_at timestamptz not null default now(),
  requested_new_time timestamptz,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'auto_approved', 'approved', 'rejected', 'cancelled')),
  approval_request_id uuid references public.approval_requests(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tc_lesson_notes (
  id uuid primary key default gen_random_uuid(),
  lesson_schedule_id uuid not null references public.tc_lesson_schedules(id),
  member_note text,
  coach_feedback text,
  created_by_role text not null check (created_by_role in ('member', 'coach', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tc_practice_reservations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.tc_members(id),
  reserved_at timestamptz not null,
  duration_minutes integer not null default 60,
  status text not null default 'reserved' check (status in ('reserved', 'completed', 'cancelled', 'no_show')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tc_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null default 'club' check (event_type in ('club', 'league', 'tournament', 'notice')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tc_notification_logs (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid,
  channel text not null check (channel in ('kakao', 'push', 'sms', 'slack', 'email')),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  message_summary text,
  error_message text,
  created_at timestamptz not null default now()
);
