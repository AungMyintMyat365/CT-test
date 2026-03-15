-- Local login accounts for coaches/admins
create table if not exists public.local_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  role text not null check (role in ('ADMIN', 'COACH')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_local_accounts_updated_at on public.local_accounts;
create trigger trg_local_accounts_updated_at
before update on public.local_accounts
for each row
execute function public.set_updated_at();

-- Seed test coach accounts (password: ciyclub)
insert into public.local_accounts (username, password_hash, role)
values
  ('Coach1', '$2b$10$TseM9QwWKX4LnfZsIp7S5u7Sswo4bnWl2DrL4gTebR3aIz10Co/iO', 'COACH'),
  ('Coach2', '$2b$10$TseM9QwWKX4LnfZsIp7S5u7Sswo4bnWl2DrL4gTebR3aIz10Co/iO', 'COACH')
on conflict (username) do nothing;
