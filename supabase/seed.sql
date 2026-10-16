-- Local development seed: option lists from the scope, plus made-up sample
-- shops (never real ones) so every screen has something to show.

insert into public.areas (slug, label, region, sort_order) values
  ('canggu', 'Canggu', 'Bali', 1),
  ('ubud', 'Ubud', 'Bali', 2),
  ('seminyak', 'Seminyak', 'Bali', 3),
  ('sanur', 'Sanur', 'Bali', 4),
  ('uluwatu', 'Uluwatu', 'Bali', 5),
  ('kuta', 'Kuta', 'Bali', 6),
  ('denpasar', 'Denpasar', 'Bali', 7);

insert into public.roast_levels (slug, label, sort_order) values
  ('light', 'Light', 1),
  ('medium', 'Medium', 2),
  ('dark', 'Dark', 3);

insert into public.bean_origins (slug, label, sort_order) values
  ('local', 'Local beans', 1),
  ('foreign', 'Imported beans', 2),
  ('both', 'Local and imported beans', 3);

insert into public.processing_methods (slug, label, sort_order) values
  ('natural', 'Natural', 1),
  ('washed', 'Washed', 2),
  ('experimental', 'Experimental', 3);

insert into public.preparation_methods (slug, label, sort_order) values
  ('espresso', 'Espresso', 1),
  ('manual', 'Manual brew', 2),
  ('cold-brew', 'Cold brew', 3),
  ('batch-brew', 'Batch brew', 4),
  ('omakase', 'Omakase', 5);

-- Roasters without a shop of their own.
insert into public.roasters (name, city, processing) values
  ('Highland Sample Roasters', 'Kintamani', '{natural,washed}'),
  ('Sample Island Roasters', 'Denpasar', '{washed,experimental}');

create function pg_temp.seed_shop(
  p_name text, p_area text, p_type public.shop_type, p_roast text[], p_preparations text[],
  p_origin text, p_processing text[], p_roasters text[], p_up integer, p_down integer,
  p_description text, p_hidden boolean default false
) returns void language plpgsql as $$
declare
  v_shop public.shops;
begin
  insert into public.shops (name, address, area_id, maps_url, lat, lng, type, roast_levels, bean_origin, processing, description, is_hidden)
  select p_name, 'Jl. Contoh No. ' || (10 + floor(random() * 80))::int || ', ' || a.label, a.id,
    'https://www.google.com/maps/search/?api=1&query=' || replace(p_name, ' ', '+'),
    -8.65 + random() * 0.2, 115.1 + random() * 0.2,
    p_type, p_roast, p_origin, p_processing, p_description, p_hidden
  from public.areas a where a.slug = p_area
  returning * into v_shop;

  insert into public.shop_preparations (shop_id, preparation_id)
  select v_shop.id, pm.id from public.preparation_methods pm where pm.slug = any (p_preparations);

  if p_type = 'both' then
    insert into public.roasters (name, city, processing, shop_id)
    select v_shop.name, a.label, p_processing, v_shop.id from public.areas a where a.id = v_shop.area_id;
  end if;

  insert into public.shop_roasters (shop_id, roaster_id)
  select v_shop.id, r.id from public.roasters r where r.name = any (p_roasters);

  insert into public.shop_votes (shop_id, voter_token, ip_hash, value)
  select v_shop.id, gen_random_uuid(), 'seed', 1 from generate_series(1, p_up)
  union all
  select v_shop.id, gen_random_uuid(), 'seed', -1 from generate_series(1, p_down);
end;
$$;

-- Shops that roast first, so the brewers below can list them.
select pg_temp.seed_shop('Sample Roastery', 'canggu', 'both', '{light,medium}', '{espresso,manual,cold-brew}', 'local', '{washed,natural}', '{}', 128, 6,
  'Roasts Kintamani beans in house and brews them light on a slow bar.');
select pg_temp.seed_shop('Sample Bean Works', 'seminyak', 'both', '{light}', '{manual,omakase}', 'foreign', '{experimental,natural}', '{}', 61, 4,
  'A roastery with a tasting counter for single origins and experimental lots.');
select pg_temp.seed_shop('Sample Roast Lab', 'ubud', 'both', '{medium,dark}', '{espresso,manual}', 'local', '{natural}', '{}', 39, 3,
  'Small-batch roaster with a short espresso menu.');
select pg_temp.seed_shop('Sample Dark Room', 'seminyak', 'both', '{dark}', '{espresso}', 'foreign', '{natural}', '{}', 17, 5,
  'Dark roasts for espresso, sold by the bag.');

select pg_temp.seed_shop('Sample Coffee Bar', 'ubud', 'brewer', '{medium,dark}', '{espresso,batch-brew}', 'both', '{washed}', '{Sample Roastery,Highland Sample Roasters}', 74, 11,
  'Espresso and batch brew with beans from two Bali roasters.');
select pg_temp.seed_shop('Sample Filter House', 'canggu', 'brewer', '{light,medium}', '{manual,batch-brew}', 'local', '{washed}', '{Sample Bean Works}', 58, 9,
  'Pour over first, with a rotating filter menu.');
select pg_temp.seed_shop('Sample Espresso Corner', 'sanur', 'brewer', '{medium}', '{espresso}', 'foreign', '{washed}', '{Sample Dark Room}', 47, 8,
  'A standing espresso bar near the beach.');
select pg_temp.seed_shop('Sample Slow Bar', 'uluwatu', 'brewer', '{light}', '{manual,cold-brew,omakase}', 'both', '{experimental}', '{Sample Roast Lab}', 22, 2,
  'Six seats and a coffee omakase on weekends.');
select pg_temp.seed_shop('Sample Kopi Kuta', 'kuta', 'brewer', '{medium,dark}', '{espresso,cold-brew}', 'local', '{natural,washed}', '{Highland Sample Roasters}', 15, 6,
  'Local beans as espresso and cold brew.');
select pg_temp.seed_shop('Sample Morning Brew', 'denpasar', 'brewer', '{light,medium}', '{manual,batch-brew,espresso}', 'local', '{washed}', '{Sample Roastery}', 9, 1,
  'Opens early, with batch brew ready at the counter.');
select pg_temp.seed_shop('Sample Closed Cafe', 'sanur', 'brewer', '{medium}', '{espresso}', 'local', '{washed}', '{}', 3, 0,
  'Hidden from the public list. Used to check that hiding works.', true);
