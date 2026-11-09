-- One order can be split across several weavers: each gets some of the items, its own date and calls.
create table if not exists public.order_assignments (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders on delete cascade,
  weaver_id       uuid references public.weavers on delete set null,
  items           text,                         -- what this weaver is making, in words
  line_idx        int[] not null default '{}',  -- which invoice lines
  weaver_promised date,
  next_call       date,
  last_call       date,
  received_at     date,
  created_at      timestamptz not null default now()
);
create index if not exists order_assignments_order_idx on public.order_assignments (order_id);
alter table public.order_assignments enable row level security;
drop policy if exists "staff all" on public.order_assignments;
create policy "staff all" on public.order_assignments for all using (public.is_staff()) with check (public.is_staff());
grant select, insert, update, delete on public.order_assignments to authenticated, service_role;

-- Orders already handed to one weaver become a single assignment.
insert into public.order_assignments (order_id, weaver_id, items, weaver_promised, next_call, last_call, received_at)
select o.id, o.weaver_id, o.title, o.weaver_promised, o.next_call, o.last_call, o.ready_at
from public.orders o
where o.weaver_id is not null
  and not exists (select 1 from public.order_assignments a where a.order_id = o.id);
