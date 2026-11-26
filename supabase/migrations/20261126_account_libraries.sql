-- Run once in the Supabase SQL Editor of the SAME project as Authentication.
begin;
create table if not exists public.user_libraries (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('decks', 'wishlist')),
  items jsonb not null default '[]'::jsonb,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, kind),
  constraint library_array check (jsonb_typeof(items) = 'array'),
  constraint library_count check (jsonb_array_length(items) <= case when kind = 'decks' then 200 else 1000 end),
  constraint library_size check (octet_length(items::text) <= 4194304)
);
alter table public.user_libraries enable row level security;
alter table public.user_libraries force row level security;
revoke all on public.user_libraries from public, anon, authenticated;
grant select, insert, update on public.user_libraries to authenticated;
drop policy if exists account_library_select on public.user_libraries;
create policy account_library_select on public.user_libraries for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists account_library_insert on public.user_libraries;
create policy account_library_insert on public.user_libraries for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists account_library_update on public.user_libraries;
create policy account_library_update on public.user_libraries for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.save_user_library(p_kind text, p_items jsonb, p_expected_revision bigint)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare saved public.user_libraries;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if p_kind not in ('decks', 'wishlist') or p_expected_revision is null or p_expected_revision < 0 or p_items is null then
    raise invalid_parameter_value;
  end if;
  insert into public.user_libraries(user_id, kind) values (auth.uid(), p_kind)
    on conflict (user_id, kind) do nothing;
  update public.user_libraries set items = p_items, revision = revision + 1, updated_at = now()
    where user_id = auth.uid() and kind = p_kind and revision = p_expected_revision
    returning * into saved;
  if not found then raise sqlstate 'PT409' using message = 'libraryConflict'; end if;
  return jsonb_build_object('items', saved.items, 'revision', saved.revision);
end;
$$;
revoke all on function public.save_user_library(text, jsonb, bigint) from public, anon;
grant execute on function public.save_user_library(text, jsonb, bigint) to authenticated;
notify pgrst, 'reload schema';
commit;
