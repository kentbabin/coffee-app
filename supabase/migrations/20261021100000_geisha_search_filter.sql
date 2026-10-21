-- Geisha beans in search and filters: a shop with Geisha beans matches the
-- search "geisha", and search_shops can filter to those shops.

-- ---------------------------------------------------------------------------
-- shops_before_write: the same as before, plus "geisha" in the search text
-- of shops that have Geisha beans on offer.
-- ---------------------------------------------------------------------------

create or replace function public.shops_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_area text;
  v_roasters text;
begin
  if tg_op = 'INSERT' then
    if coalesce(new.slug, '') = '' then
      new.slug := public.unique_slug('public.shops', new.name, 'shop');
    else
      new.slug := public.slugify(new.slug);
    end if;
    new.created_at := now();
    new.updated_at := now();
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
  else
    new.slug := coalesce(nullif(public.slugify(new.slug), ''), old.slug);
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    if public.shop_tracked_fields(new) is distinct from public.shop_tracked_fields(old) then
      new.updated_at := now();
      new.updated_by := auth.uid();
    else
      new.updated_at := old.updated_at;
      new.updated_by := old.updated_by;
    end if;
  end if;

  perform public.assert_options(new.roast_levels, 'public.roast_levels', 'roast level');
  perform public.assert_options(new.processing, 'public.processing_methods', 'processing method');

  select label into v_area from public.areas where id = new.area_id;
  select string_agg(name, ' ') into v_roasters from public.roasters where id = any (new.roaster_ids);

  -- 'simple' configuration: Postgres has no Indonesian dictionary.
  new.search :=
    setweight(to_tsvector('simple', extensions.unaccent(coalesce(new.name, ''))), 'A')
    || setweight(to_tsvector('simple', extensions.unaccent(coalesce(v_area, '') || ' ' || coalesce(new.address, ''))), 'B')
    || setweight(to_tsvector('simple', extensions.unaccent(
         coalesce(new.description, '') || ' ' || coalesce(v_roasters, '')
         || case when new.serves_geisha then ' geisha' else '' end
       )), 'C');

  return new;
end;
$$;

-- Rebuild the search text of shops that already have Geisha beans. search is
-- not a tracked field, so this writes no history and keeps updated_at.
update public.shops set search = null where serves_geisha;

-- ---------------------------------------------------------------------------
-- search_shops: a p_geisha filter. A new parameter changes the signature,
-- which needs a drop and create.
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
  p_offset integer default 0,
  -- True: only shops with Geisha beans on offer. Null or false: no filter.
  p_geisha boolean default null
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
      and (not coalesce(p_geisha, false) or s.serves_geisha)
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
  public.search_shops(text, text[], text[], text, text[], public.shop_type, text[], integer, integer, boolean)
from public, anon, authenticated;

grant execute on function
  public.search_shops(text, text[], text[], text, text[], public.shop_type, text[], integer, integer, boolean)
to anon, authenticated;
