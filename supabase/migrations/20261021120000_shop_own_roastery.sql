-- Roasters are no longer created from shops. A shop that roasts its own
-- beans (type both) can instead mark one of the roasters it links to as
-- its own roastery, so a group's roastery (Munduk Coffee, kyoto country
-- club) serves all of its shops under its own name.

-- ---------------------------------------------------------------------------
-- The link: shop_roasters.is_own marks a shop's own roastery.
-- ---------------------------------------------------------------------------

alter table public.shop_roasters add column is_own boolean not null default false;

-- Each roaster made from a shop becomes that shop's own roastery. The shop
-- triggers are off while the links go in, so this writes no history and
-- leaves updated_at alone; the link trigger still refreshes roaster_ids.
alter table public.shops disable trigger shops_before_write;
alter table public.shops disable trigger shops_record_revision;

insert into public.shop_roasters (shop_id, roaster_id, is_own)
select r.shop_id, r.id, true from public.roasters r where r.shop_id is not null
on conflict (shop_id, roaster_id) do update set is_own = true;

alter table public.shops enable trigger shops_before_write;
alter table public.shops enable trigger shops_record_revision;

-- The search text includes roaster names; rebuild it for those shops.
-- search is not a tracked field, so this writes no history either.
update public.shops set search = null
where id in (select shop_id from public.shop_roasters where is_own);

-- ---------------------------------------------------------------------------
-- Roasters lose their one-shop link. The directory view reads it, so it is
-- recreated without it.
-- ---------------------------------------------------------------------------

drop view public.roaster_directory;

alter table public.roasters drop column shop_id;

create view public.roaster_directory
with (security_invoker = true)
as
select
  r.id,
  r.slug,
  r.name,
  r.city,
  r.processing,
  r.website,
  (
    select count(*)
    from public.shop_roasters sr
    join public.shops s on s.id = sr.shop_id
    where sr.roaster_id = r.id and not s.is_hidden
  )::integer as shop_count
from public.roasters r;

grant select on public.roaster_directory to anon, authenticated;

-- ---------------------------------------------------------------------------
-- save_shop: no roaster is made from the shop. p_shop.own_roaster_id names
-- the shop's own roastery among existing roasters, or a roaster added
-- inline carries "own": true. Only a shop of type both has one.
-- ---------------------------------------------------------------------------

create or replace function public.save_shop(
  p_shop jsonb,
  p_preparation_ids uuid[],
  p_roaster_ids uuid[] default '{}',
  -- Roasters added inline: [{name, city, processing: [...], own?: boolean}]
  p_new_roasters jsonb default '[]',
  -- The updated_at the form loaded. A different value means someone else saved first.
  p_expected_updated_at timestamptz default null,
  -- Set when approving a submission: marks it approved and links the new shop.
  p_submission_id uuid default null
)
returns public.shops
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_shop ->> 'id', '')::uuid;
  v_current timestamptz;
  v_shop public.shops;
  v_roaster_ids uuid[] := coalesce(p_roaster_ids, '{}');
  v_own uuid;
  v_new jsonb;
  v_new_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can save shops.' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(cardinality(p_preparation_ids), 0) = 0 then
    raise exception 'Choose at least one preparation.' using errcode = 'check_violation';
  end if;

  if v_id is not null then
    select updated_at into v_current from public.shops where id = v_id for update;
    if not found then
      raise exception 'This shop no longer exists.' using errcode = 'no_data_found';
    end if;
    if p_expected_updated_at is not null and v_current <> p_expected_updated_at then
      raise exception 'Someone else saved this shop after you opened it. Reload the page to see their changes, then make yours again.'
        using errcode = 'CA409';
    end if;

    update public.shops set
      name = trim(p_shop ->> 'name'),
      -- Empty keeps the current slug (see shops_before_write).
      slug = nullif(trim(p_shop ->> 'slug'), ''),
      address = trim(p_shop ->> 'address'),
      area_id = (p_shop ->> 'area_id')::uuid,
      maps_url = nullif(trim(p_shop ->> 'maps_url'), ''),
      lat = (p_shop ->> 'lat')::numeric,
      lng = (p_shop ->> 'lng')::numeric,
      type = (p_shop ->> 'type')::public.shop_type,
      roast_levels = array(select jsonb_array_elements_text(coalesce(p_shop -> 'roast_levels', '[]'))),
      bean_origin = p_shop ->> 'bean_origin',
      processing = array(select jsonb_array_elements_text(coalesce(p_shop -> 'processing', '[]'))),
      serves_geisha = coalesce((p_shop ->> 'serves_geisha')::boolean, serves_geisha),
      description = nullif(trim(p_shop ->> 'description'), ''),
      website = nullif(trim(p_shop ->> 'website'), ''),
      instagram = nullif(trim(p_shop ->> 'instagram'), ''),
      is_hidden = coalesce((p_shop ->> 'is_hidden')::boolean, is_hidden)
    where id = v_id
    returning * into v_shop;
  else
    insert into public.shops (
      name, slug, address, area_id, maps_url, lat, lng, type,
      roast_levels, bean_origin, processing, serves_geisha, description, website, instagram, is_hidden
    ) values (
      trim(p_shop ->> 'name'),
      -- Empty generates one from the name.
      nullif(trim(p_shop ->> 'slug'), ''),
      trim(p_shop ->> 'address'),
      (p_shop ->> 'area_id')::uuid,
      nullif(trim(p_shop ->> 'maps_url'), ''),
      (p_shop ->> 'lat')::numeric,
      (p_shop ->> 'lng')::numeric,
      (p_shop ->> 'type')::public.shop_type,
      array(select jsonb_array_elements_text(coalesce(p_shop -> 'roast_levels', '[]'))),
      p_shop ->> 'bean_origin',
      array(select jsonb_array_elements_text(coalesce(p_shop -> 'processing', '[]'))),
      coalesce((p_shop ->> 'serves_geisha')::boolean, false),
      nullif(trim(p_shop ->> 'description'), ''),
      nullif(trim(p_shop ->> 'website'), ''),
      nullif(trim(p_shop ->> 'instagram'), ''),
      coalesce((p_shop ->> 'is_hidden')::boolean, false)
    )
    returning * into v_shop;
  end if;

  -- The shop's own roastery, when it roasts and one is named.
  if v_shop.type = 'both' then
    v_own := nullif(p_shop ->> 'own_roaster_id', '')::uuid;
  end if;

  -- Roasters added inline in the form; one may be the shop's own roastery.
  for v_new in select * from jsonb_array_elements(coalesce(p_new_roasters, '[]')) loop
    insert into public.roasters (name, city, processing)
    values (
      trim(v_new ->> 'name'),
      nullif(trim(v_new ->> 'city'), ''),
      array(select jsonb_array_elements_text(coalesce(v_new -> 'processing', '[]')))
    )
    returning id into v_new_id;
    v_roaster_ids := v_roaster_ids || v_new_id;
    if v_shop.type = 'both' and coalesce((v_new ->> 'own')::boolean, false) then
      v_own := v_new_id;
    end if;
  end loop;

  if v_own is not null then
    v_roaster_ids := v_roaster_ids || v_own;
  end if;

  -- The roasters whose beans the shop serves, its own roastery among them.
  delete from public.shop_roasters where shop_id = v_shop.id and roaster_id <> all (v_roaster_ids);
  insert into public.shop_roasters (shop_id, roaster_id, is_own)
  select distinct v_shop.id, r, (r = v_own) is true from unnest(v_roaster_ids) as r
  on conflict (shop_id, roaster_id) do update set is_own = excluded.is_own;

  delete from public.shop_preparations where shop_id = v_shop.id and preparation_id <> all (p_preparation_ids);
  insert into public.shop_preparations (shop_id, preparation_id)
  select v_shop.id, p from unnest(p_preparation_ids) as p
  on conflict do nothing;

  if p_submission_id is not null then
    update public.shop_submissions
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), shop_id = v_shop.id
    where id = p_submission_id and status = 'pending';
  end if;

  select * into v_shop from public.shops where id = v_shop.id;
  return v_shop;
end;
$$;
