-- =============================================================================
-- Reyeltor-uz: profile privacy
-- =============================================================================
-- Run AFTER the other -v1 patches. Safe to re-run.
--
-- Problem: the "Users are publicly readable" policy let anyone download every user's
-- full row — phone numbers (even when "show phone" is off), emails, coin balances.
--
-- Fix:
--   * users: each person can read only their own full row.
--   * public_profiles: what buyers may see about a seller. Phone only when the seller
--     chose to show it; only people who have published at least one listing appear.
--
-- Note: app builds <= 1.2.2 read seller details straight from users, so after this patch
-- they will not show the seller card on other people's listings until users update.
-- =============================================================================

drop policy if exists "Users are publicly readable" on public.users;
drop policy if exists "Users read own profile" on public.users;
create policy "Users read own profile" on public.users
  for select using (auth.uid() = id);

alter table public.users add column if not exists email_visible boolean not null default true;

-- Runs with the owner's rights (not security_invoker) so it can show other sellers,
-- but only the columns listed here.
create or replace view public.public_profiles
with (security_barrier = true)
as
select
  u.id,
  u.full_name,
  u.avatar_url,
  u.bio,
  u.telegram_username,
  -- Email is shown to buyers as a contact unless the seller hides it in Profile.
  case when u.email_visible then u.email else null end as email,
  case when u.phone_visible then u.phone else null end as phone,
  u.phone_visible,
  u.total_posted,
  u.total_rented,
  u.total_sold,
  u.total_expired,
  u.avg_days_on_market,
  u.close_rate,
  u.created_at,
  u.last_active_at,
  u.email_visible
from public.users u
where exists (select 1 from public.listings l where l.user_id = u.id);

revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;
