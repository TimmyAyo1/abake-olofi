-- Several bank accounts; each invoice says which one to pay into.
create table if not exists public.bank_accounts (
  id             uuid primary key default gen_random_uuid(),
  bank_name      text not null,
  account_name   text,
  account_number text not null,
  is_default     boolean not null default false,
  created_at     timestamptz not null default now()
);
alter table public.bank_accounts enable row level security;
drop policy if exists "staff all" on public.bank_accounts;
create policy "staff all" on public.bank_accounts for all using (public.is_staff()) with check (public.is_staff());
grant select, insert, update, delete on public.bank_accounts to authenticated, service_role;

alter table public.orders add column if not exists bank_account_id uuid references public.bank_accounts on delete set null;

-- Carry over the account already typed in Settings, as the default.
insert into public.bank_accounts (bank_name, account_name, account_number, is_default)
select coalesce(bank_name, 'Bank'), account_name, account_number, true
from public.settings
where id = 1 and account_number is not null
  and not exists (select 1 from public.bank_accounts);
