-- ============================================================
-- ARTISTICCORE — STORAGE BUCKETS + POLICIES
-- product-images : public read, admin-only write
-- user-avatars   : public read, user writes own folder
-- order-invoices : private, admin all / owner reads own folder
-- ============================================================

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

-- Helper: is current user staff?
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select u.role from public.users u where u.id = auth.uid())
    in ('ADMIN','SUPER_ADMIN'), false);
$$;

revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

-- ---- product-images -----------------------------------------
create policy "product_images_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');

-- Upstream requires INSERT + SELECT + UPDATE for upsert flows.
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

-- ---- user-avatars -------------------------------------------
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

-- ---- order-invoices -----------------------------------------
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
