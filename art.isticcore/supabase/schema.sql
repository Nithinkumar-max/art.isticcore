-- ============================================================
-- KNOTELLA🎀 CROCHET STORE — COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    section TEXT DEFAULT 'shop_by_category' 
        CHECK (section IN ('trending', 'shop_by_category', 'weekly', 'bestsellers')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    short_description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    discount_price DECIMAL(10,2),
    is_orderable BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_bestseller BOOLEAN DEFAULT FALSE,
    lead_time_days INTEGER DEFAULT 12,
    category_id UUID REFERENCES public.categories(id),
    seo_title TEXT,
    seo_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCT IMAGES
-- ============================================================
CREATE TABLE public.product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text TEXT,
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCT VARIANTS
-- ============================================================
CREATE TABLE public.product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    discount_price DECIMAL(10,2),
    attributes JSONB,
    lead_time_days INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT,
    name TEXT,
    email TEXT,
    role TEXT DEFAULT 'CUSTOMER' 
        CHECK (role IN ('CUSTOMER', 'ADMIN', 'SUPER_ADMIN')),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER SESSIONS (single active session per account)
-- ============================================================
CREATE TABLE public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX user_sessions_user_id_idx ON public.user_sessions(user_id);
CREATE INDEX user_sessions_expires_at_idx ON public.user_sessions(expires_at);

-- ============================================================
-- ADDRESSES
-- ============================================================
CREATE TABLE public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    line1 TEXT NOT NULL,
    line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    landmark TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CARTS
-- ============================================================
CREATE TABLE public.carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    session_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CART ITEMS
-- ============================================================
CREATE TABLE public.cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID REFERENCES public.carts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    variant_id UUID REFERENCES public.product_variants(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    custom_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cart_id, product_id, variant_id)
);

-- ============================================================
-- ORDER STATE MACHINE
-- ============================================================
-- Business logic pipeline: pending -> confirmed -> processing -> ready_to_ship -> shipped -> out_for_delivery -> delivered -> cancelled/refunded
CREATE TYPE order_status AS ENUM (
    'confirmed', 'preparing', 'ready_for_dispatch', 'handed_over', 'cancelled', 'refunded'
);

CREATE TYPE payment_method AS ENUM ('ONLINE', 'COD', 'UPI', 'RAZORPAY');

CREATE TYPE payment_status AS ENUM (
    'PENDING', 'PAID', 'FAILED', 'REFUNDED', 
    'PARTIALLY_REFUNDED', 'COD_PENDING', 'COD_COLLECTED'
);

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE,
    user_id UUID REFERENCES public.users(id),
    address_id UUID REFERENCES public.addresses(id),
    status order_status DEFAULT 'confirmed',
    payment_method payment_method NOT NULL,
    payment_status payment_status DEFAULT 'PENDING',
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    shipping_fee DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    estimated_completion_date TIMESTAMPTZ,
    tracking_number TEXT,
    tracking_url TEXT,
    courier_name TEXT,
    shipped_date TIMESTAMPTZ,
    delivered_date TIMESTAMPTZ,
    cod_collected BOOLEAN DEFAULT FALSE,
    customer_note TEXT,
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status_history JSONB DEFAULT '[]'::jsonb
);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    variant_id UUID REFERENCES public.product_variants(id),
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    custom_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID UNIQUE REFERENCES public.orders(id),
    gateway TEXT NOT NULL CHECK (gateway IN ('RAZORPAY', 'CASHFREE', 'COD')),
    gateway_order_id TEXT,
    gateway_payment_id TEXT,
    gateway_signature TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status payment_status DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    guest_name TEXT,
    guest_phone TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT,
    images TEXT[],
    is_approved BOOLEAN DEFAULT FALSE,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SERVICEABLE PINCODES
-- ============================================================
CREATE TABLE public.serviceable_pincodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pincode TEXT UNIQUE NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    cod_available BOOLEAN DEFAULT TRUE,
    cod_max_amount DECIMAL(10,2) DEFAULT 1000,
    estimated_days INTEGER DEFAULT 15,
    shipping_fee DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOM DESIGN REQUESTS
-- ============================================================
CREATE TABLE public.custom_design_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    email TEXT,
    description TEXT NOT NULL,
    reference_images TEXT[],
    budget DECIMAL(10,2),
    deadline TIMESTAMPTZ,
    status TEXT DEFAULT 'NEW' 
        CHECK (status IN ('NEW', 'CONTACTED', 'QUOTED', 'IN_DISCUSSION', 'CONVERTED', 'COMPLETED', 'REJECTED')),
    admin_notes TEXT,
    quoted_price DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HOME BANNERS
-- ============================================================
CREATE TABLE public.home_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    mobile_image_url TEXT,
    link_url TEXT,
    link_type TEXT DEFAULT 'PRODUCT' 
        CHECK (link_type IN ('PRODUCT', 'CATEGORY', 'COLLECTION', 'EXTERNAL')),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SITE SETTINGS
-- ============================================================
CREATE TABLE public.site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    category TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.site_settings (key, value, description, category) VALUES
('store_name', 'Knotella🎀', 'Store display name', 'general'),
('store_tagline', 'Handcrafted with love', 'Store tagline', 'general'),
('contact_phone', '+91 9876543210', 'Contact phone number', 'general'),
('contact_email', 'hello@knotella.in', 'Contact email', 'general'),
('instagram_handle', '@knotella.studio', 'Instagram username', 'general'),
('whatsapp_number', '919876543210', 'WhatsApp number for orders', 'general'),
('default_lead_time_days', '12', 'Default production days', 'shipping'),
('cod_max_limit', '1000', 'COD max order value in INR', 'payment'),
('cod_fee', '0', 'COD fee in INR', 'payment'),
('free_shipping_threshold', '2000', 'Free shipping above this INR value', 'shipping'),
('flat_shipping_fee', '99', 'Flat shipping fee in INR', 'shipping'),
('razorpay_enabled', 'true', 'Enable Razorpay payments', 'payment'),
('cod_enabled', 'true', 'Enable Cash on Delivery', 'payment'),
('meta_title', 'Knotella🎀 — Handcrafted Crochet', 'Default SEO title', 'seo'),
('meta_description', 'Beautiful handmade crochet products made to order. Each piece crafted with love, delivered across India.', 'Default SEO description', 'seo');

-- ============================================================
-- PINCODE WAITLIST
-- ============================================================
CREATE TABLE public.pincode_waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pincode TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    city TEXT,
    state TEXT,
    notified BOOLEAN DEFAULT FALSE,
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pincode, email)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_products_category ON public.products(category_id, is_active);
CREATE INDEX idx_products_bestseller ON public.products(is_bestseller, is_active);
CREATE INDEX idx_products_featured ON public.products(is_featured, is_active);
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_categories_slug ON public.categories(slug);
CREATE INDEX idx_categories_section ON public.categories(section, display_order);
CREATE INDEX idx_orders_user ON public.orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status ON public.orders(status, created_at DESC);
CREATE INDEX idx_orders_number ON public.orders(order_number);
CREATE INDEX idx_cart_items_cart ON public.cart_items(cart_id);
CREATE INDEX idx_addresses_user ON public.addresses(user_id);
CREATE INDEX idx_product_images_product ON public.product_images(product_id, display_order);
CREATE INDEX idx_product_variants_product ON public.product_variants(product_id, is_active);
CREATE INDEX idx_reviews_product ON public.reviews(product_id, is_approved);
CREATE INDEX idx_pincodes_pincode ON public.serviceable_pincodes(pincode);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Status change audit trigger: logs every status transition as a JSONB entry in status_history
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if the status actually changed
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        NEW.status_history := COALESCE(OLD.status_history, '[]'::jsonb) || jsonb_build_object(
            'previous_status', OLD.status,
            'new_status', NEW.status,
            'changed_at', NOW(),
            'changed_by', current_user
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_status_change_audit
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.log_order_status_change();

-- Strict State Machine enforcement at DB layer — prevents invalid jumps (e.g. pending -> delivered)
CREATE OR REPLACE FUNCTION public.enforce_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  allowed TEXT[];
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE OLD.status::TEXT
      WHEN 'confirmed'          THEN allowed := ARRAY['preparing','cancelled','refunded'];
      WHEN 'preparing'          THEN allowed := ARRAY['ready_for_dispatch','cancelled','refunded'];
      WHEN 'ready_for_dispatch' THEN allowed := ARRAY['handed_over','cancelled','refunded'];
      WHEN 'handed_over'        THEN allowed := ARRAY['refunded'];
      WHEN 'cancelled'          THEN allowed := ARRAY[]::TEXT[];
      WHEN 'refunded'           THEN allowed := ARRAY[]::TEXT[];
      ELSE allowed := ARRAY[]::TEXT[];
    END CASE;
    IF NOT (NEW.status::TEXT = ANY(allowed)) THEN
      RAISE EXCEPTION 'Invalid order status transition % -> % . Allowed: %', OLD.status, NEW.status, array_to_string(allowed, ', ');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_order_status_transition
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.enforce_order_status_transition();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ORDER NUMBER AUTO-GENERATION
-- ============================================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    yr TEXT;
    seq INTEGER;
BEGIN
    yr := TO_CHAR(NOW(), 'YYYY');
    SELECT COUNT(*) + 1 INTO seq 
    FROM public.orders 
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    NEW.order_number := 'SHL-' || yr || '-' || LPAD(seq::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number 
    BEFORE INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- ============================================================
-- NEW USER HANDLER (auto-insert into public.users on signup)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, phone, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
        COALESCE(NEW.raw_user_meta_data->>'role', 'CUSTOMER')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Public read tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serviceable_pincodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_active_categories" ON public.categories FOR SELECT USING (is_active = TRUE);
CREATE POLICY "public_read_active_products" ON public.products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "public_read_product_images" ON public.product_images FOR SELECT USING (TRUE);
CREATE POLICY "public_read_active_variants" ON public.product_variants FOR SELECT USING (is_active = TRUE);
CREATE POLICY "public_read_active_pincodes" ON public.serviceable_pincodes FOR SELECT USING (is_active = TRUE);
CREATE POLICY "public_read_settings" ON public.site_settings FOR SELECT USING (TRUE);
CREATE POLICY "public_read_active_banners" ON public.home_banners FOR SELECT USING (is_active = TRUE);
CREATE POLICY "public_read_approved_reviews" ON public.reviews FOR SELECT USING (is_approved = TRUE);

-- User-scoped tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "addresses_own" ON public.addresses FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "carts_own" ON public.carts 
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "cart_items_own" ON public.cart_items
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND (c.user_id = auth.uid() OR c.user_id IS NULL))
    );

CREATE POLICY "orders_own" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_insert_own" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "order_items_own" ON public.order_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
    );

CREATE POLICY "reviews_create" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_own_update" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);

-- Admin full access (service role bypasses RLS automatically)
-- Admin writes use service role key server-side — no additional policies needed

-- ============================================================
-- SEED DATA — Sample categories
-- ============================================================
INSERT INTO public.categories (name, slug, description, section, display_order, is_active) VALUES
('Amigurumi', 'amigurumi', 'Adorable crocheted stuffed animals and characters', 'trending', 1, TRUE),
('Bags & Totes', 'bags-totes', 'Handcrafted crochet bags and tote bags', 'shop_by_category', 2, TRUE),
('Home Décor', 'home-decor', 'Beautiful crochet pieces for your home', 'shop_by_category', 3, TRUE),
('Baby Items', 'baby-items', 'Soft and safe crochet items for babies', 'shop_by_category', 4, TRUE),
('Accessories', 'accessories', 'Crochet scarves, headbands, and more', 'shop_by_category', 5, TRUE),
('Weekly Special', 'weekly-special', 'Limited time special items', 'weekly', 6, TRUE);

-- ============================================================
-- SEED DATA — Sample serviceable pincodes (Delhi, Mumbai, Bangalore)
-- ============================================================
INSERT INTO public.serviceable_pincodes (pincode, city, state, cod_available, estimated_days, shipping_fee) VALUES
('110001', 'New Delhi', 'Delhi', TRUE, 10, 0),
('110002', 'New Delhi', 'Delhi', TRUE, 10, 0),
('400001', 'Mumbai', 'Maharashtra', TRUE, 12, 0),
('400002', 'Mumbai', 'Maharashtra', TRUE, 12, 0),
('560001', 'Bangalore', 'Karnataka', TRUE, 12, 0),
('560002', 'Bangalore', 'Karnataka', TRUE, 12, 0),
('600001', 'Chennai', 'Tamil Nadu', TRUE, 14, 0),
('700001', 'Kolkata', 'West Bengal', TRUE, 14, 0),
('500001', 'Hyderabad', 'Telangana', TRUE, 13, 0),
('411001', 'Pune', 'Maharashtra', TRUE, 12, 0);
