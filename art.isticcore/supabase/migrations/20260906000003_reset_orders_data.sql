-- RESET ORDERS / REVENUE / ANALYTICS (2026-09-06)
-- Wipes all transactional data so the admin dashboard starts from zero.
-- Caller must run this in the Supabase dashboard SQL Editor.
--
-- THIS IS PERMANENT. It deletes every order, payment, and order item.
-- Customer accounts, saved addresses, products, categories and reviews are kept.

-- 1. Payments first (they reference orders)
delete from public.payments;

-- 2. Order items (reference orders; also cascade-deleted by step 3 when the FK has CASCADE)
delete from public.order_items;

-- 3. Orders last
delete from public.orders;

-- Optional: also clear custom-design/inquiry requests so the notification bell
-- and dashboard "new custom requests" counter go back to zero. Uncomment to run.
-- delete from public.custom_design_requests;

-- Sanity check afterwards:
-- select
--   (select count(*) from public.orders)  as orders,
--   (select count(*) from public.payments) as payments,
--   (select count(*) from public.order_items) as order_items;