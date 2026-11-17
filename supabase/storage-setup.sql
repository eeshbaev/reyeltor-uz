-- Reyeltor-uz storage (fresh project)
-- Run AFTER schema.sql in Supabase → SQL Editor.

insert into storage.buckets (id, name, public)
values ('reyeltor-listings', 'reyeltor-listings', true)
on conflict (id) do update set public = true;

-- Public read for listing photos and avatars
drop policy if exists "Public read reyeltor listings bucket" on storage.objects;
create policy "Public read reyeltor listings bucket"
on storage.objects for select
using (bucket_id = 'reyeltor-listings');

-- Listing photos ("<listing id>/<file>"): only the listing's owner may upload, replace or delete.
drop policy if exists "Owners upload listing photos" on storage.objects;
create policy "Owners upload listing photos" on storage.objects for insert with check (
  bucket_id = 'reyeltor-listings'
  and exists (select 1 from public.listings l where l.id::text = (storage.foldername(name))[1] and l.user_id = auth.uid())
);
drop policy if exists "Owners update listing photos" on storage.objects;
create policy "Owners update listing photos" on storage.objects for update using (
  bucket_id = 'reyeltor-listings'
  and exists (select 1 from public.listings l where l.id::text = (storage.foldername(name))[1] and l.user_id = auth.uid())
);
drop policy if exists "Owners delete listing photos" on storage.objects;
create policy "Owners delete listing photos" on storage.objects for delete using (
  bucket_id = 'reyeltor-listings'
  and exists (select 1 from public.listings l where l.id::text = (storage.foldername(name))[1] and l.user_id = auth.uid())
);

-- Avatar folder policies (avatars/{userId}/...)
drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
on storage.objects for select
using (
  bucket_id = 'reyeltor-listings'
  and (storage.foldername(name))[1] = 'avatars'
);

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
on storage.objects for insert
with check (
  bucket_id = 'reyeltor-listings'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
on storage.objects for update
using (
  bucket_id = 'reyeltor-listings'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
on storage.objects for delete
using (
  bucket_id = 'reyeltor-listings'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);
