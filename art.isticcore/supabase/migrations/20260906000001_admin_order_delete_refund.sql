-- Admin order delete + refund tracking support.
--
-- 1) Allow a hard order delete to cascade to payments. order_items already has
--    ON DELETE CASCADE, but payments.order_id was created without it — an admin
--    deleting an order would otherwise fail on the FK. The DELETE route also
--    removes the payment row explicitly, this migration just keeps the schema
--    consistent for any future path.

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'payments_order_id_fkey' and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments drop constraint payments_order_id_fkey;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where contype = 'f'
      and conrelid = 'public.payments'::regclass
      and confrelid = 'public.orders'::regclass
  ) then
    alter table public.payments
      add constraint payments_order_id_fkey
      foreign key (order_id) references public.orders(id) on delete cascade;
  end if;
end $$;