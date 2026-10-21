-- Admin writes: saving shops, change history, conflicts, hiding, option lists
-- and approving submissions.
begin;
set search_path = public, extensions;
select plan(37);

insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com', 'authenticated', 'authenticated');
insert into admins (user_id, email) values ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com');

insert into shop_submissions (id, name, maps_url)
values ('00000000-0000-0000-0000-00000000500b', 'Submitted Cafe', 'https://maps.app.goo.gl/abc');

-- Helpers resolve option ids by slug; they run as the table owner.
create function pg_temp.prep(p_slugs text[]) returns uuid[] language sql as $$
  select array_agg(id order by slug) from public.preparation_methods where slug = any (p_slugs)
$$;
create function pg_temp.area(p_slug text) returns uuid language sql as $$
  select id from public.areas where slug = p_slug
$$;
create function pg_temp.roaster(p_name text) returns uuid language sql as $$
  select id from public.roasters where name = p_name
$$;
grant execute on function pg_temp.prep(text[]), pg_temp.area(text), pg_temp.roaster(text) to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000ad", "role": "authenticated"}';

select ok(is_admin(), 'a user with an admins row is an admin');

-- ---------------------------------------------------------------------------
-- A2: add a brewer with an existing and an inline roaster
-- ---------------------------------------------------------------------------
create temp table saved on commit drop as
select * from save_shop(
  jsonb_build_object(
    'name', 'Test Brewer Cafe', 'address', 'Jl. Test 10', 'area_id', pg_temp.area('ubud'),
    'type', 'brewer', 'roast_levels', '["light"]'::jsonb, 'bean_origin', 'local', 'processing', '["washed"]'::jsonb,
    'website', 'https://example.com'
  ),
  pg_temp.prep('{espresso,manual}'),
  array[pg_temp.roaster('Highland Sample Roasters')],
  '[{"name": "Inline Test Roasters", "city": "Bangli", "processing": ["natural"]}]'::jsonb
);

select is((select slug from saved), 'test-brewer-cafe', 'a new shop gets a slug from its name');
select is((select preparations from saved), '{espresso,manual}'::text[], 'preparations are copied onto the shop row');
select is((select cardinality(roaster_ids) from saved), 2, 'the brewer lists both roasters');
select is((select serves_geisha from saved), false, 'a shop has no Geisha beans unless the admin says so');
select ok(exists (select 1 from roasters where name = 'Inline Test Roasters' and city = 'Bangli'), 'an inline roaster is created');
select is(
  (select created_by from saved), '00000000-0000-0000-0000-0000000000ad'::uuid,
  'the shop records which admin created it'
);
select results_eq(
  $$ select action::text, changes from shop_revisions where shop_id = (select id from saved) $$,
  $$ values ('create', '{}'::jsonb) $$,
  'creating a shop writes one create revision'
);
select is(
  (select snapshot -> 'preparations' from shop_revisions where shop_id = (select id from saved)),
  '["espresso", "manual"]'::jsonb,
  'the create snapshot includes the preparations saved in the same transaction'
);
select is(
  (select changed_by from shop_revisions where shop_id = (select id from saved)),
  '00000000-0000-0000-0000-0000000000ad'::uuid,
  'the revision records the acting admin'
);

-- A second shop with a similar name in the same area is flagged.
select results_eq(
  $$ select name from find_similar_shops('Test Brewer Caffe', pg_temp.area('ubud')) $$,
  $$ values ('Test Brewer Cafe') $$,
  'find_similar_shops flags a near-duplicate in the same area'
);
select is_empty(
  $$ select 1 from find_similar_shops('Test Brewer Cafe', pg_temp.area('kuta')) $$,
  'find_similar_shops ignores other areas'
);

-- ---------------------------------------------------------------------------
-- A4: edit with change tracking. Each save is its own transaction in the
-- app; here the revision for this shop already exists in this transaction,
-- so remove it to see the update recorded on its own.
-- ---------------------------------------------------------------------------
reset role;
delete from shop_revisions where shop_id = (select id from saved);
update shops set updated_at = now() - interval '1 minute' where id = (select id from saved);
set local role authenticated;

create temp table edited on commit drop as
select * from save_shop(
  jsonb_build_object(
    'id', (select id from saved),
    'name', 'Test Brewer Cafe', 'address', 'Jl. Test 11', 'area_id', pg_temp.area('ubud'),
    'type', 'brewer', 'roast_levels', '["light", "medium"]'::jsonb, 'bean_origin', 'local', 'processing', '["washed"]'::jsonb,
    'serves_geisha', true, 'website', 'https://example.com'
  ),
  pg_temp.prep('{espresso}'),
  array[pg_temp.roaster('Highland Sample Roasters')],
  '[]'::jsonb,
  (select updated_at from shops where id = (select id from saved))
);

select results_eq(
  $$ select action::text from shop_revisions where shop_id = (select id from saved) $$,
  $$ values ('update') $$,
  'an edit writes one update revision'
);
select is(
  (select array_agg(k order by k) from shop_revisions r, jsonb_object_keys(r.changes) k where r.shop_id = (select id from saved)),
  '{address,preparations,roast_levels,roaster_ids,serves_geisha}'::text[],
  'the revision lists exactly the changed fields, including preparations and roasters'
);
select is((select serves_geisha from edited), true, 'saving records Geisha beans on offer');
select is(
  (select changes -> 'roast_levels' from shop_revisions where shop_id = (select id from saved)),
  '{"from": ["light"], "to": ["light", "medium"]}'::jsonb,
  'a change records the old and new value'
);
select is(
  (select changes -> 'preparations' from shop_revisions where shop_id = (select id from saved)),
  '{"from": ["espresso", "manual"], "to": ["espresso"]}'::jsonb,
  'join-table changes made in the same save merge into one from/to pair'
);
select ok(
  not (select changes ? 'name' from shop_revisions where shop_id = (select id from saved)),
  'unchanged fields are not listed'
);
select is((select updated_at from edited), now(), 'saving moves updated_at to the save time');

-- A stale form is rejected.
select throws_ok(
  format(
    $$ select save_shop(%L::jsonb, pg_temp.prep('{espresso}'), '{}', '[]', %L::timestamptz) $$,
    jsonb_build_object(
      'id', (select id from saved), 'name', 'Stale Edit', 'address', 'Jl. Test 11', 'area_id', pg_temp.area('ubud'),
      'type', 'brewer', 'roast_levels', '["light"]'::jsonb, 'bean_origin', 'local', 'processing', '["washed"]'::jsonb
    ),
    now() - interval '1 day'
  ),
  'CA409', null,
  'a save is rejected when someone else saved after the form loaded'
);

-- ---------------------------------------------------------------------------
-- Slugs: admins can change them; old links keep working.
-- ---------------------------------------------------------------------------
update shops set slug = 'Test Brewer Café!' where id = (select id from saved);
select is((select slug from shops where id = (select id from saved)), 'test-brewer-cafe', 'a typed slug is normalised');
update shops set slug = 'brewer-bar' where id = (select id from saved);
select is((select slug from shops where id = (select id from saved)), 'brewer-bar', 'an admin can change the slug');
select is(
  (select shop_id from shop_slug_redirects where slug = 'test-brewer-cafe'), (select id from saved),
  'the old slug redirects to the shop'
);
update shops set slug = '' where id = (select id from saved);
select is((select slug from shops where id = (select id from saved)), 'brewer-bar', 'an empty slug keeps the current one');
select throws_ok(
  $$ update shops set slug = 'sample-roastery' where id = (select id from saved) $$,
  '23505', null, 'a slug another shop uses is refused'
);
update shops set slug = 'test-brewer-cafe' where id = (select id from saved);
select is_empty(
  $$ select 1 from shop_slug_redirects where slug = 'test-brewer-cafe' $$,
  'taking a slug back removes its redirect'
);

-- ---------------------------------------------------------------------------
-- Shops that also roast: linked roaster record
-- ---------------------------------------------------------------------------
create temp table roaster_shop on commit drop as
select * from save_shop(
  jsonb_build_object(
    'name', 'Test Roaster Shop', 'address', 'Jl. Test 12', 'area_id', pg_temp.area('sanur'),
    'type', 'both', 'roast_levels', '["dark"]'::jsonb, 'bean_origin', 'foreign', 'processing', '["natural"]'::jsonb
  ),
  pg_temp.prep('{espresso}')
);
select results_eq(
  $$ select name, city, processing from roasters where shop_id = (select id from roaster_shop) $$,
  $$ values ('Test Roaster Shop'::text, 'Sanur'::text, '{natural}'::text[]) $$,
  'saving a shop of type both creates its linked roaster'
);

-- ---------------------------------------------------------------------------
-- A5: hide and unhide
-- ---------------------------------------------------------------------------
reset role;
delete from shop_revisions where shop_id = (select id from roaster_shop);
set local role authenticated;
update shops set is_hidden = true where id = (select id from roaster_shop);
select results_eq(
  $$ select action::text, changes from shop_revisions where shop_id = (select id from roaster_shop) $$,
  $$ values ('hide', '{"is_hidden": {"from": false, "to": true}}'::jsonb) $$,
  'hiding a shop is recorded as a hide revision'
);
select ok(
  exists (select 1 from shops where id = (select id from roaster_shop)),
  'admins still see hidden shops'
);
select throws_ok(
  $$ delete from shops where id = (select id from roaster_shop) $$,
  '42501', null, 'shops cannot be hard deleted'
);

-- ---------------------------------------------------------------------------
-- A6: approve a submission
-- ---------------------------------------------------------------------------
select lives_ok(
  $$ select save_shop(
       jsonb_build_object(
         'name', 'Submitted Cafe', 'address', 'Jl. Submitted 3', 'area_id', pg_temp.area('canggu'),
         'type', 'brewer', 'roast_levels', '["medium"]'::jsonb, 'bean_origin', 'local', 'processing', '["washed"]'::jsonb
       ),
       pg_temp.prep('{espresso}'), '{}', '[]', null, '00000000-0000-0000-0000-00000000500b'
     ) $$,
  'approving a submission saves the shop'
);
select results_eq(
  $$ select status::text, (shop_id is not null), reviewed_by from shop_submissions where id = '00000000-0000-0000-0000-00000000500b' $$,
  $$ values ('approved', true, '00000000-0000-0000-0000-0000000000ad'::uuid) $$,
  'the submission is marked approved and linked to the shop'
);

-- ---------------------------------------------------------------------------
-- A7: option lists
-- ---------------------------------------------------------------------------
insert into preparation_methods (label, sort_order) values ('Siphon', 6);
select is((select slug from preparation_methods where label = 'Siphon'), 'siphon', 'a new option gets a slug from its label');
select throws_ok(
  $$ update preparation_methods set slug = 'vacuum' where slug = 'siphon' $$,
  '23514', null, 'an option''s slug cannot change'
);
select throws_ok(
  $$ delete from roast_levels where slug = 'light' $$,
  '23503', null, 'a roast level in use cannot be deleted'
);
select throws_ok(
  $$ delete from preparation_methods where slug = 'espresso' $$,
  '23503', null, 'a preparation in use cannot be deleted'
);
select throws_ok(
  $$ update shops set roast_levels = '{blonde}' where id = (select id from saved) $$,
  '23503', 'Unknown roast level: "blonde"', 'shops only accept roast levels from the option list'
);

select * from finish();
rollback;
