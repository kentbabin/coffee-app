-- Visitors read the public directory and nothing else, and cannot write
-- anything directly. Signed-in users who are not admins get the same.
begin;
set search_path = public, extensions;
select plan(31);

-- Fixtures, created as the table owner.
insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-0000000000aa', 'not-an-admin@example.com', 'authenticated', 'authenticated');

insert into shops (id, name, address, area_id, type, roast_levels, bean_origin, processing, is_hidden)
select '00000000-0000-0000-0000-00000000f001', 'Test Hidden Shop', 'Jl. Test 1', id, 'maker', '{light}', 'local', '{washed}', true
from areas where slug = 'canggu';

insert into shop_submissions (name, address) values ('Test Submission', 'Jl. Test 2');

-- Every public table has RLS switched on.
select is_empty(
  $$ select tablename from pg_tables where schemaname = 'public' and not rowsecurity $$,
  'every table in public has row level security enabled'
);

-- ---------------------------------------------------------------------------
-- Anonymous visitor
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is_empty(
  $$ select 1 from shops where is_hidden $$,
  'anon cannot read hidden shops'
);
select is_empty(
  $$ select 1 from shops where slug = 'test-hidden-shop' $$,
  'anon cannot read a hidden shop by its slug'
);
select is_empty(
  $$ select 1 from search_shops(p_query => 'Test Hidden Shop') $$,
  'search_shops never returns hidden shops'
);
select isnt_empty($$ select 1 from shops $$, 'anon can read visible shops');
select isnt_empty($$ select 1 from roaster_directory $$, 'anon can read the roasters list');
select isnt_empty($$ select 1 from areas $$, 'anon can read option lists');

select throws_ok(
  $$ insert into shops (name, address, area_id, type, roast_levels, bean_origin, processing)
     select 'Sneaky', 'x', id, 'maker', '{light}', 'local', '{washed}' from areas limit 1 $$,
  '42501', null, 'anon cannot insert shops'
);
select throws_ok($$ update shops set name = 'Changed' $$, '42501', null, 'anon cannot update shops');
select throws_ok($$ delete from shops $$, '42501', null, 'anon cannot delete shops');
select throws_ok($$ insert into areas (label) values ('Nowhere') $$, '42501', null, 'anon cannot add option values');
select throws_ok($$ insert into roasters (name) values ('Sneaky Roaster') $$, '42501', null, 'anon cannot add roasters');
select throws_ok(
  $$ insert into shop_votes (shop_id, voter_token, ip_hash, value)
     select id, gen_random_uuid(), 'x', 1 from shops limit 1 $$,
  '42501', null, 'anon cannot write votes directly'
);
select throws_ok(
  $$ insert into shop_submissions (name, address) values ('Direct', 'x') $$,
  '42501', null, 'anon cannot write submissions directly'
);
select throws_ok($$ select * from shop_votes $$, '42501', null, 'anon cannot read votes');
select throws_ok($$ select * from shop_submissions $$, '42501', null, 'anon cannot read submissions');
select throws_ok($$ select * from shop_revisions $$, '42501', null, 'anon cannot read change history');
select throws_ok($$ select * from admins $$, '42501', null, 'anon cannot read admins');
select throws_ok($$ select * from rate_limit_events $$, '42501', null, 'anon cannot read rate-limit records');
select throws_ok(
  $$ select save_shop('{}'::jsonb, '{}'::uuid[]) $$,
  '42501', null, 'anon cannot call save_shop'
);
select throws_ok(
  $$ select * from cast_vote(gen_random_uuid(), gen_random_uuid(), 'x', 1::smallint) $$,
  '42501', null, 'anon cannot call cast_vote directly'
);
select throws_ok(
  $$ select submit_shop('x', 'x', null, null, null, 'x') $$,
  '42501', null, 'anon cannot call submit_shop directly'
);

-- ---------------------------------------------------------------------------
-- Signed in, but not an admin
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000aa", "role": "authenticated"}';

select ok(not is_admin(), 'a user without an admins row is not an admin');
select is_empty($$ select 1 from shops where is_hidden $$, 'non-admin cannot read hidden shops');
select throws_ok(
  $$ insert into shops (name, address, area_id, type, roast_levels, bean_origin, processing)
     select 'Sneaky', 'x', id, 'maker', '{light}', 'local', '{washed}' from areas limit 1 $$,
  '42501', null, 'non-admin cannot insert shops'
);
select is_empty(
  $$ update shops set name = 'Changed' returning 1 $$,
  'non-admin updates touch no shops'
);
select throws_ok($$ insert into areas (label) values ('Nowhere') $$, '42501', null, 'non-admin cannot add option values');
select is_empty($$ select 1 from shop_submissions $$, 'non-admin sees no submissions');
select is_empty($$ select 1 from shop_revisions $$, 'non-admin sees no change history');
select is_empty($$ select 1 from shop_votes $$, 'non-admin sees no votes');
select throws_ok(
  $$ select save_shop('{}'::jsonb, '{00000000-0000-0000-0000-000000000001}'::uuid[]) $$,
  '42501', 'Only admins can save shops.', 'non-admin cannot save shops through save_shop'
);

select * from finish();
rollback;
