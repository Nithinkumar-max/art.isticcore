-- ============================================================
-- ARTISTICCORE — SEED DATA
-- Launch catalog (4 products), collections, categories,
-- serviceable pincodes, store settings.
-- Idempotent: safe to re-run (ON CONFLICT upserts).
-- ============================================================

-- ---- Categories ---------------------------------------------
insert into public.categories (name, slug, description, section, display_order) values
  ('Floral Collections', 'floral-collections', 'Everlasting hand-crocheted bouquets and stems', 'trending', 1),
  ('Bags & Totes',       'bags-totes',         'Handcrafted crochet bags for every day',     'shop_by_category', 2),
  ('Apparel',            'apparel',            'Wearable crochet: sweaters, tops, layers',   'shop_by_category', 3),
  ('Blankets',           'blankets',           'Chunky throws and heirloom blankets',        'shop_by_category', 4),
  ('Amigurumi & Charms', 'amigurumi-charms',   'Tiny friends and pocket charms',             'shop_by_category', 5),
  ('Home Décor',         'home-decor',         'Beautiful crochet pieces for your home',     'shop_by_category', 6)
on conflict (slug) do nothing;

-- Sub-category example (hierarchy demo): parent = Apparel
insert into public.categories (name, slug, parent_id, description, display_order)
values ('Summer Tops', 'summer-tops',
        (select id from public.categories where slug = 'apparel'),
        'Airy openwork tops for warm days', 1)
on conflict (slug) do nothing;

-- ---- Collections (6) ----------------------------------------
insert into public.collections (name, slug, description, display_order) values
  ('Chunky Blankets',  'chunky-blankets',  'Plush, oversized textures for slow evenings',      1),
  ('Summer Tops',      'summer-tops',      'Breezy openwork pieces for sunlit days',           2),
  ('Eternal Bouquets', 'eternal-bouquets', 'Hand-shaped florals that never need water',        3),
  ('Everyday Totes',   'everyday-totes',   'Carry-a-little-sunshine market and city bags',     4),
  ('Pocket Charms',    'pocket-charms',    'Small joys to clip on bags and keys',              5),
  ('Cozy Home',        'cozy-home',        'Basket-and-blanket comfort for every corner',      6)
on conflict (slug) do nothing;

-- ---- Products (4 launch items) ------------------------------
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

-- Variants for the bouquet
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

-- Product images (Google CDN placeholders until R2/Storage migration)
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

-- ---- Collection ↔ product mapping ----------------------------
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

-- ---- Serviceable pincodes ------------------------------------
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

-- ---- Store settings (Art.isticcore branding) -------------------
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
