-- ============================================================
-- CATEGORIES REFRESH
-- Replaces the launch catalog categories with the new store
-- taxonomy (8 categories), each with a stock photo from Pexels
-- stored in categories.image_url. Re-maps existing seeded
-- products to the closest new category.
-- Idempotent: safe to re-run.
-- NOTE: categories are cached in Upstash Redis for 24h under
-- "categories:*" — delete those keys (or wait for TTL) after
-- applying so the storefront picks up the new taxonomy.
-- ============================================================

-- 1. Retire legacy categories --------------------------------
update public.categories
set is_active = false, updated_at = now()
where slug in (
  'floral-collections', 'bags-totes', 'apparel', 'blankets',
  'amigurumi-charms', 'home-decor', 'summer-tops'
);

-- 2. Upsert the new taxonomy with imagery ---------------------
insert into public.categories (name, slug, description, section, display_order, image_url) values
  ('Bouquets',           'bouquets',         'Everlasting hand-crocheted floral bouquets and stems', 'trending',         1, 'https://images.pexels.com/photos/20269075/pexels-photo-20269075.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('Home Decors',        'home-decors',      'Decorative crochet accents for every corner of home',  'shop_by_category', 2, 'https://images.pexels.com/photos/36644650/pexels-photo-36644650.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('Custom Orders',      'custom-orders',    'Made-to-order pieces designed around your idea',       'shop_by_category', 3, 'https://images.pexels.com/photos/35155839/pexels-photo-35155839.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('Keychains',          'keychains',        'Tiny crocheted charms for keys, bags and pockets',     'shop_by_category', 4, 'https://images.pexels.com/photos/1194036/pexels-photo-1194036.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('Wearables',          'wearables',        'Crocheted sweaters, tops and layers to wear',          'shop_by_category', 5, 'https://images.pexels.com/photos/6630834/pexels-photo-6630834.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('Accessories',        'accessories',      'Handcrafted bags, pouches and everyday carry',         'shop_by_category', 6, 'https://images.pexels.com/photos/25469611/pexels-photo-25469611.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('Homewares',          'homewares',        'Blankets, baskets and cozy pieces for daily use',      'shop_by_category', 7, 'https://images.pexels.com/photos/5806996/pexels-photo-5806996.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('Seasonal & Holiday', 'seasonal-holiday', 'Festive crochet for holidays and special seasons',     'shop_by_category', 8, 'https://images.pexels.com/photos/35153221/pexels-photo-35153221.jpeg?auto=compress&cs=tinysrgb&w=800')
on conflict (slug) do update
set name          = excluded.name,
    description   = excluded.description,
    image_url     = excluded.image_url,
    display_order = excluded.display_order,
    is_active     = true,
    updated_at    = now();

-- 3. Re-map seeded products to the closest new category -------
update public.products p
set category_id = c.id, updated_at = now()
from public.categories c
where c.slug = 'bouquets' and p.slug = 'giant-sunflower-bouquet';

update public.products p
set category_id = c.id, updated_at = now()
from public.categories c
where c.slug = 'accessories' and p.slug = 'classic-sunflower-tote';

update public.products p
set category_id = c.id, updated_at = now()
from public.categories c
where c.slug = 'wearables' and p.slug = 'oatmeal-dream-sweater';

update public.products p
set category_id = c.id, updated_at = now()
from public.categories c
where c.slug = 'homewares' and p.slug = 'berry-bliss-chunky-throw';
