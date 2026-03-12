alter table public.professional_marks
  add column if not exists candidate_name text,
  add column if not exists age integer,
  add column if not exists streamline text,
  add column if not exists assessor text,
  add column if not exists level text,
  add column if not exists center_code text;
