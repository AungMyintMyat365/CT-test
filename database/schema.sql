-- CIY.club Assessment System schema
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

-- Roles for authenticated app users.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('ADMIN', 'COACH')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Students Table (required fields from spec included).
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_date date not null,
  streamline text not null,
  coach text not null,
  coach_email text,
  coach_id uuid references public.users(id) on delete set null,
  professional_level_completed_at date,
  next_assessment_date date,
  next_assessment_type text check (
    next_assessment_type in ('INITIAL_CT', 'INITIAL_CT_SECOND', 'PROFESSIONAL', 'DEVELOPMENT_CT')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Assessments Table.
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  assessment_type text not null check (
    assessment_type in ('INITIAL_CT', 'INITIAL_CT_SECOND', 'PROFESSIONAL', 'DEVELOPMENT_CT')
  ),
  date date not null,
  score integer not null check (score >= 0 and score <= 100),
  coach text not null,
  created_at timestamptz not null default now()
);

-- Marks Table.
create table if not exists public.marks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  assessment_type text not null check (
    assessment_type in ('INITIAL_CT', 'INITIAL_CT_SECOND', 'PROFESSIONAL', 'DEVELOPMENT_CT')
  ),
  sequencing_debugging_score integer not null check (sequencing_debugging_score >= 0 and sequencing_debugging_score <= 59),
  decomposition_score integer not null check (decomposition_score >= 0 and decomposition_score <= 59),
  abstraction_score integer not null check (abstraction_score >= 0 and abstraction_score <= 59),
  pattern_recognition_score integer not null check (pattern_recognition_score >= 0 and pattern_recognition_score <= 59),
  total_score integer not null,
  tp_score numeric(5,2) not null check (tp_score >= 0 and tp_score <= 100),
  coach text not null,
  sheet_sync_status text not null default 'PENDING' check (sheet_sync_status in ('PENDING', 'SYNCED', 'FAILED')),
  sheet_sync_error text,
  sheet_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Assessment rule metadata table for admin rule management.
create table if not exists public.assessment_rules (
  id uuid primary key default gen_random_uuid(),
  assessment_type text not null check (
    assessment_type in ('INITIAL_CT', 'INITIAL_CT_SECOND', 'PROFESSIONAL', 'DEVELOPMENT_CT')
  ),
  months_interval integer,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_type)
);

insert into public.assessment_rules (assessment_type, months_interval, notes)
values
  ('INITIAL_CT', null, 'First assessment when student joins.'),
  ('INITIAL_CT_SECOND', 6, 'Second initial assessment after 6 months (24 sessions).'),
  ('PROFESSIONAL', null, 'Assigned when professional level is completed.'),
  ('DEVELOPMENT_CT', 6, 'Development assessment every 6 months after baseline.')
on conflict (assessment_type) do nothing;

create or replace function public.set_total_score()
returns trigger
language plpgsql
as $$
begin
  new.total_score := coalesce(new.sequencing_debugging_score, 0)
    + coalesce(new.decomposition_score, 0)
    + coalesce(new.abstraction_score, 0)
    + coalesce(new.pattern_recognition_score, 0);
  new.tp_score := round((new.total_score::numeric / 59) * 100, 2);
  return new;
end;
$$;

drop trigger if exists trg_set_total_score on public.marks;
create trigger trg_set_total_score
before insert or update on public.marks
for each row
execute function public.set_total_score();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists trg_students_updated_at on public.students;
create trigger trg_students_updated_at
before update on public.students
for each row
execute function public.set_updated_at();

drop trigger if exists trg_marks_updated_at on public.marks;
create trigger trg_marks_updated_at
before update on public.marks
for each row
execute function public.set_updated_at();

drop trigger if exists trg_assessment_rules_updated_at on public.assessment_rules;
create trigger trg_assessment_rules_updated_at
before update on public.assessment_rules
for each row
execute function public.set_updated_at();

create index if not exists idx_students_name on public.students (name);
create index if not exists idx_students_next_assessment_date on public.students (next_assessment_date);
create index if not exists idx_assessments_student_date on public.assessments (student_id, date desc);
create index if not exists idx_marks_student_created_at on public.marks (student_id, created_at desc);

-- Optional: enable RLS and define policies when moving to direct client access patterns.
-- The current architecture uses a secure backend with service role key access.
