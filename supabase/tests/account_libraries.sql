-- Optional integration test: run AFTER the migration, only in a TEST project.
-- Everything, including the two synthetic auth users, is rolled back.
begin;
insert into auth.users(id, email) values
 ('f1111111-1111-4111-8111-111111111111', 'library-a@example.invalid'),
 ('f2222222-2222-4222-8222-222222222222', 'library-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select public.save_user_library('decks', '[{"id":"a","name":"A","game":"mtg","cards":[]}]', 0);
select public.save_user_library('wishlist', '[]', 0);
do $$ begin
  begin
    perform public.save_user_library('decks', '[]', 0);
    raise exception 'Stale revision was accepted';
  exception when sqlstate 'PT409' then null; end;
  begin
    insert into public.user_libraries(user_id, kind) values ('f2222222-2222-4222-8222-222222222222', 'decks');
    raise exception 'Cross-account insert was accepted';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims', '{"sub":"f2222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
do $$ declare affected integer; begin
  if exists (select 1 from public.user_libraries) then raise exception 'Account B can read account A'; end if;
  update public.user_libraries set items = '[]' where user_id = 'f1111111-1111-4111-8111-111111111111';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-account update was accepted'; end if;
end $$;
select public.save_user_library('decks', '[{"id":"b","name":"B","game":"pokemon","cards":[]}]', 0);
select set_config('request.jwt.claims', '{"sub":"f1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.user_libraries) <> 2 then raise exception 'Account A has incorrect visibility'; end if;
  if (select items->0->>'name' from public.user_libraries where kind = 'decks') <> 'A' then raise exception 'Account A data was overwritten'; end if;
end $$;
set local role anon;
select set_config('request.jwt.claims', '{}', true);
do $$ begin
  begin
    perform * from public.user_libraries;
    raise exception 'Anonymous table access was accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.save_user_library('decks', '[]', 0);
    raise exception 'Anonymous RPC access was accepted';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
