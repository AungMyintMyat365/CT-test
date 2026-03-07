-- Ops improvements: audit logs + sync queue

create extension if not exists pgcrypto;

create table if not exists public.mark_audit_logs (
  id uuid primary key default gen_random_uuid(),
  mark_id uuid references public.marks(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  action text not null,
  old_payload jsonb,
  new_payload jsonb,
  actor_name text,
  actor_email text,
  created_at timestamptz not null default now()
);

create index if not exists idx_mark_audit_logs_mark_id on public.mark_audit_logs(mark_id);
create index if not exists idx_mark_audit_logs_student_id on public.mark_audit_logs(student_id);
create index if not exists idx_mark_audit_logs_created_at on public.mark_audit_logs(created_at desc);

create table if not exists public.sheet_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  mark_id uuid not null references public.marks(id) on delete cascade,
  payload jsonb,
  status text not null default 'PENDING' check (status in ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED')),
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  last_error text,
  next_retry_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_sheet_sync_jobs_mark_id on public.sheet_sync_jobs(mark_id);
create index if not exists idx_sheet_sync_jobs_status_retry on public.sheet_sync_jobs(status, next_retry_at);
create index if not exists idx_sheet_sync_jobs_created_at on public.sheet_sync_jobs(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sheet_sync_jobs_updated_at on public.sheet_sync_jobs;
create trigger trg_sheet_sync_jobs_updated_at
before update on public.sheet_sync_jobs
for each row
execute function public.set_updated_at();
