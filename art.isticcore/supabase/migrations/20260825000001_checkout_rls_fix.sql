-- CHECKOUT RLS FIX (2026-08-25)
-- Customers could never place orders: public.orders had a SELECT policy
-- but no INSERT policy, so RLS denied every insert.

create policy "orders_insert_own"
  on public.orders
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Notes:
-- * payments rows are written by the server with the service-role key
--   (schema intent: "write via service role") — no policy needed.
-- * order_items already had "order_items_insert_own".
