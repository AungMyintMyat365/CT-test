-- Migration: update marks categories to
-- Sequencing & Debugging, Decomposition, Abstraction, Pattern Recognition, Total, TP

alter table public.marks
  add column if not exists sequencing_debugging_score integer,
  add column if not exists decomposition_score integer,
  add column if not exists abstraction_score integer,
  add column if not exists pattern_recognition_score integer,
  add column if not exists tp_score numeric(5,2);

-- Backfill new columns from old schema where possible.
update public.marks
set
  sequencing_debugging_score = coalesce(sequencing_debugging_score, logic_score, 0),
  decomposition_score = coalesce(decomposition_score, algorithm_score, 0),
  abstraction_score = coalesce(abstraction_score, problem_score, 0),
  pattern_recognition_score = coalesce(pattern_recognition_score, pattern_score, 0)
where
  sequencing_debugging_score is null
  or decomposition_score is null
  or abstraction_score is null
  or pattern_recognition_score is null;

update public.marks
set total_score = coalesce(sequencing_debugging_score, 0)
  + coalesce(decomposition_score, 0)
  + coalesce(abstraction_score, 0)
  + coalesce(pattern_recognition_score, 0),
    tp_score = round(((
      coalesce(sequencing_debugging_score, 0)
      + coalesce(decomposition_score, 0)
      + coalesce(abstraction_score, 0)
      + coalesce(pattern_recognition_score, 0)
    )::numeric / 59) * 100, 2)
where tp_score is null;

alter table public.marks
  alter column sequencing_debugging_score set not null,
  alter column decomposition_score set not null,
  alter column abstraction_score set not null,
  alter column pattern_recognition_score set not null,
  alter column tp_score set not null;

alter table public.marks drop constraint if exists marks_logic_score_check;
alter table public.marks drop constraint if exists marks_pattern_score_check;
alter table public.marks drop constraint if exists marks_algorithm_score_check;
alter table public.marks drop constraint if exists marks_problem_score_check;
alter table public.marks drop constraint if exists marks_sequencing_debugging_score_check;
alter table public.marks drop constraint if exists marks_decomposition_score_check;
alter table public.marks drop constraint if exists marks_abstraction_score_check;
alter table public.marks drop constraint if exists marks_pattern_recognition_score_check;
alter table public.marks drop constraint if exists marks_tp_score_check;

alter table public.marks
  add constraint marks_sequencing_debugging_score_check
    check (sequencing_debugging_score >= 0 and sequencing_debugging_score <= 59),
  add constraint marks_decomposition_score_check
    check (decomposition_score >= 0 and decomposition_score <= 59),
  add constraint marks_abstraction_score_check
    check (abstraction_score >= 0 and abstraction_score <= 59),
  add constraint marks_pattern_recognition_score_check
    check (pattern_recognition_score >= 0 and pattern_recognition_score <= 59),
  add constraint marks_tp_score_check
    check (tp_score >= 0 and tp_score <= 100);

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
