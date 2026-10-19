-- The shop card links straight to Google Maps, so search_shops returns the
-- shop's Maps link, and its address for a search when there is no link.
-- Adding columns changes the return type, which needs a drop and create.

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
    m.id, m.slug, m.name, m.description, m.address, m.maps_url, m.a_slug, m.a_label, m.type,
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
