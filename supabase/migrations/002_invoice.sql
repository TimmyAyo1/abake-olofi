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
