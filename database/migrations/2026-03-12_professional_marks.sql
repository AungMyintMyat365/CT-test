create table if not exists public.professional_marks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  template_key text not null,
  template_title text not null,
  scores jsonb not null,
  total_score numeric not null,
  max_score numeric not null,
  percentage numeric(5,2) not null,
  result text not null check (result in ('MET', 'NOT_MET')),
  coach text not null,
  date date not null,
  sheet_sync_status text not null default 'PENDING' check (sheet_sync_status in ('PENDING', 'SYNCED', 'FAILED')),
  sheet_sync_error text,
  sheet_synced_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_professional_marks_student_id on public.professional_marks(student_id);
create index if not exists idx_professional_marks_template_key on public.professional_marks(template_key);
create index if not exists idx_professional_marks_created_at on public.professional_marks(created_at desc);
