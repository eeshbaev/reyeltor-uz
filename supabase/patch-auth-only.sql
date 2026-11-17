-- MINIMAL PATCH: registration trigger only (~40 lines)
-- Paste this alone if the full patch-existing.sql fails to load in Dashboard.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, phone, email, coin_balance)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    new.email,
    15
  )
  on conflict (id) do nothing;

  if not exists (
    select 1 from public.coin_transactions
    where user_id = new.id and type = 'welcome'
  ) then
    insert into public.coin_transactions (user_id, amount, type)
    values (new.id, 15, 'welcome');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
