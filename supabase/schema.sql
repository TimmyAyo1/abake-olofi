-- Àbáké Olófì order tracker: database schema
-- Run this once in Supabase → SQL Editor → New query → paste → Run.

-- gen_random_uuid() is built into Postgres 13+, no extension needed.

-- ───────────────────────── Staff (who can sign in to the admin side)
create table if not exists public.staff (
  user_id    uuid primary key references auth.users on delete cascade,
  name       text not null,
  role       text not null default 'admin' check (role in ('owner', 'admin', 'staff')),
  created_at timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

-- ───────────────────────── Weavers
create table if not exists public.weavers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  phone      text,
  notes      text,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Templates (orders she makes again and again)
create table if not exists public.templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  specs       text,
  lines       jsonb not null default '[]'::jsonb,  -- [{desc, qty, unit}]
  weaver_cost numeric,
  weeks       int,
  created_at  timestamptz not null default now()
);

-- ───────────────────────── Orders
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  ref              text not null unique,                 -- e.g. AO-26-014
  client_name      text not null,
  client_phone     text,
  source           text,                                 -- TikTok, Instagram, Referral, ...
  title            text,                                 -- e.g. Gele and ipele
  specs            text,                                 -- colours, pattern, pieces, sizes
  colourway        text,                                 -- swatch shown in lists
  event_date       date,
  lines            jsonb not null default '[]'::jsonb,   -- invoice lines [{desc, qty, unit}]
  other_costs      numeric not null default 0,
  stage            text not null default 'enquiry'
                   check (stage in ('enquiry','invoiced','deposit','weaving','ready','delivered')),
  cancelled        boolean not null default false,
  invoiced_at      date,
  deposit_at       date,
  weaving_at       date,
  ready_at         date,
  delivered_at     date,
  weaver_id        uuid references public.weavers on delete set null,
  weaver_cost      numeric,
  weaver_promised  date,
  client_promised  date,
  client_date_note text,                                 -- shown to the client when the date moves
  next_call        date,
  last_call        date,
  cover_path       text,                                 -- first photo, shown in lists
  track_token      text not null unique default replace(gen_random_uuid()::text, '-', ''),
  feedback_product text check (feedback_product in ('loved','okay','unhappy')),
  feedback_service text check (feedback_service in ('loved','okay','unhappy')),
  feedback_better  text,
  feedback_public  text,
  feedback_share   boolean,
  feedback_at      timestamptz,
  created_by       uuid references auth.users on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists orders_stage_idx on public.orders (stage);
create index if not exists orders_next_call_idx on public.orders (next_call);

-- ───────────────────────── Updates (calls, progress, notes) with photos/videos
create table if not exists public.order_updates (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders on delete cascade,
  kind       text not null check (kind in ('weaver','client','note','stage','payment')),
  body       text,
  media      jsonb not null default '[]'::jsonb,   -- [{path, type: 'image'|'video'}]
  shared     boolean not null default false,       -- shown on the client's tracking page
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists order_updates_order_idx on public.order_updates (order_id, created_at desc);

-- ───────────────────────── Payments (in = from client, out = to weaver)
create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders on delete cascade,
  direction  text not null check (direction in ('in','out')),
  amount     numeric not null check (amount > 0),
  paid_on    date not null default current_date,
  kind       text,                                  -- deposit, balance, weaver, ...
  proof_path text,                                  -- bank alert screenshot in storage
  created_at timestamptz not null default now()
);

create index if not exists payments_order_idx on public.payments (order_id);

-- ───────────────────────── Business settings (one row)
create table if not exists public.settings (
  id              int primary key default 1 check (id = 1),
  biz_name        text not null default 'Àbáké Olófì',
  address         text default 'Oje Market, Ibadan',
  phone           text default '08107985997',
  handle          text default '@abake_olofi',
  bank_name       text,
  account_name    text,
  account_number  text,
  terms           text default 'Work begins once the deposit is received. Balance is due before delivery.',
  buffer_days     int not null default 7,
  call_every_days int not null default 3
);
insert into public.settings (id) values (1) on conflict do nothing;

-- ───────────────────────── Keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
for each row execute function public.touch_updated_at();

-- ───────────────────────── Row-level security: only staff can read or write
alter table public.staff         enable row level security;
alter table public.weavers       enable row level security;
alter table public.templates     enable row level security;
alter table public.orders        enable row level security;
alter table public.order_updates enable row level security;
alter table public.payments      enable row level security;
alter table public.settings      enable row level security;

drop policy if exists "staff read staff" on public.staff;
create policy "staff read staff" on public.staff for select using (public.is_staff());

do $$
declare t text;
begin
  foreach t in array array['weavers','templates','orders','order_updates','payments','settings'] loop
    execute format('drop policy if exists "staff all" on public.%I', t);
    execute format('create policy "staff all" on public.%I for all using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

-- Table access for the Data API. Row-level security above still decides which rows.
-- (Needed when "Automatically expose new tables" is switched off in Supabase.)
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant execute on function public.is_staff() to authenticated, service_role;

-- The client tracking page reads through the server with the service role key,
-- so clients never get direct database access.

-- ───────────────────────── Storage for photos, videos and payment screenshots
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 104857600)   -- 100 MB per file (videos)
on conflict (id) do nothing;

drop policy if exists "staff media read"   on storage.objects;
drop policy if exists "staff media write"  on storage.objects;
drop policy if exists "staff media delete" on storage.objects;
create policy "staff media read"   on storage.objects for select using (bucket_id = 'media' and public.is_staff());
create policy "staff media write"  on storage.objects for insert with check (bucket_id = 'media' and public.is_staff());
create policy "staff media delete" on storage.objects for delete using (bucket_id = 'media' and public.is_staff());

-- ───────────────────────── After creating your users in Authentication → Users,
-- add them as staff (replace the emails and names):
--
-- insert into public.staff (user_id, name, role)
-- select id, 'Abake', 'owner' from auth.users where email = 'abake@example.com';
-- insert into public.staff (user_id, name, role)
-- select id, 'Timilehin', 'admin' from auth.users where email = 'you@example.com';


-- Invoice numbers, discount and agreed deposit (run once in the SQL Editor)
alter table public.orders   add column if not exists invoice_no  int unique;
alter table public.orders   add column if not exists discount    numeric not null default 0;
alter table public.orders   add column if not exists deposit_due numeric;
alter table public.settings add column if not exists next_invoice_no int not null default 1281;

-- Hands out the next invoice number safely, even if two people send invoices at once.
create or replace function public.take_invoice_no(p_order uuid)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  select invoice_no into n from orders where id = p_order;
  if n is not null then return n; end if;
  update settings set next_invoice_no = next_invoice_no + 1 where id = 1 returning next_invoice_no - 1 into n;
  update orders set invoice_no = n where id = p_order;
  return n;
end $$;
grant execute on function public.take_invoice_no(uuid) to authenticated;


-- 003
-- Weavers can be taken off the active list without losing their history.
alter table public.weavers add column if not exists active boolean not null default true;


-- 004
-- Each new-order form carries a one-time key, so a double tap can never create two orders.
alter table public.orders add column if not exists client_key text unique;
