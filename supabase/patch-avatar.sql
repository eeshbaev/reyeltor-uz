-- Add profile avatar support (run once in Supabase SQL Editor)

alter table public.users
  add column if not exists avatar_url text;

alter table public.users
  add column if not exists bio text;

-- Storage policies for avatars in the reyeltor-listings bucket
-- Bucket must already exist and be public for reads.

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
