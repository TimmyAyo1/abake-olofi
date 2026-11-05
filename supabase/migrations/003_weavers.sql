-- Weavers can be taken off the active list without losing their history.
alter table public.weavers add column if not exists active boolean not null default true;
