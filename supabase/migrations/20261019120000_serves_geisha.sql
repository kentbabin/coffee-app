-- Whether a shop has Geisha beans on offer: a yes/no on the shop, shown as a
-- tag on its card. Change history picks it up through shop_tracked_fields.

alter table public.shops add column serves_geisha boolean not null default false;

-- ---------------------------------------------------------------------------
-- save_shop: the same as before, plus serves_geisha. An update without it
-- keeps the shop's current value.
-- ---------------------------------------------------------------------------

create or replace function public.save_shop(
  p_shop jsonb,
  p_preparation_ids uuid[],
  p_roaster_ids uuid[] default '{}',
  -- Roasters added inline: [{name, city, processing: [...]}]
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
  v_new jsonb;
  v_new_id uuid;
  v_city text;
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

  -- Roasters added inline in the form.
  for v_new in select * from jsonb_array_elements(coalesce(p_new_roasters, '[]')) loop
    insert into public.roasters (name, city, processing)
    values (
      trim(v_new ->> 'name'),
      nullif(trim(v_new ->> 'city'), ''),
      array(select jsonb_array_elements_text(coalesce(v_new -> 'processing', '[]')))
    )
    returning id into v_new_id;
    v_roaster_ids := v_roaster_ids || v_new_id;
  end loop;

  -- A shop that also roasts appears in the roasters list through a linked record.
  if v_shop.type = 'both' then
    update public.roasters
    set name = v_shop.name, processing = v_shop.processing, website = coalesce(v_shop.website, website)
    where shop_id = v_shop.id;
    if not found then
      select label into v_city from public.areas where id = v_shop.area_id;
      insert into public.roasters (name, city, processing, website, shop_id)
      values (v_shop.name, v_city, v_shop.processing, v_shop.website, v_shop.id);
    end if;
  else
    update public.roasters set shop_id = null where shop_id = v_shop.id;
  end if;

  -- The roasters whose beans the shop serves.
  delete from public.shop_roasters where shop_id = v_shop.id and roaster_id <> all (v_roaster_ids);
  insert into public.shop_roasters (shop_id, roaster_id)
  select v_shop.id, r from unnest(v_roaster_ids) as r
  on conflict do nothing;

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

-- ---------------------------------------------------------------------------
-- search_shops: returns serves_geisha for the card's tag. Adding a column
-- changes the return type, which needs a drop and create.
-- ---------------------------------------------------------------------------

drop function public.search_shops(text, text[], text[], text, text[], public.shop_type, text[], integer, integer);

create function public.search_shops(
  p_query text default null,
  p_roast text[] default null,
  p_preparations text[] default null,
  p_bean_origin text default null,
  p_processing text[] default null,
  p_type public.shop_type default null,
  p_areas text[] default null,
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  name text,
  description text,
  address text,
  maps_url text,
  area_slug text,
  area_label text,
  type public.shop_type,
  serves_geisha boolean,
  roast_levels text[],
  preparations text[],
  bean_origin text,
  processing text[],
  upvotes integer,
  downvotes integer,
  score integer,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select
      lower(extensions.unaccent(nullif(trim(p_query), ''))) as raw,
      -- Every word as a prefix: "roast canggu" matches "Roastery" in Canggu.
      (
        select to_tsquery('simple', string_agg(quote_literal(w) || ':*', ' & '))
        from regexp_split_to_table(lower(extensions.unaccent(coalesce(p_query, ''))), '[^a-z0-9]+') as w
        where w <> ''
      ) as tsq
  ),
  matches as (
    select
      s.*,
      a.slug as a_slug,
      a.label as a_label,
      case
        when p.raw is null then 0
        else coalesce(ts_rank(s.search, p.tsq), 0) + extensions.word_similarity(p.raw, lower(s.name))
      end as rank
    from public.shops s
    join public.areas a on a.id = s.area_id
    cross join params p
    where not s.is_hidden
      and (
        p.raw is null
        or (p.tsq is not null and s.search @@ p.tsq)
        -- Typo tolerance on names: "sampel" finds "Sample".
        or extensions.word_similarity(p.raw, lower(s.name)) >= 0.45
      )
      and (coalesce(cardinality(p_roast), 0) = 0 or s.roast_levels && p_roast)
      and (coalesce(cardinality(p_preparations), 0) = 0 or s.preparations && p_preparations)
      and (coalesce(cardinality(p_processing), 0) = 0 or s.processing && p_processing)
      -- A single origin also shows shops with both local and imported beans.
      and (p_bean_origin is null or s.bean_origin = p_bean_origin or s.bean_origin = 'both')
      and (p_type is null or s.type = p_type)
      and (coalesce(cardinality(p_areas), 0) = 0 or a.slug = any (p_areas))
  )
  select
    m.id, m.slug, m.name, m.description, m.address, m.maps_url, m.a_slug, m.a_label, m.type, m.serves_geisha,
    m.roast_levels, m.preparations, m.bean_origin, m.processing,
    m.upvotes, m.downvotes, m.score,
    count(*) over () as total_count
  from matches m
  order by m.rank desc, m.score desc, (m.upvotes + m.downvotes) desc, m.name
  limit least(greatest(coalesce(p_limit, 24), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

revoke execute on function
  public.search_shops(text, text[], text[], text, text[], public.shop_type, text[], integer, integer)
from public, anon, authenticated;

grant execute on function
  public.search_shops(text, text[], text[], text, text[], public.shop_type, text[], integer, integer)
to anon, authenticated;
