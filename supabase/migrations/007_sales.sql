-- Sales from what's already made (walk-in or online): paid on the spot, with a receipt.
create table if not exists public.sales (
  id              uuid primary key default gen_random_uuid(),
  receipt_no      int unique,
  customer_name   text,
  customer_phone  text,
  channel         text,                               -- Walk-in, WhatsApp, Instagram, TikTok, Online, Other
  lines           jsonb not null default '[]'::jsonb, -- [{desc, per, qty, unit}]  per = piece / bundle / yard / set
  discount        numeric not null default 0,
  total           numeric not null default 0,         -- after discount
  sold_on         date not null default current_date,
  bank_account_id uuid references public.bank_accounts on delete set null,
  note            text,
  client_key      text unique,
  created_by      uuid references auth.users on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists sales_sold_on_idx on public.sales (sold_on desc);
alter table public.sales enable row level security;
drop policy if exists "staff all" on public.sales;
create policy "staff all" on public.sales for all using (public.is_staff()) with check (public.is_staff());
grant select, insert, update, delete on public.sales to authenticated, service_role;

alter table public.settings add column if not exists next_receipt_no int not null default 1;

-- Hands out the next receipt number safely.
create or replace function public.take_receipt_no()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  update settings set next_receipt_no = next_receipt_no + 1 where id = 1 returning next_receipt_no - 1 into n;
  return n;
end $$;
grant execute on function public.take_receipt_no() to authenticated;
