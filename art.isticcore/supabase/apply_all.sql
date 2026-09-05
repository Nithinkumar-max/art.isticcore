
create extension if not exists "uuid-ossp";

create type public.order_status as enum (
  'confirmed', 'preparing', 'ready_for_dispatch', 'handed_over', 'cancelled', 'refunded'
);
create type public.payment_method as enum ('RAZORPAY', 'COD');
create type public.payment_status as enum (
  'PENDING', 'PAID', 'FAILED', 'REFUNDED',
  'PARTIALLY_REFUNDED', 'COD_PENDING', 'COD_COLLECTED'
);

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

-- user_sessions is DEPRECATED / UNUSED — custom session tokens removed.
-- Supabase's built-in cookie auth handles sessions now. Kept for reference;
-- safe to drop: DROP TABLE public.user_sessions;
create table public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_token text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index user_sessions_user_id_idx on public.user_sessions(user_id);
create index user_sessions_expires_at_idx on public.user_sessions(expires_at);

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

create sequence public.order_number_seq start 1000;

create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text not null unique,
  user_id uuid references public.users(id) on delete set null,
  address_id uuid references public.addresses(id) on delete set null,
  email text,
  status public.order_status not null default 'confirmed',
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
  updated_at timestamptz not null default now(),
  status_history jsonb default '[]'::jsonb
);

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

create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Status change audit trigger: logs every status transition as a JSONB entry in status_history
create or replace function public.log_order_status_change()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'UPDATE' and OLD.status IS DISTINCT FROM NEW.status then
    NEW.status_history := COALESCE(OLD.status_history, '[]'::jsonb) || jsonb_build_object(
      'previous_status', OLD.status,
      'new_status', NEW.status,
      'changed_at', now(),
      'changed_by', current_user
    );
  end if;
  return NEW;
end;
$$;

-- Apply the status change trigger on every orders update (BEFORE to mutate NEW.status_history)
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'order_status_change_audit') then
    create trigger order_status_change_audit
      before update on public.orders
      for each row when (old.status is distinct from new.status)
      execute function public.log_order_status_change();
  end if;
end;
$$;

-- Strict State Machine enforcement — DB-level guard
create or replace function public.enforce_order_status_transition()
returns trigger language plpgsql as $$
declare allowed text[];
begin
  if old.status is distinct from new.status then
    case old.status::text
      when 'confirmed' then allowed := array['preparing','cancelled'];
      when 'preparing' then allowed := array['ready_for_dispatch','cancelled'];
      when 'ready_for_dispatch' then allowed := array['handed_over','cancelled'];
      when 'handed_over' then allowed := array[]::text[];
      when 'cancelled' then allowed := array[]::text[];
      when 'refunded' then allowed := array[]::text[];
      else allowed := array[]::text[];
    end case;
    if not (new.status::text = any(allowed)) then
      raise exception 'Invalid order status transition % -> % . Allowed: %', old.status, new.status, array_to_string(allowed, ', ');
    end if;
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'enforce_order_status_transition') then
    create trigger enforce_order_status_transition
      before update on public.orders
      for each row when (old.status is distinct from new.status)
      execute function public.enforce_order_status_transition();
  end if;
end;
$$;

-- Enable Realtime for orders (required for INSERT/UPDATE event bus)
do $$
begin
  begin
    alter publication supabase_realtime add table public.orders;
  exception when duplicate_object then null;
  end;
end;
$$;

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

create or replace function public.generate_order_number()
returns trigger language plpgsql as $$
begin
  new.order_number := 'ART-' || to_char(now(), 'YYYY') || '-'
                      || lpad(nextval('public.order_number_seq')::text, 6, '0');
  return new;
end;
$$;

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
case when p_payment_method = 'COD' then 'confirmed'::public.order_status
         else 'confirmed'::public.order_status end,
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

create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select u.role from public.users u where u.id = auth.uid();
$$;

revoke execute on function public.current_role() from public, anon;
grant execute on function public.current_role() to authenticated;

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

create policy "select_own_profile" on public.users
  for select to authenticated using ((select auth.uid()) = id);
create policy "update_own_profile" on public.users
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
revoke update on table public.users from authenticated;
grant update (name, phone) on table public.users to authenticated;

create policy "addresses_own" on public.addresses
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "wishlist_own" on public.wishlist_items
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

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

create policy "payments_select_own" on public.payments
  for select to authenticated using (
    exists (select 1 from public.orders o
            where o.id = payments.order_id and (select auth.uid()) = o.user_id));

create policy "reviews_insert_authed" on public.reviews
  for insert to authenticated with check ((select auth.uid()) = user_id and is_approved = false);

create policy "waitlist_insert_public" on public.pincode_waitlist
  for insert to anon, authenticated with check (true);
create policy "design_requests_insert_public" on public.custom_design_requests
  for insert to anon, authenticated with check (true);

revoke update on table public.reviews from authenticated;
revoke insert on table public.payments, public.orders from authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880,
   array['image/webp','image/jpeg','image/png']),
  ('user-avatars', 'user-avatars', true, 5242880,
   array['image/webp','image/jpeg','image/png']),
  ('order-invoices', 'order-invoices', false, 10485760,
   array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select u.role from public.users u where u.id = auth.uid())
    in ('ADMIN','SUPER_ADMIN'), false);
$$;

revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

create policy "product_images_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');

create policy "product_images_admin_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_staff());
create policy "product_images_admin_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_staff())
  with check (bucket_id = 'product-images' and public.is_staff());
create policy "product_images_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_staff());

create policy "avatars_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'user-avatars');

create policy "avatars_own_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars_own_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars_own_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "invoices_admin_all"
  on storage.objects for all to authenticated
  using (bucket_id = 'order-invoices' and public.is_staff())
  with check (bucket_id = 'order-invoices' and public.is_staff());

create policy "invoices_owner_read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'order-invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create table if not exists public.media (
  id            uuid primary key default gen_random_uuid(),
  slot          text unique,
  bucket        text not null default 'product-images'
                check (bucket in ('product-images', 'user-avatars', 'order-invoices')),
  storage_path  text not null,
  url           text not null,
  alt_text      text,
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_by    uuid references public.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_media_slot on public.media (slot) where is_active;
create index if not exists idx_media_active on public.media (is_active, sort_order);

alter table public.media enable row level security;

create policy "media_select_active"
  on public.media for select
  using (is_active);

create policy "media_admin_insert"
  on public.media for insert
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('ADMIN', 'SUPER_ADMIN')
    )
  );

create policy "media_admin_update"
  on public.media for update
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('ADMIN', 'SUPER_ADMIN')
    )
  );

create policy "media_admin_delete"
  on public.media for delete
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('ADMIN', 'SUPER_ADMIN')
    )
  );

grant select on public.media to anon, authenticated;
grant insert, update, delete on public.media to authenticated;

revoke insert, update, delete on public.media from anon;

insert into public.media (slot, bucket, storage_path, url, alt_text, sort_order)
values
  ('hero-desktop',
   'product-images',
   'banners/hero-desktop-seed',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuA1pCzejkLhM39B8ZKwP7w_OxCeI6EK1d_632NN2VsBK-BcBd-rLk3LT-PtDOmtxiZ6re2yzgOxiKzTKffGc0-T6UJPc42rR5qL8YJXO0_am5ZJXLcfIzT-oqmRBsoVceuZSGud9EmBg3G-muppQj3n-H7-lVeEtiBO-GIrNkHopQFzZqfb2cd8hn9ya590NkI_G7ZLvb7xkN2eZQTlg1pNYouL9IO6OGAxGB0Z5HyFbqK9iMvXHt45QA',
   'Handcrafted slow-fashion crochet collection',
   0),
  ('hero-mobile',
   'product-images',
   'banners/hero-mobile-seed',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuCCzjnkXgIWuLfWYFdSfMSPa0JWOwN2CydFETlgmvNhvrK8Uftp9zDtj3XhE26FEw9t2i218mcKWkwDD3oc9O_3fCo4UypPFSuTxFbsgaVi23VIWJJVvKb1KQ7GwqUOpqTFqAN_2ChhgP8CQPQUmQWnfYcq2-t9K945JWiPO8eqpA28Kmk6VDzOadGSj82Q6V6TNmjJVUNPo6NU9rDh2aPPZeN3cywT4M9fZq1dYBv3uXoxT3bRtzZGHA',
   'Handcrafted crochet bouquet collection',
   1)
on conflict (slot) do update
set url       = excluded.url,
    alt_text  = excluded.alt_text,
    is_active = true,
    updated_at = now();

create extension if not exists pg_cron;

create schema if not exists private;

create table if not exists private.keepalive_log (
  id         bigint generated always as identity primary key,
  ran_at     timestamptz not null default now()
);

create or replace function public.db_keepalive()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.keepalive_log default values;

  perform count(*) from public.products;
  perform count(*) from public.orders;

  delete from private.keepalive_log where ran_at < now() - interval '7 days';
end;
$$;

revoke all on function public.db_keepalive() from anon, authenticated;

select cron.unschedule('artisticcore-keepalive-1')
where exists (select 1 from cron.job where jobname = 'artisticcore-keepalive-1');
select cron.unschedule('artisticcore-keepalive-2')
where exists (select 1 from cron.job where jobname = 'artisticcore-keepalive-2');
select cron.unschedule('artisticcore-keepalive-3')
where exists (select 1 from cron.job where jobname = 'artisticcore-keepalive-3');

select cron.schedule('artisticcore-keepalive-1', '20 0 * * *', $$select public.db_keepalive();$$);
select cron.schedule('artisticcore-keepalive-2', '20 8 * * *', $$select public.db_keepalive();$$);
select cron.schedule('artisticcore-keepalive-3', '20 16 * * *', $$select public.db_keepalive();$$);

insert into public.categories (name, slug, description, section, display_order) values
  ('Floral Collections', 'floral-collections', 'Everlasting hand-crocheted bouquets and stems', 'trending', 1),
  ('Bags & Totes',       'bags-totes',         'Handcrafted crochet bags for every day',     'shop_by_category', 2),
  ('Apparel',            'apparel',            'Wearable crochet: sweaters, tops, layers',   'shop_by_category', 3),
  ('Blankets',           'blankets',           'Chunky throws and heirloom blankets',        'shop_by_category', 4),
  ('Amigurumi & Charms', 'amigurumi-charms',   'Tiny friends and pocket charms',             'shop_by_category', 5),
  ('Home Décor',         'home-decor',         'Beautiful crochet pieces for your home',     'shop_by_category', 6)
on conflict (slug) do nothing;

insert into public.categories (name, slug, parent_id, description, display_order)
values ('Summer Tops', 'summer-tops',
        (select id from public.categories where slug = 'apparel'),
        'Airy openwork tops for warm days', 1)
on conflict (slug) do nothing;

insert into public.collections (name, slug, description, display_order) values
  ('Chunky Blankets',  'chunky-blankets',  'Plush, oversized textures for slow evenings',      1),
  ('Summer Tops',      'summer-tops',      'Breezy openwork pieces for sunlit days',           2),
  ('Eternal Bouquets', 'eternal-bouquets', 'Hand-shaped florals that never need water',        3),
  ('Everyday Totes',   'everyday-totes',   'Carry-a-little-sunshine market and city bags',     4),
  ('Pocket Charms',    'pocket-charms',    'Small joys to clip on bags and keys',              5),
  ('Cozy Home',        'cozy-home',        'Basket-and-blanket comfort for every corner',      6)
on conflict (slug) do nothing;

insert into public.products (
  name, slug, description, short_description,
  base_price, discount_price, stock, sku,
  is_bestseller, is_featured, lead_time_days, category_id
) values
(
  'Giant Sunflower Bouquet',
  'giant-sunflower-bouquet',
  'Bring a touch of eternal sunshine into your space with our giant hand-crocheted sunflower bouquet. Each petal is shaped by hand using premium, eco-friendly cotton yarn.',
  'A bright, everlasting bouquet made slowly by hand.',
  2400, 1800, 12, 'ART-SUN-BQ',
  true, true, 7,
  (select id from public.categories where slug = 'floral-collections')
),
(
  'Classic Sunflower Tote',
  'classic-sunflower-tote',
  'A practical, joyful tote with a hand-crocheted sunflower motif and sturdy cotton handles.',
  'Everyday carry, with a little bit of sunshine.',
  2100, null, 8, 'ART-TOTE-01',
  true, false, 10,
  (select id from public.categories where slug = 'bags-totes')
),
(
  'Oatmeal Dream Sweater',
  'oatmeal-dream-sweater',
  'A soft, oversized knit-inspired sweater with a relaxed silhouette and tactile stitchwork.',
  'The softest layer for slow mornings.',
  3499, null, 6, 'ART-SWR-OAT',
  false, true, 14,
  (select id from public.categories where slug = 'apparel')
),
(
  'Berry Bliss Chunky Throw',
  'berry-bliss-chunky-throw',
  'A plush, berry-toned throw designed to turn a quiet corner into a warm retreat.',
  'Plush texture for your coziest corner.',
  5600, 4999, 4, 'ART-THR-BRY',
  true, false, 15,
  (select id from public.categories where slug = 'blankets')
)
on conflict (slug) do nothing;

insert into public.product_variants (product_id, name, sku, price, discount_price, stock, lead_time_days, attributes)
select p.id, v.name, v.sku, v.price, v.discount_price, v.stock, v.lead_days, v.attrs::jsonb
from public.products p
join (values
  ('Standard (1 Stem)',  'ART-SUN-BQ-S1',  900::numeric,  null::numeric,      6, 5,  '{"stems":1}'),
  ('Medium (3 Stems)',   'ART-SUN-BQ-S3', 2400::numeric, 1800::numeric,      4, 7,  '{"stems":3}'),
  ('Large (5 Stems)',    'ART-SUN-BQ-S5', 2800::numeric, null::numeric,      2, 10, '{"stems":5}')
) as v(name, sku, price, discount_price, stock, lead_days, attrs) on true
where p.slug = 'giant-sunflower-bouquet'
on conflict (sku) do nothing;

insert into public.product_images (product_id, url, alt_text, display_order, is_primary)
select p.id, i.url, i.alt, i.ord, i.is_primary
from public.products p
join (values
  ('https://lh3.googleusercontent.com/aida-public/AB6AXuCtqqKJzzHLLSucGga2xH_VLLsbWhWkfqDQYC5GIk7H5oRMCepi6RYLXkuoMy_53O9tGjwEVjYQDAOWbaVAk-yUHAp9yprzm7OLWhxWvaSp8mUc-xJOE8YVI2SvKLSH_7bfa3_0y5nAlEKntsIX4zzNDDNuMNMaea6UvqyxEE2FcDPMRNrO93CY0rII9z5ZkZE-rC1ANbRfGdZ10gE37IT5rkEbYpxL7LGSxPlHDUGqcPg1TYDCvwlmsg', 'Giant sunflower crochet bouquet',              1, true ),
  ('https://lh3.googleusercontent.com/aida-public/AB6AXuCMRZYmcH2CE0Vm0nr3klZnLRh_p-C_no1I0RKab41XI0qeAbFoZ-U5bIVq-bqd6FBX2Ls-jUZha0MtLVMzmYW_PYf_GKZP9h0wK6HkzgbqMhxozeyIRdxuhHF86pSnmg-G1SOlOgVk6EMxoJWadFRONzLAT4onVcl2gksz53kvXAz5M9BQ7-KXoyecUpXd7zpD1geT4_yo106B0rn0CQjVNnax920n-7wTe6_-phWiXaMOEhz_9rZQlg', 'Sunflower bouquet side angle',                 2, false),
  ('https://lh3.googleusercontent.com/aida-public/AB6AXuCTjGcD2j5ZzeVBxrBz7qi86N7A7FBoyi2GyLcSjXcWrCFiM83VM6obTHxQSGFeuRqQfkfIVmW4x0zzVLVIkrcZHNztMWZB3P7qp5OC0ejuNeTKyGQ8XMufMCOOkXoxyNTxD-u6o3ZNhuwLLodC0-eTR9490J9E0yNgqiTuKVR7gbN-LW3eM0AWTQbRberAU2U0l6IV6DfZ-3H3j_lQwSpHMLWWvn9ooAiLYzGYTYbFHN64-cVWpos7zg', 'Crochet sunflower petal detail',               3, false),
  ('https://lh3.googleusercontent.com/aida-public/AB6AXuANcW1irqxWqJYR-5RL1uQ9EVb_Lz285PTn6MqKn05h2pd9VhsCllwwOSSqevnJqpQ7vZVwtFNC4Qn1ffhGFbPt5BotpWjiTFLNs46dApZv0FzW-hKMPBo3vWotgVts3UU-2oXsMUDgwHaH4oJcLmoF44Nh-geMnrw2L4J7GGWPeidJcOXHAfdv84msr5NhQl87EYf6K62ixSj48duMiLl1phZk5VeW1HeBaQV3ZeqRHRbIZ2FJ4u89pg', 'Sunflower bouquet close-up',                   4, false)
) as i(url, alt, ord, is_primary) on true
where p.slug = 'giant-sunflower-bouquet';

insert into public.product_images (product_id, url, alt_text, display_order, is_primary)
select p.id, i.url, i.alt, i.ord, i.is_primary
from public.products p
join (values
  ('https://lh3.googleusercontent.com/aida-public/AB6AXuCSBRu3HM_MzghSREwzpiRpwUiupbg3NxHjlLJXXPvFhF4B2jGBm-9ER7ByTWffSEl6drOkaO9yWKP0r0NyyhAY8E-3V9KEeLtRUq0ZQUYYfJ1gcl0r5-J5qViFnVzIJEvTq2pvwxIG6xcrwTpv4jQ_Fcsf5F_mz7yyaGvIG3bvYP_jOL9LAmFgk5UsSjbNh7cOcPfxZwCNzCoIEfiyK_0MKr8ml6CmjpVfd_eLluB0nz4T8J7P2-GG3Q', 'Classic sunflower tote bag', 1, true)
) as i(url, alt, ord, is_primary) on true
where p.slug = 'classic-sunflower-tote';

insert into public.product_images (product_id, url, alt_text, display_order, is_primary)
select p.id, i.url, i.alt, i.ord, i.is_primary
from public.products p
join (values
  ('https://lh3.googleusercontent.com/aida-public/AB6AXuAr9YsqPsamrihCG2Xr4MkAfoeNe2E3d-hzxsXOH7LNil1rZYHPFttVQJcpoz9XOBBM61OSDEodQua9skxhJ9FNDA_ZeOvXWY6FHfotdi1aHi12W4RD1UbjADQO5vBdrD4wGhHOnM-6M7CjfHeOpP5nspQGo7gXpczV7UFBrgZJ1nl31UmMWwI5tZK57tVSxlQsQzK-76o5xe3PCIKeeoU7KNY8InzUDaCDbAsAApKWm5k_CnaRCADkWw', 'Oatmeal crochet sweater', 1, true),
  ('https://lh3.googleusercontent.com/aida-public/AB6AXuAr9YsqPsamrihCG2Xr4MkAfoeNe2E3d-hzxsXOH7LNil1rZYHPFttVQJcpoz9XOBBM61OSDEodQua9skxhJ9FNDA_ZeOvXWY6FHfotdi1aHi12W4RD1UbjADQO5vBdrD4wGhHOnM-6M7CjfHeOpP5nspQGo7gXpczV7UFBrgZJ1nl31UmMWwI5tZK57tVSxlQsQzK-76o5xe3PCIKeeoU7KNY8InzUDaCDbAsAApKWm5k_CnaRCADkWw', 'Stitch texture close-up', 2, false)
) as i(url, alt, ord, is_primary) on true
where p.slug = 'oatmeal-dream-sweater';

insert into public.product_images (product_id, url, alt_text, display_order, is_primary)
select p.id, i.url, i.alt, i.ord, i.is_primary
from public.products p
join (values
  ('https://lh3.googleusercontent.com/aida-public/AB6AXuBkhb-B_Bf4RaymTmV_tfP9OY0Nl-tlTrmXkgvh7GLTyl3v73KZkMvT_0siXrAhKSUlShuzUPWNhPCX6Q9NsgEzYru-7poIuhVtcL9tWZJ4qdfApoh4meKdkMiGRXfJg8Xq4P8MZuHVrQXS-rUStutm-DuYuwgQrs2W4JmYGCBn_jAGUA1Id0gQ1hbYgCRcBwqqUGybH87RxXUIntc5pN_L6TQwm-BvMJnthSronS_9IFcPuj83oMY-2Q', 'Berry chunky crochet throw', 1, true)
) as i(url, alt, ord, is_primary) on true
where p.slug = 'berry-bliss-chunky-throw';

insert into public.collection_products (collection_id, product_id, display_order)
select c.id, p.id, m.ord
from (values
  ('chunky-blankets',  'berry-bliss-chunky-throw',   1),
  ('eternal-bouquets', 'giant-sunflower-bouquet',    1),
  ('everyday-totes',   'classic-sunflower-tote',     1),
  ('cozy-home',        'berry-bliss-chunky-throw',   2)
) as m(collection_slug, product_slug, ord)
join public.collections c on c.slug = m.collection_slug
join public.products  p on p.slug = m.product_slug
on conflict do nothing;

insert into public.serviceable_pincodes (pincode, city, state, cod_available, estimated_days, shipping_fee) values
  ('141001', 'Ludhiana',  'Punjab',      true,  6, 0),
  ('110001', 'New Delhi', 'Delhi',       true, 10, 0),
  ('110002', 'New Delhi', 'Delhi',       true, 10, 0),
  ('400001', 'Mumbai',    'Maharashtra', true, 12, 0),
  ('400002', 'Mumbai',    'Maharashtra', true, 12, 0),
  ('560001', 'Bangalore', 'Karnataka',   true, 12, 0),
  ('600001', 'Chennai',   'Tamil Nadu',  true, 14, 99),
  ('700001', 'Kolkata',   'West Bengal', true, 14, 99),
  ('500001', 'Hyderabad', 'Telangana',   true, 13, 0),
  ('411001', 'Pune',      'Maharashtra', true, 12, 0)
on conflict (pincode) do nothing;

insert into public.site_settings (key, value, description, category) values
  ('store_name',              'Art.isticcore',                    'Store display name',                 'general'),
  ('store_tagline',           'Handcrafted with love',           'Store tagline',                      'general'),
  ('contact_phone',           '+91 9876543210',                  'Contact phone number',               'general'),
  ('contact_email',           'hello@artisticcore.in',           'Contact email',                      'general'),
  ('instagram_handle',        '@artisticcore.studio',            'Instagram username',                 'general'),
  ('whatsapp_number',         '919876543210',                    'WhatsApp number for orders',         'general'),
  ('default_lead_time_days',  '12',                              'Default production days',            'shipping'),
  ('cod_max_limit',           '5000',                            'COD max order value in INR',         'payment'),
  ('cod_fee',                 '50',                              'COD fee in INR',                     'payment'),
  ('free_shipping_threshold', '2000',                            'Free shipping above this INR value', 'shipping'),
  ('flat_shipping_fee',       '99',                              'Flat shipping fee in INR',           'shipping'),
  ('razorpay_enabled',        'true',                            'Enable Razorpay payments',           'payment'),
  ('cod_enabled',             'true',                            'Enable Cash on Delivery',            'payment'),
  ('meta_title',              'Art.isticcore — Handcrafted Crochet', 'Default SEO title',               'seo'),
  ('meta_description',        'Beautiful handmade crochet products made to order. Each piece crafted with love, delivered across India.', 'Default SEO description', 'seo')
on conflict (key) do nothing;
