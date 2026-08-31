-- ============================================================
-- MIGRATION: Domain Pivot — Retail → Made-to-Order / Art Commission
-- ============================================================

-- ── 1. LOWERCASE payment_status ENUM ───────────────────────────
do $$
begin
  if exists (select 1 from pg_enum where enumlabel = 'PENDING' and enumtypid = 'payment_status'::regtype) then
    create type payment_status_new as enum ('pending','paid','failed','refunded','partially_refunded');
    alter table public.orders alter column payment_status drop default;
    alter table public.orders alter column payment_status type payment_status_new using (
      case payment_status::text
        when 'PENDING' then 'pending'::payment_status_new
        when 'PAID' then 'paid'::payment_status_new
        when 'FAILED' then 'failed'::payment_status_new
        when 'REFUNDED' then 'refunded'::payment_status_new
        when 'PARTIALLY_REFUNDED' then 'partially_refunded'::payment_status_new
        when 'COD_PENDING' then 'pending'::payment_status_new
        when 'COD_COLLECTED' then 'paid'::payment_status_new
        else 'pending'::payment_status_new
      end
    );
    alter table public.orders alter column payment_status set default 'pending'::payment_status_new;
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name='payments') then
      alter table public.payments alter column status drop default;
      alter table public.payments alter column status type payment_status_new using (
        case status::text
          when 'PENDING' then 'pending'::payment_status_new
          when 'PAID' then 'paid'::payment_status_new
          when 'FAILED' then 'failed'::payment_status_new
          when 'REFUNDED' then 'refunded'::payment_status_new
          when 'PARTIALLY_REFUNDED' then 'partially_refunded'::payment_status_new
          when 'COD_PENDING' then 'pending'::payment_status_new
          when 'COD_COLLECTED' then 'paid'::payment_status_new
          else 'pending'::payment_status_new
        end
      );
      alter table public.payments alter column status set default 'pending'::payment_status_new;
    end if;
    drop type payment_status;
    alter type payment_status_new rename to payment_status;
  end if;
end; $$;

-- ── 2. LOWERCASE payment_method ENUM (UPI only) ────────────────
do $$
begin
  if exists (select 1 from pg_enum where enumlabel = 'RAZORPAY' and enumtypid = 'payment_method'::regtype) then
    -- Drop place_order function first (depends on payment_method type)
    drop function if exists public.place_order(uuid, uuid, jsonb, public.payment_method, numeric, numeric, text);
    create type payment_method_new as enum ('razorpay');
    alter table public.orders alter column payment_method drop default;
    alter table public.orders alter column payment_method type payment_method_new using (
      case payment_method::text
        when 'RAZORPAY' then 'razorpay'::payment_method_new
        when 'COD' then 'razorpay'::payment_method_new
        else 'razorpay'::payment_method_new
      end
    );
    alter table public.orders alter column payment_method set default 'razorpay'::payment_method_new;
    drop type payment_method;
    alter type payment_method_new rename to payment_method;
  end if;
end; $$;

-- ── 3. CLEANUP any leftover order_status_new from failed run ───
do $$
begin
  if exists (select 1 from pg_type where typname = 'order_status_new') then
    drop type order_status_new;
  end if;
end; $$;

-- ── 4. REDEFINE order_status ENUM ──────────────────────────────
do $$
begin
  if exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status_new as enum (
      'pending_review',
      'accepted',
      'in_progress',
      'finishing',
      'quality_check',
      'ready_for_delivery',
      'delivered',
      'cancelled',
      'refunded'
    );
    alter table public.orders alter column status drop default;
    alter table public.orders alter column status type order_status_new using (
      case status::text
        when 'PLACED' then 'pending_review'::order_status_new
        when 'PAYMENT_PENDING' then 'pending_review'::order_status_new
        when 'pending' then 'pending_review'::order_status_new
        when 'CONFIRMED' then 'accepted'::order_status_new
        when 'confirmed' then 'accepted'::order_status_new
        when 'IN_PRODUCTION' then 'in_progress'::order_status_new
        when 'processing' then 'in_progress'::order_status_new
        when 'QUALITY_CHECK' then 'quality_check'::order_status_new
        when 'PACKED' then 'ready_for_delivery'::order_status_new
        when 'ready_to_ship' then 'ready_for_delivery'::order_status_new
        when 'SHIPPED' then 'delivered'::order_status_new
        when 'shipped' then 'delivered'::order_status_new
        when 'OUT_FOR_DELIVERY' then 'delivered'::order_status_new
        when 'out_for_delivery' then 'delivered'::order_status_new
        when 'DELIVERED' then 'delivered'::order_status_new
        when 'delivered' then 'delivered'::order_status_new
        when 'CANCELLED' then 'cancelled'::order_status_new
        when 'cancelled' then 'cancelled'::order_status_new
        when 'REFUNDED' then 'refunded'::order_status_new
        when 'refunded' then 'refunded'::order_status_new
        else 'pending_review'::order_status_new
      end
    );
    alter table public.orders alter column status set default 'pending_review'::order_status_new;
    drop type order_status;
    alter type order_status_new rename to order_status;
  end if;
end; $$;

-- ── 5. PURGE RETAIL COLUMNS FROM products ──────────────────────
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='stock') then
    alter table public.products drop column stock;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='low_stock_threshold') then
    alter table public.products drop column low_stock_threshold;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='sku') then
    alter table public.products drop column sku;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='attributes') then
    alter table public.products drop column attributes;
  end if;
end; $$;

-- ── 6. ADD COMMISSION METADATA TO products ─────────────────────
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='estimated_creation_days') then
    alter table public.products add column estimated_creation_days integer not null default 14 check (estimated_creation_days >= 0);
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='complexity_tier') then
    alter table public.products add column complexity_tier text not null default 'standard' check (complexity_tier in ('simple', 'standard', 'complex', 'masterwork'));
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='customization_allowed') then
    alter table public.products add column customization_allowed boolean not null default true;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='is_available') then
    alter table public.products add column is_available boolean not null default true;
  end if;
end; $$;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='is_orderable') then
    update public.products set is_available = is_orderable;
    alter table public.products drop column is_orderable;
  end if;
end; $$;

-- ── 7. STRIP RETAIL FROM product_variants ──────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='product_variants') then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='product_variants' and column_name='sku') then
      alter table public.product_variants drop column sku;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='product_variants' and column_name='stock') then
      alter table public.product_variants drop column stock;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='product_variants' and column_name='attributes') then
      alter table public.product_variants drop column attributes;
    end if;
  end if;
end; $$;

-- ── 8. PURGE variant_id FROM order_items ───────────────────────
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='order_items' and column_name='variant_id') then
    alter table public.order_items drop column variant_id;
  end if;
end; $$;

-- ── 9. PURGE variant_id FROM cart_items ────────────────────────
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='cart_items' and column_name='variant_id') then
    alter table public.cart_items drop column variant_id;
  end if;
  if exists (select 1 from information_schema.table_constraints where constraint_name='cart_items_cart_id_product_id_variant_id_key') then
    alter table public.cart_items drop constraint cart_items_cart_id_product_id_variant_id_key;
    alter table public.cart_items add unique (cart_id, product_id);
  end if;
end; $$;

-- ── 10. ADD COMMISSION FIELDS TO orders ────────────────────────
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='is_custom_commission') then
    alter table public.orders add column is_custom_commission boolean not null default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='customization_details') then
    alter table public.orders add column customization_details jsonb;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='cod_fee') then
    alter table public.orders drop column cod_fee;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='cod_collected') then
    alter table public.orders drop column cod_collected;
  end if;
end; $$;

-- ── 11. RECREATE INDEXES ───────────────────────────────────────
drop index if exists public.idx_products_price_stock;
drop index if exists public.idx_product_variants_product;
create index if not exists idx_products_complexity on public.products(complexity_tier) where is_active = true;
create index if not exists idx_orders_status on public.orders(status) where status not in ('delivered', 'cancelled', 'refunded');

-- ── 12. STATE MACHINE TRIGGER ──────────────────────────────────
create or replace function public.enforce_order_status_transition()
returns trigger
language plpgsql
as $$
declare
  allowed text[];
begin
  if old.status is distinct from new.status then
    case old.status::text
      when 'pending_review' then allowed := array['accepted', 'cancelled'];
      when 'accepted' then allowed := array['in_progress', 'cancelled'];
      when 'in_progress' then allowed := array['finishing', 'cancelled'];
      when 'finishing' then allowed := array['quality_check', 'cancelled'];
      when 'quality_check' then allowed := array['ready_for_delivery', 'in_progress', 'cancelled'];
      when 'ready_for_delivery' then allowed := array['delivered', 'cancelled'];
      when 'delivered' then allowed := array[]::text[];
      when 'cancelled' then allowed := array['refunded'];
      when 'refunded' then allowed := array[]::text[];
      else allowed := array[]::text[];
    end case;
    if not (new.status::text = any(allowed)) then
      raise exception 'Invalid transition % -> %. Allowed: %', old.status, new.status, array_to_string(allowed, ', ');
    end if;
  end if;
  return new;
end;
$$;

-- ── 13. STATUS AUDIT TRIGGER ───────────────────────────────────
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
as $$
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
end;
$$;

-- ── 14. RECREATE place_order() ─────────────────────────────────
create or replace function public.place_order(
  p_user_id uuid,
  p_address_id uuid,
  p_items jsonb,
  p_payment_method public.payment_method,
  p_subtotal numeric,
  p_discount numeric,
  p_customer_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_grand_total numeric;
  v_item jsonb;
  v_product_name text;
  v_product_price numeric;
  v_product_image text;
  v_line_total numeric;
  v_created_items jsonb := '[]'::jsonb;
begin
  v_order_number := 'KNT-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(md5(random()::text), 1, 4));
  v_grand_total := p_subtotal - p_discount;

  insert into public.orders (
    order_number, user_id, address_id, status, payment_method, payment_status,
    subtotal, discount, total, customer_note, estimated_completion_date
  ) values (
    v_order_number, p_user_id, p_address_id,
    'pending_review'::public.order_status,
    p_payment_method,
    'pending'::public.payment_status,
    p_subtotal, p_discount, v_grand_total, p_customer_note,
    now() + interval '14 days'
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_name := v_item->>'name';
    v_product_price := (v_item->>'price')::numeric;
    v_product_image := v_item->>'image_url';
    v_line_total := v_product_price;

    insert into public.order_items (
      order_id, product_id, name, image_url, quantity, price, discount, total, custom_note
    ) values (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_product_name,
      v_product_image,
      coalesce((v_item->>'quantity')::integer, 1),
      v_product_price,
      coalesce((v_item->>'discount')::numeric, 0),
      v_line_total,
      v_item->>'custom_note'
    );

    v_created_items := v_created_items || jsonb_build_object(
      'name', v_product_name,
      'price', v_product_price,
      'quantity', coalesce((v_item->>'quantity')::integer, 1)
    );
  end loop;

  delete from public.cart_items where cart_id in (
    select id from public.carts where user_id = p_user_id
  );

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total', v_grand_total,
    'items', v_created_items
  );
end;
$$;

-- ── 15. ENABLE REALTIME ────────────────────────────────────────
do $$ begin
  begin alter publication supabase_realtime add table public.orders; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.products; exception when duplicate_object then null; end;
end; $$;

-- ── 16. REVOKE EXECUTE ─────────────────────────────────────────
revoke execute on function public.place_order(uuid, uuid, jsonb, public.payment_method, numeric, numeric, text) from public, anon, authenticated;
grant execute on function public.place_order(uuid, uuid, jsonb, public.payment_method, numeric, numeric, text) to service_role;

-- Update payments gateway check to UPI only
do $$
begin
  if exists (select 1 from information_schema.table_constraints where constraint_name='payments_gateway_check') then
    alter table public.payments drop constraint payments_gateway_check;
    update public.payments set gateway = 'razorpay' where gateway != 'razorpay';
    alter table public.payments add constraint payments_gateway_check check (gateway = 'razorpay');
  end if;
end; $$;
