-- ============================================================
-- STATE MACHINE, REALTIME & ADMIN RLS — 2026-08-26
-- - Enforce strict order_status pipeline at DB layer
-- - status_history JSONB audit trail
-- - Enable Realtime on orders
-- - Admin RLS: is_staff() can manage products/orders/collections
-- ============================================================

-- 1) Ensure order_status enum matches business pipeline (idempotent)
do $$
begin
  -- If old enum exists with uppercase values, migrate it.
  -- Safe to run repeatedly: does nothing if already lowercase.
  if exists (select 1 from pg_type where typname = 'order_status') then
    -- Check if it still has old label 'PLACED'
    if exists (select 1 from pg_enum where enumlabel = 'PLACED' and enumtypid = 'order_status'::regtype) then
      -- Create new type, cast column, swap
      create type order_status_new as enum ('pending','confirmed','processing','ready_to_ship','shipped','out_for_delivery','delivered','cancelled','refunded');
      alter table public.orders alter column status type order_status_new using (
        case status::text
          when 'PLACED' then 'pending'::order_status_new
          when 'PAYMENT_PENDING' then 'pending'::order_status_new
          when 'CONFIRMED' then 'confirmed'::order_status_new
          when 'IN_PRODUCTION' then 'processing'::order_status_new
          when 'QUALITY_CHECK' then 'ready_to_ship'::order_status_new
          when 'PACKED' then 'ready_to_ship'::order_status_new
          when 'SHIPPED' then 'shipped'::order_status_new
          when 'OUT_FOR_DELIVERY' then 'out_for_delivery'::order_status_new
          when 'DELIVERED' then 'delivered'::order_status_new
          when 'CANCELLED' then 'cancelled'::order_status_new
          when 'REFUNDED' then 'refunded'::order_status_new
          else 'pending'::order_status_new
        end
      );
      drop type order_status;
      alter type order_status_new rename to order_status;
    end if;
  end if;
end; $$;

-- 2) status_history column (if missing)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='status_history') then
    alter table public.orders add column status_history jsonb default '[]'::jsonb;
  end if;
end; $$;

-- 3) Audit trigger (BEFORE to mutate NEW.status_history)
create or replace function public.log_order_status_change()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    new.status_history := coalesce(old.status_history, '[]'::jsonb) || jsonb_build_object(
      'previous_status', old.status,
      'new_status', new.status,
      'changed_at', now(),
      'changed_by', current_user
    );
  end if;
  return new;
end; $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname='order_status_change_audit') then
    create trigger order_status_change_audit
      before update on public.orders
      for each row when (old.status is distinct from new.status)
      execute function public.log_order_status_change();
  end if;
end; $$;

-- 4) Strict state-machine enforcement (DB layer)
create or replace function public.enforce_order_status_transition()
returns trigger language plpgsql as $$
declare allowed text[];
begin
  if old.status is distinct from new.status then
    case old.status::text
      when 'pending' then allowed := array['confirmed','cancelled','refunded'];
      when 'confirmed' then allowed := array['processing','cancelled','refunded'];
      when 'processing' then allowed := array['ready_to_ship','cancelled','refunded'];
      when 'ready_to_ship' then allowed := array['shipped','cancelled','refunded'];
      when 'shipped' then allowed := array['out_for_delivery','cancelled'];
      when 'out_for_delivery' then allowed := array['delivered','cancelled'];
      when 'delivered' then allowed := array[]::text[];
      when 'cancelled' then allowed := array[]::text[];
      when 'refunded' then allowed := array[]::text[];
      else allowed := array[]::text[];
    end case;
    if not (new.status::text = any(allowed)) then
      raise exception 'Invalid order status transition % -> % . Allowed: %', old.status, new.status, array_to_string(allowed, ', ');
    end if;
  end if;
  return new;
end; $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname='enforce_order_status_transition') then
    create trigger enforce_order_status_transition
      before update on public.orders
      for each row when (old.status is distinct from new.status)
      execute function public.enforce_order_status_transition();
  end if;
end; $$;

-- 5) Enable Realtime
do $$
begin
  begin
    alter publication supabase_realtime add table public.orders;
  exception when duplicate_object then null;
  end;
end; $$;

-- 6) Admin RLS — allow is_staff() to manage catalog & orders
-- is_staff() already defined in 20260824_storage.sql
do $$
begin
  -- products
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='products_admin_all') then
    create policy "products_admin_all" on public.products
      for all to authenticated using (public.is_staff()) with check (public.is_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='product_images' and policyname='product_images_admin_all') then
    create policy "product_images_admin_all" on public.product_images
      for all to authenticated using (public.is_staff()) with check (public.is_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='product_variants' and policyname='product_variants_admin_all') then
    create policy "product_variants_admin_all" on public.product_variants
      for all to authenticated using (public.is_staff()) with check (public.is_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='collections' and policyname='collections_admin_all') then
    create policy "collections_admin_all" on public.collections
      for all to authenticated using (public.is_staff()) with check (public.is_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='collection_products' and policyname='collection_products_admin_all') then
    create policy "collection_products_admin_all" on public.collection_products
      for all to authenticated using (public.is_staff()) with check (public.is_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='orders_admin_all') then
    create policy "orders_admin_all" on public.orders
      for all to authenticated using (public.is_staff()) with check (public.is_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='order_items' and policyname='order_items_admin_all') then
    create policy "order_items_admin_all" on public.order_items
      for all to authenticated using (public.is_staff()) with check (public.is_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='payments' and policyname='payments_admin_all') then
    create policy "payments_admin_all" on public.payments
      for all to authenticated using (public.is_staff()) with check (public.is_staff());
  end if;
end; $$;

-- Ensure anon/authenticated can still read active catalog (already exists, but ensure not broken)
-- No changes to standard user INSERT on orders (orders_insert_own already exists)
