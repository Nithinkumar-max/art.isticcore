-- ============================================================
-- ARTISTICCORE — INIT SCHEMA
-- Replaces supabase/schema.sql (never deployed: app had no DB env).
-- Hardened per 2026-08 audit: RLS on ALL tables, server-side roles,
-- race-free order numbers, stock guards, rating sync, FTS.
-- Run via SQL Editor or `supabase db push`.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type public.order_status as enum (
  'PLACED', 'PAYMENT_PENDING', 'CONFIRMED',
  'IN_PRODUCTION', 'QUALITY_CHECK', 'PACKED',
  'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED',
  'CANCELLED', 'REFUNDED'
);
create type public.payment_method as enum ('RAZORPAY', 'COD');
create type public.payment_status as enum (
  'PENDING', 'PAID', 'FAILED', 'REFUNDED',
  'PARTIALLY_REFUNDED', 'COD_PENDING', 'COD_COLLECTED'
);

-- ============================================================
-- USERS (profile table extending auth.users)
-- Role is assigned out-of-band by an admin via service role.
-- NEVER sourced from signup user_metadata (client-writable).
-- ============================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  name text,
  email text,
  role text not null default 'CUSTOMER' check (role in ('CUSTOMER', 'ADMIN', 'SUPER_ADMIN')),
  is_verified boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CATEGORIES (hierarchical)
-- ============================================================
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text unique not null,
  description text,
  image_url text,
  display_order integer not null default 0,
  section text not null default 'shop_by_category'
    check (section in ('trending', 'shop_by_category', 'weekly', 'bestsellers')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- COLLECTIONS (curated groupings, M:N with products)
-- ============================================================
create table public.collections (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  description text,
  hero_image_url text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PRODUCTS
-- Stock lives here AND on variants; both guarded by CHECK (> -1)
-- so overselling is impossible even under concurrent writes.
-- search_vector: full-text search over name + descriptions.
-- ============================================================
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  description text not null,
  short_description text,
  base_price numeric(10,2) not null check (base_price >= 0),
  discount_price numeric(10,2) check (discount_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 3,
  sku text unique,
  attributes jsonb not null default '{}'::jsonb,
  is_orderable boolean not null default true,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_bestseller boolean not null default false,
  lead_time_days integer not null default 12 check (lead_time_days >= 0),
  category_id uuid references public.categories(id) on delete set null,
  rating_avg numeric(3,2) not null default 0 check (rating_avg between 0 and 5),
  rating_count integer not null default 0,
  seo_title text,
  seo_description text,
  search_vector tsvector generated always as (
    to_tsvector('english',
      coalesce(name, '') || ' ' ||
      coalesce(short_description, '') || ' ' ||
      coalesce(description, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt_text text,
  display_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  sku text unique,
  price numeric(10,2) not null check (price >= 0),
  discount_price numeric(10,2) check (discount_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  attributes jsonb not null default '{}'::jsonb,
  lead_time_days integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collection_products (
  collection_id uuid not null references public.collections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  display_order integer not null default 0,
  primary key (collection_id, product_id)
);

-- ============================================================
-- ADDRESSES / WISHLIST
-- ============================================================
create table public.addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  label text,
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  pincode text not null,
  landmark text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wishlist_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ============================================================
-- CARTS
-- Guest carts are NEVER exposed via Data API/RLS (owner-only
-- below); anonymous sessions go through the server API which
-- uses the service-role key behind an httpOnly session cookie.
-- ============================================================
create table public.carts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique references public.users(id) on delete cascade,
  session_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or session_id is not null)
);

create table public.cart_items (
  id uuid primary key default uuid_generate_v4(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  quantity integer not null default 1 check (quantity between 1 and 99),
  custom_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, product_id, variant_id)
);

-- ============================================================
-- ORDERS
-- order_number from a dedicated sequence => no COUNT(*) race.
-- ============================================================
create sequence public.order_number_seq start 1000;

create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text not null unique,
  user_id uuid references public.users(id) on delete set null,
  address_id uuid references public.addresses(id) on delete set null,
  email text,
  status public.order_status not null default 'PLACED',
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'PENDING',
  subtotal numeric(10,2) not null check (subtotal >= 0),
  discount numeric(10,2) not null default 0 check (discount >= 0),
  shipping_fee numeric(10,2) not null default 0 check (shipping_fee >= 0),
  cod_fee numeric(10,2) not null default 0 check (cod_fee >= 0),
  total numeric(10,2) not null check (total >= 0),
  estimated_completion_date timestamptz,
  tracking_number text,
  tracking_url text,
  courier_name text,
  shipped_date timestamptz,
  delivered_date timestamptz,
  cod_collected boolean not null default false,
  customer_note text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Snapshot rows: price/name copied at purchase time.
create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  name text not null,
  image_url text,
  quantity integer not null check (quantity between 1 and 99),
  price numeric(10,2) not null check (price >= 0),
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null check (total >= 0),
  custom_note text,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  gateway text not null check (gateway in ('RAZORPAY', 'COD')),
  gateway_order_id text unique,
  gateway_payment_id text unique,
  gateway_signature text,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'INR',
  status public.payment_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  guest_name text,
  guest_phone text,
  rating integer not null check (rating between 1 and 5),
  title text,
  comment text,
  images text[],
  is_approved boolean not null default false,
  is_verified_purchase boolean not null default false,
  helpful_count integer not null default 0 check (helpful_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.serviceable_pincodes (
  id uuid primary key default uuid_generate_v4(),
  pincode text unique not null,
  city text not null,
  state text not null,
  cod_available boolean not null default true,
  cod_max_amount numeric(10,2) not null default 5000,
  estimated_days integer not null default 15,
  shipping_fee numeric(10,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.custom_design_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete set null,
  name text not null,
  contact text not null,
  email text,
  description text not null,
  reference_images text[],
  budget numeric(10,2),
  deadline timestamptz,
  status text not null default 'NEW'
    check (status in ('NEW','CONTACTED','QUOTED','IN_DISCUSSION','CONVERTED','COMPLETED','REJECTED')),
  admin_notes text,
  quoted_price numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.home_banners (
  id uuid primary key default uuid_generate_v4(),
  title text,
  subtitle text,
  image_url text not null,
  mobile_image_url text,
  link_url text,
  link_type text not null default 'PRODUCT'
    check (link_type in ('PRODUCT','CATEGORY','COLLECTION','EXTERNAL')),
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value text not null,
  description text,
  category text,
  updated_at timestamptz not null default now()
);

create table public.pincode_waitlist (
  id uuid primary key default uuid_generate_v4(),
  pincode text not null,
  email text,
  phone text,
  city text,
  state text,
  notified boolean not null default false,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (pincode, email)
);

create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_categories_parent on public.categories(parent_id);
create index idx_products_category on public.products(category_id, is_active);
create index idx_products_bestseller on public.products(is_bestseller, is_active);
create index idx_products_featured on public.products(is_featured, is_active);
create index idx_products_price_stock on public.products(base_price, stock) where is_active = true;
create index idx_products_search on public.products using gin(search_vector);
create index idx_product_images_product on public.product_images(product_id, display_order);
create index idx_product_variants_product on public.product_variants(product_id, is_active);
create index idx_collection_products_product on public.collection_products(product_id);
create index idx_addresses_user on public.addresses(user_id);
create index idx_wishlist_user on public.wishlist_items(user_id);
create index idx_cart_items_cart on public.cart_items(cart_id);
create index idx_cart_items_product on public.cart_items(product_id);
create index idx_cart_items_variant on public.cart_items(variant_id);
create index idx_orders_user on public.orders(user_id, created_at desc);
create index idx_orders_status on public.orders(status, created_at desc);
create index idx_orders_address on public.orders(address_id);
create index idx_order_items_order on public.order_items(order_id);
create index idx_order_items_product on public.order_items(product_id);
create index idx_payments_gateway_order on public.payments(gateway_order_id);
create index idx_reviews_product on public.reviews(product_id, is_approved);
create index idx_reviews_user on public.reviews(user_id);
create index idx_custom_design_status on public.custom_design_requests(status, created_at desc);
create index idx_pincode_waitlist_pincode on public.pincode_waitlist(pincode);
create index idx_audit_logs_entity on public.audit_logs(entity, entity_id);

-- ============================================================
-- TRIGGER HELPERS
-- ============================================================
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Rating denormalization: recompute from APPROVED reviews only.
create or replace function public.sync_product_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pid uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p set
    rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews r
                           where r.product_id = pid and r.is_approved), 0),
    rating_count = (select count(*) from public.reviews r
                    where r.product_id = pid and r.is_approved)
  where p.id = pid;
  return null;
end;
$$;

-- Race-free order number: sequence, no COUNT(*).
create or replace function public.generate_order_number()
returns trigger language plpgsql as $$
begin
  new.order_number := 'ART-' || to_char(now(), 'YYYY') || '-'
                      || lpad(nextval('public.order_number_seq')::text, 6, '0');
  return new;
end;
$$;

-- New auth user -> profile row. Role ALWAYS starts CUSTOMER;
-- signup metadata is ignored (privilege-escalation fix).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, phone)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'phone', ''), new.phone)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'users','categories','collections','products','product_variants',
    'addresses','carts','cart_items','orders','payments','reviews',
    'serviceable_pincodes','custom_design_requests','home_banners',
    'site_settings'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.update_updated_at_column()', t);
  end loop;
end;
$$;

create trigger sync_product_rating_insert
  after insert on public.reviews
  for each row execute function public.sync_product_rating();
create trigger sync_product_rating_update
  after update on public.reviews
  for each row execute function public.sync_product_rating();
create trigger sync_product_rating_delete
  after delete on public.reviews
  for each row execute function public.sync_product_rating();

create trigger set_order_number
  before insert on public.orders
  for each row execute function public.generate_order_number();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TRANSACTIONAL ORDER PLACEMENT (spec 2.3 step 1)
-- Single round-trip: validate stock -> reserve -> create order,
-- items (snapshot), payment stub, clear cart. Atomic; CHECK
-- (stock >= 0) makes overselling impossible.
--
-- SECURITY DEFINER + service_role-only EXECUTE: called from the
-- Next.js API layer, never directly from clients. Caller passes
-- the session-derived user id (or NULL for guest checkout);
-- address ownership is verified inside.
-- ============================================================
create or replace function public.place_order(
  p_user_id uuid,
  p_session_cart_id uuid,
  p_address jsonb,
  p_payment_method public.payment_method,
  p_shipping_fee numeric,
  p_cod_fee numeric,
  p_customer_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_address_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(10,2) := 0;
  v_max_lead int := 0;
  v_item record;
begin
  if p_payment_method = 'COD' and p_cod_fee < 0 then
    raise exception 'INVALID_COD_FEE';
  end if;

  -- Resolve + authorize address
  if p_user_id is not null and p_address ? 'addressId' then
    select id into v_address_id from public.addresses
    where id = (p_address->>'addressId')::uuid and user_id = p_user_id;
    if v_address_id is null then raise exception 'ADDRESS_NOT_OWNED'; end if;
  elsif p_address ? 'addressId' then
    raise exception 'ADDRESS_NOT_OWNED';
  else
    insert into public.addresses (user_id, full_name, phone, line1, line2, city, state, pincode, landmark)
    values (
      p_user_id,
      p_address->>'fullName', p_address->>'phone',
      p_address->>'line1', nullif(p_address->>'line2', ''),
      p_address->>'city', p_address->>'state', p_address->>'pincode',
      nullif(p_address->>'landmark', '')
    )
    returning id into v_address_id;
  end if;

  -- Lock cart rows for the duration of the transaction
  perform 1
  from public.cart_items ci
  join public.carts c on c.id = ci.cart_id
  where (p_user_id is not null and c.user_id = p_user_id)
     or (p_session_cart_id is not null and c.id = p_session_cart_id)
  for update of ci;

  create temp table _cart_snapshot on commit drop as
    select ci.product_id, ci.variant_id, ci.quantity, ci.custom_note
    from public.cart_items ci
    join public.carts c on c.id = ci.cart_id
    where (p_user_id is not null and c.user_id = p_user_id)
       or (p_session_cart_id is not null and c.id = p_session_cart_id);

  if not exists (select 1 from _cart_snapshot) then
    raise exception 'EMPTY_CART';
  end if;

  -- Validate active products + reserve stock atomically
  for v_item in
    select s.*,
           case when s.variant_id is not null then pv.stock else p.stock end as avail,
           case when s.variant_id is not null
                then coalesce(pv.discount_price, pv.price)
                else coalesce(p.discount_price, p.base_price) end as unit_price,
           coalesce(p.name, '') as pname,
           coalesce(p.is_active, false) as p_active,
          greatest(coalesce(p.lead_time_days, 12), coalesce(pv.lead_time_days, 0)) as lead_days
    from _cart_snapshot s
    left join public.products p on p.id = s.product_id
    left join public.product_variants pv on pv.id = s.variant_id
  loop
    if not v_item.p_active then raise exception 'PRODUCT_UNAVAILABLE:%', v_item.pname; end if;
    if v_item.avail is null or v_item.avail < v_item.quantity then
      raise exception 'INSUFFICIENT_STOCK:%', v_item.pname;
    end if;
    if s.variant_id is not null then
      update public.product_variants set stock = stock - v_item.quantity where id = s.variant_id;
    else
      update public.products set stock = stock - v_item.quantity where id = s.product_id;
    end if;
    v_subtotal := v_subtotal + v_item.unit_price * v_item.quantity;
    v_max_lead := greatest(v_max_lead, v_item.lead_days);
  end loop;

  insert into public.orders (
    user_id, address_id, email, status, payment_method,
    payment_status, subtotal, shipping_fee, cod_fee, total,
    estimated_completion_date, customer_note
  ) values (
    p_user_id, v_address_id,
    (select email from auth.users where id = p_user_id),
    case when p_payment_method = 'COD' then 'PLACED'::public.order_status
         else 'PAYMENT_PENDING'::public.order_status end,
    p_payment_method,
    case when p_payment_method = 'COD' then 'COD_PENDING'::public.payment_status
         else 'PENDING'::public.payment_status end,
    v_subtotal, p_shipping_fee, p_cod_fee,
    v_subtotal + p_shipping_fee + p_cod_fee,
    now() + make_interval(days => v_max_lead + 2),
    left(nullif(p_customer_note, ''), 500)
  )
  returning id, order_number into v_order_id, v_order_number;

  insert into public.order_items (order_id, product_id, variant_id, name, quantity, price, total, custom_note)
  select v_order_id, s.product_id, s.variant_id,
         p.name,
         s.quantity, pr.unit_price, pr.unit_price * s.quantity, s.custom_note
  from _cart_snapshot s
  join public.products p on p.id = s.product_id
  left join public.product_variants pv on pv.id = s.variant_id
  cross join lateral (
    select case when s.variant_id is not null
                then coalesce(pv.discount_price, pv.price)
                else coalesce(p.discount_price, p.base_price) end as unit_price
  ) pr;

  insert into public.payments (order_id, gateway, amount, currency, status)
  values (
    v_order_id,
    case when p_payment_method = 'COD' then 'COD' else 'RAZORPAY' end,
    v_subtotal + p_shipping_fee + p_cod_fee, 'INR',
    case when p_payment_method = 'COD' then 'COD_PENDING' else 'PENDING' end
  );

  delete from public.cart_items ci
  using public.carts c
  where ci.cart_id = c.id
    and ((p_user_id is not null and c.user_id = p_user_id)
      or (p_session_cart_id is not null and c.id = p_session_cart_id));

  return jsonb_build_object('orderId', v_order_id, 'orderNumber', v_order_number, 'subtotal', v_subtotal);
end;
$$;

revoke execute on function public.place_order(uuid, uuid, jsonb, public.payment_method, numeric, numeric, text) from public, anon, authenticated;
grant execute on function public.place_order(uuid, uuid, jsonb, public.payment_method, numeric, numeric, text) to service_role;

-- ============================================================
-- ROW LEVEL SECURITY — enabled on EVERY table (audit fix)
-- ============================================================
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.collection_products enable row level security;
alter table public.addresses enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.serviceable_pincodes enable row level security;
alter table public.custom_design_requests enable row level security;
alter table public.home_banners enable row level security;
alter table public.site_settings enable row level security;
alter table public.pincode_waitlist enable row level security;
alter table public.audit_logs enable row level security;

-- Helper: current user's role (reads own profile row; RLS-safe)
create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select u.role from public.users u where u.id = auth.uid();
$$;

revoke execute on function public.current_role() from public, anon;
grant execute on function public.current_role() to authenticated;

-- ---- Public catalog: read active only -----------------------
create policy "read_active_categories" on public.categories
  for select to anon, authenticated using (is_active = true);
create policy "read_all_collections" on public.collections
  for select to anon, authenticated using (is_active = true);
create policy "read_active_products" on public.products
  for select to anon, authenticated using (is_active = true);
create policy "read_product_images" on public.product_images
  for select to anon, authenticated using (
    exists (select 1 from public.products p where p.id = product_id and p.is_active)
  );
create policy "read_active_variants" on public.product_variants
  for select to anon, authenticated using (
    is_active and exists (
      select 1 from public.products p where p.id = product_id and p.is_active)
  );
create policy "read_collection_products" on public.collection_products
  for select to anon, authenticated using (
    exists (select 1 from public.collections c
            join public.products p on p.id = collection_products.product_id
            where c.id = collection_products.collection_id
              and c.is_active and p.is_active)
  );
create policy "read_active_pincodes" on public.serviceable_pincodes
  for select to anon, authenticated using (is_active = true);
create policy "read_settings" on public.site_settings
  for select to anon, authenticated using (true);
create policy "read_active_banners" on public.home_banners
  for select to anon, authenticated using (is_active = true);
create policy "read_approved_reviews" on public.reviews
  for select to anon, authenticated using (is_approved = true);

-- ---- Own-profile access; role/email NOT user-editable --------
create policy "select_own_profile" on public.users
  for select to authenticated using ((select auth.uid()) = id);
create policy "update_own_profile" on public.users
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
-- Column-level lock: even with the row policy above, users cannot
-- alter privilege-relevant fields.
revoke update on table public.users from authenticated;
grant update (name, phone) on table public.users to authenticated;

-- ---- Addresses / wishlist -----------------------------------
create policy "addresses_own" on public.addresses
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "wishlist_own" on public.wishlist_items
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---- Carts: owner-only (guest carts are server-mediated) -----
create policy "carts_own" on public.carts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "cart_items_own" on public.cart_items
  for all to authenticated
  using (exists (
    select 1 from public.carts c
    where c.id = cart_items.cart_id and (select auth.uid()) = c.user_id))
  with check (exists (
    select 1 from public.carts c
    where c.id = cart_items.cart_id and (select auth.uid()) = c.user_id));

-- ---- Orders: own rows; item inserts validated against parent --
create policy "orders_select_own" on public.orders
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "order_items_select_own" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o
            where o.id = order_items.order_id and (select auth.uid()) = o.user_id));
create policy "order_items_insert_own" on public.order_items
  for insert to authenticated with check (
    exists (select 1 from public.orders o
            where o.id = order_items.order_id and (select auth.uid()) = o.user_id));

-- ---- Payments: owner read-only (write via service role) ------
create policy "payments_select_own" on public.payments
  for select to authenticated using (
    exists (select 1 from public.orders o
            where o.id = payments.order_id and (select auth.uid()) = o.user_id));

-- ---- Reviews: anyone may submit, nothing auto-approves -------
create policy "reviews_insert_authed" on public.reviews
  for insert to authenticated with check ((select auth.uid()) = user_id and is_approved = false);

-- ---- Waitlist / design requests: submit-only -----------------
create policy "waitlist_insert_public" on public.pincode_waitlist
  for insert to anon, authenticated with check (true);
create policy "design_requests_insert_public" on public.custom_design_requests
  for insert to anon, authenticated with check (true);

-- ---- Audit logs: no client access at all (service role only) -
-- No policies => zero access for anon/authenticated.

-- ============================================================
-- COLUMN GRANTS cleanup: block direct writes to protected cols
-- ============================================================
revoke update on table public.reviews from authenticated;
revoke insert on table public.payments, public.orders from authenticated;
