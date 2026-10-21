-- Public behaviour: voting, submissions and the search/filter function.
begin;
set search_path = public, extensions;
select plan(25);

insert into shops (id, name, address, area_id, type, roast_levels, bean_origin, processing, description, serves_geisha)
select '00000000-0000-0000-0000-00000000f101', 'Vote Test Cafe', 'Jl. Test 20', id, 'brewer', '{light}', 'local', '{washed}',
  'Zzyzx single origin.', true
from areas where slug = 'kuta';
insert into shops (id, name, address, area_id, type, roast_levels, bean_origin, processing, is_hidden)
select '00000000-0000-0000-0000-00000000f102', 'Hidden Vote Cafe', 'Jl. Test 21', id, 'brewer', '{light}', 'local', '{washed}', true
from areas where slug = 'kuta';

-- ---------------------------------------------------------------------------
-- P5: voting, as the vote Edge Function calls it
-- ---------------------------------------------------------------------------
set local role service_role;

select results_eq(
  $$ select upvotes, downvotes, value from cast_vote('00000000-0000-0000-0000-00000000f101', '00000000-0000-0000-0000-00000000a001', 'ip-1', 1::smallint) $$,
  $$ values (1, 0, 1::smallint) $$,
  'a thumbs up counts at once'
);
select results_eq(
  $$ select upvotes, downvotes from cast_vote('00000000-0000-0000-0000-00000000f101', '00000000-0000-0000-0000-00000000a001', 'ip-1', -1::smallint) $$,
  $$ values (0, 1) $$,
  'voting the other way switches the vote'
);
select results_eq(
  $$ select upvotes, downvotes from cast_vote('00000000-0000-0000-0000-00000000f101', '00000000-0000-0000-0000-00000000a001', 'ip-1', 0::smallint) $$,
  $$ values (0, 0) $$,
  'removing a vote takes it off the count'
);
select is(
  (select count(*)::integer from shop_votes where shop_id = '00000000-0000-0000-0000-00000000f101'), 0,
  'a removed vote leaves no row'
);

select cast_vote('00000000-0000-0000-0000-00000000f101', '00000000-0000-0000-0000-00000000a002', 'ip-2', 1::smallint);
select cast_vote('00000000-0000-0000-0000-00000000f101', '00000000-0000-0000-0000-00000000a003', 'ip-2', 1::smallint);
select cast_vote('00000000-0000-0000-0000-00000000f101', '00000000-0000-0000-0000-00000000a003', 'ip-2', 1::smallint);
select results_eq(
  $$ select upvotes, score from shops where id = '00000000-0000-0000-0000-00000000f101' $$,
  $$ values (2, 2) $$,
  'one vote per shop per device: voting the same way twice still counts once'
);

select throws_ok(
  $$ select cast_vote('00000000-0000-0000-0000-00000000f102', gen_random_uuid(), 'ip-3', 1::smallint) $$,
  'CA404', null, 'votes on hidden shops are rejected'
);

-- 90-day window: an old vote stops counting after the nightly refresh.
reset role;
update shop_votes set updated_at = now() - interval '91 days'
where voter_token = '00000000-0000-0000-0000-00000000a002';
select refresh_vote_counters();
select results_eq(
  $$ select upvotes, downvotes, score from shops where id = '00000000-0000-0000-0000-00000000f101' $$,
  $$ values (1, 0, 1) $$,
  'votes older than 90 days age out of the counters'
);

-- Rate limit: 60 votes per IP hash per hour.
insert into rate_limit_events (bucket, key) select 'vote', 'ip-busy' from generate_series(1, 60);
set local role service_role;
select throws_ok(
  $$ select cast_vote('00000000-0000-0000-0000-00000000f101', gen_random_uuid(), 'ip-busy', 1::smallint) $$,
  'CA429', null, 'the 61st vote in an hour from one IP is rejected'
);
select lives_ok(
  $$ select cast_vote('00000000-0000-0000-0000-00000000f101', gen_random_uuid(), 'ip-calm', 1::smallint) $$,
  'other IPs can still vote'
);

-- ---------------------------------------------------------------------------
-- P6: submissions
-- ---------------------------------------------------------------------------
select isnt(
  submit_shop('A New Cafe', 'https://maps.app.goo.gl/AbC123', 'Great pour over.', 'Someone@Example.com', 'ip-4'), null,
  'a submission is accepted'
);
select results_eq(
  $$ select status::text, submitter_email from shop_submissions where name = 'A New Cafe' $$,
  $$ values ('pending', 'someone@example.com') $$,
  'a submission waits in the queue as pending'
);
select submit_shop('Cafe ' || n, 'https://maps.app.goo.gl/spam', null, null, 'ip-5') from generate_series(1, 5) as n;
select throws_ok(
  $$ select submit_shop('Cafe 6', 'https://maps.app.goo.gl/spam', null, null, 'ip-5') $$,
  'CA429', null, 'the 6th submission in an hour from one IP is rejected'
);
select throws_ok(
  $$ select submit_shop('Not Maps', 'https://example.com/cafe', null, null, 'ip-6') $$,
  '23514', null, 'a submission needs a Google Maps link'
);

-- ---------------------------------------------------------------------------
-- P2/P3: search and filters, as a visitor
-- ---------------------------------------------------------------------------
reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is(
  (select name from search_shops(p_query => 'Vote Test')), 'Vote Test Cafe',
  'search matches by name'
);
select is(
  (select name from search_shops(p_query => 'zzyz')), 'Vote Test Cafe',
  'search matches the start of a word in the description'
);
select is(
  (select name from search_shops(p_query => 'Vote Tset Cafe')), 'Vote Test Cafe',
  'search tolerates a typo in the name'
);
select is(
  (select name from search_shops(p_query => 'kuta', p_roast => '{light}', p_type => 'brewer') limit 1), 'Vote Test Cafe',
  'search combines with filters'
);
select is_empty(
  $$ select 1 from search_shops(p_roast => '{light}') where 'light' <> all (roast_levels) $$,
  'the roast filter only returns shops offering that roast'
);
select is_empty(
  $$ select 1 from search_shops(p_bean_origin => 'local') where bean_origin not in ('local', 'both') $$,
  'bean origin local returns local and both'
);
select is_empty(
  $$ select 1 from search_shops(p_type => 'both') where type <> 'both' $$,
  'the type filter matches exactly'
);
select is_empty(
  $$ select 1 from search_shops(p_areas => '{canggu}', p_preparations => '{manual}')
     where area_slug <> 'canggu' or 'manual' <> all (preparations) $$,
  'different filters combine with AND'
);
select ok(
  'Vote Test Cafe' in (select name from search_shops(p_query => 'geisha')),
  'searching "geisha" finds shops with Geisha beans'
);
select is_empty(
  $$ select 1 from search_shops(p_geisha => true) where not serves_geisha $$,
  'the Geisha filter only returns shops with Geisha beans'
);
select ok(
  'Vote Test Cafe' in (select name from search_shops(p_geisha => true, p_areas => '{kuta}')),
  'the Geisha filter combines with other filters'
);
select is(
  (select array_agg(score order by ordinality) from search_shops() with ordinality),
  (select array_agg(score order by score desc) from search_shops()),
  'without a query, shops are ranked by score'
);

select * from finish();
rollback;
