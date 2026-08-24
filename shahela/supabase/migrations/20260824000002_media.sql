-- ============================================================================
-- MIGRATION 3: Media library (DB-managed images for the storefront)
-- ============================================================================
-- Admins upload files via /api/upload -> Supabase Storage -> row in
-- public.media. The frontend reads slots (e.g. 'hero-desktop') or product
-- galleries from here, so new uploads reflect on the site without deploys.
-- ============================================================================

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

-- Everyone (anon included) may read active media.
create policy "media_select_active"
  on public.media for select
  using (is_active);

-- Only staff may write media. Service role bypasses RLS anyway; this covers
-- any authenticated admin paths.
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

-- Revoke direct table access from anon beyond SELECT.
revoke insert, update, delete on public.media from anon;

-- ----------------------------------------------------------------------------
-- Seed: current hero imagery so the homepage renders before first upload.
-- Replaced as soon as an admin uploads to the same slot.
-- ----------------------------------------------------------------------------
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
