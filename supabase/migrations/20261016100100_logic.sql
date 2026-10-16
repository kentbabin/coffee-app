-- Triggers that keep the schema honest: slugs, option checks, cached columns,
-- search text, change history and vote counters.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.slugify(value text)
returns text
language sql
stable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(value, ''))), '[^a-z0-9]+', '-', 'g'))
$$;

-- A slug for p_name that is free in p_table, adding -2, -3, ... when needed.
create function public.unique_slug(p_table regclass, p_name text, p_fallback text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_base text := coalesce(nullif(public.slugify(p_name), ''), p_fallback);
  v_candidate text := v_base;
  v_n integer := 1;
  v_taken boolean;
begin
  loop
    execute format('select exists (select 1 from %s where slug = $1)', p_table) into v_taken using v_candidate;
    exit when not v_taken;
    v_n := v_n + 1;
    v_candidate := v_base || '-' || v_n;
  end loop;
  return v_candidate;
end;
$$;

-- Raises if any value is not a slug in the given option list.
create function public.assert_options(p_values text[], p_list regclass, p_label text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_unknown text;
begin
  execute format('select v from unnest($1) as v where v not in (select slug from %s) limit 1', p_list)
    into v_unknown using p_values;
  if v_unknown is not null then
    raise exception 'Unknown %: "%"', p_label, v_unknown using errcode = 'foreign_key_violation';
  end if;
end;
$$;

-- The 90-day voting window. One place to tune it.
create function public.vote_window()
returns interval
language sql
immutable
as $$ select interval '90 days' $$;

-- ---------------------------------------------------------------------------
-- Option lists: generate a slug from the label on insert; never change it.
-- ---------------------------------------------------------------------------

create function public.options_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.slug, '') = '' then
      new.slug := public.slugify(new.label);
    end if;
  elsif new.slug is distinct from old.slug then
    raise exception 'An option''s slug cannot change. Rename its label instead.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Options held in arrays have no foreign key, so guard their deletion here.
create function public.options_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_in_use boolean;
begin
  if tg_table_name = 'roast_levels' then
    v_in_use := exists (select 1 from public.shops where old.slug = any (roast_levels));
  elsif tg_table_name = 'processing_methods' then
    v_in_use := exists (select 1 from public.shops where old.slug = any (processing))
      or exists (select 1 from public.roasters where old.slug = any (processing));
  end if;
  if v_in_use then
    raise exception '"%" is in use. Retire it instead of deleting it.', old.label using errcode = 'foreign_key_violation';
  end if;
  return old;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['roast_levels', 'bean_origins', 'processing_methods', 'preparation_methods', 'areas'] loop
    execute format('create trigger options_before_write before insert or update on public.%I for each row execute function public.options_before_write()', t);
  end loop;
  foreach t in array array['roast_levels', 'processing_methods'] loop
    execute format('create trigger options_before_delete before delete on public.%I for each row execute function public.options_before_delete()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Shops: slug, timestamps, option checks and search text.
-- ---------------------------------------------------------------------------

-- The fields an admin edits. Changes to anything else (vote counters, search,
-- audit columns) are not edits: they don't bump updated_at or write history.
create function public.shop_tracked_fields(s public.shops)
returns jsonb
language sql
immutable
as $$
  select to_jsonb(s) - array['upvotes', 'downvotes', 'score', 'search', 'created_at', 'created_by', 'updated_at', 'updated_by']
$$;

create function public.shops_before_write()
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
    || setweight(to_tsvector('simple', extensions.unaccent(coalesce(new.description, '') || ' ' || coalesce(v_roasters, ''))), 'C');

  return new;
end;
$$;

create trigger shops_before_write
  before insert or update on public.shops
  for each row execute function public.shops_before_write();

-- A changed slug leaves a redirect behind; a slug taken by a shop stops redirecting.
create function public.shops_slug_redirects()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.slug is distinct from old.slug then
    insert into public.shop_slug_redirects (slug, shop_id) values (old.slug, new.id)
    on conflict (slug) do update set shop_id = excluded.shop_id, created_at = now();
  end if;
  delete from public.shop_slug_redirects where slug = new.slug;
  return null;
end;
$$;

create trigger shops_slug_redirects
  after insert or update of slug on public.shops
  for each row execute function public.shops_slug_redirects();

-- ---------------------------------------------------------------------------
-- Change history. Every edit to a shop, through any code path, lands here.
-- Writes in one transaction merge into one revision.
-- ---------------------------------------------------------------------------

create function public.shops_record_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tx bigint := pg_current_xact_id()::text::bigint;
  v_new jsonb := public.shop_tracked_fields(new);
  v_old jsonb;
  v_diff jsonb := '{}';
  v_key text;
  v_action public.revision_action;
  v_existing public.shop_revisions;
  v_merged jsonb;
begin
  if tg_op = 'UPDATE' then
    v_old := public.shop_tracked_fields(old);
    if v_old = v_new then
      return null;
    end if;
    for v_key in select jsonb_object_keys(v_new) loop
      if v_new -> v_key is distinct from v_old -> v_key then
        v_diff := v_diff || jsonb_build_object(v_key, jsonb_build_object('from', v_old -> v_key, 'to', v_new -> v_key));
      end if;
    end loop;
  end if;

  v_action := case
    when tg_op = 'INSERT' then 'create'
    when new.is_hidden and not old.is_hidden then 'hide'
    when not new.is_hidden and old.is_hidden then 'unhide'
    else 'update'
  end;

  select * into v_existing from public.shop_revisions where shop_id = new.id and txid = v_tx for update;

  if not found then
    insert into public.shop_revisions (shop_id, txid, action, changed_by, changes, snapshot)
    values (new.id, v_tx, v_action, auth.uid(), v_diff, v_new);
    return null;
  end if;

  if v_existing.action = 'create' then
    -- Later writes in the creating transaction only fill in the snapshot.
    update public.shop_revisions set snapshot = v_new where id = v_existing.id;
    return null;
  end if;

  -- Keep each field's earliest "from" and latest "to"; drop fields that ended where they began.
  v_merged := v_existing.changes;
  for v_key in select jsonb_object_keys(v_diff) loop
    v_merged := v_merged || jsonb_build_object(v_key, jsonb_build_object(
      'from', coalesce(v_existing.changes -> v_key -> 'from', v_diff -> v_key -> 'from'),
      'to', v_diff -> v_key -> 'to'));
  end loop;
  select coalesce(jsonb_object_agg(k, v), '{}') into v_merged
  from jsonb_each(v_merged) as e (k, v)
  where v -> 'from' is distinct from v -> 'to';

  if v_merged = '{}' then
    delete from public.shop_revisions where id = v_existing.id;
  else
    update public.shop_revisions
    set changes = v_merged,
        snapshot = v_new,
        action = case when v_action in ('hide', 'unhide') then v_action else v_existing.action end
    where id = v_existing.id;
  end if;
  return null;
end;
$$;

create trigger shops_record_revision
  after insert or update on public.shops
  for each row execute function public.shops_record_revision();

-- ---------------------------------------------------------------------------
-- Cached join columns on shops.
-- ---------------------------------------------------------------------------

create function public.shop_preparations_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid := coalesce(new.shop_id, old.shop_id);
begin
  update public.shops
  set preparations = coalesce((
    select array_agg(pm.slug order by pm.sort_order, pm.slug)
    from public.shop_preparations sp
    join public.preparation_methods pm on pm.id = sp.preparation_id
    where sp.shop_id = v_shop
  ), '{}')
  where id = v_shop;
  return null;
end;
$$;

create trigger shop_preparations_sync
  after insert or update or delete on public.shop_preparations
  for each row execute function public.shop_preparations_sync();

create function public.shop_roasters_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid := coalesce(new.shop_id, old.shop_id);
begin
  update public.shops
  set roaster_ids = coalesce((
    select array_agg(r.id order by r.name, r.id)
    from public.shop_roasters sr
    join public.roasters r on r.id = sr.roaster_id
    where sr.shop_id = v_shop
  ), '{}')
  where id = v_shop;
  return null;
end;
$$;

create trigger shop_roasters_sync
  after insert or update or delete on public.shop_roasters
  for each row execute function public.shop_roasters_sync();

-- ---------------------------------------------------------------------------
-- Roasters
-- ---------------------------------------------------------------------------

create function public.roasters_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.slug, '') = '' then
      new.slug := public.unique_slug('public.roasters', new.name, 'roaster');
    end if;
  else
    new.slug := old.slug;
    new.updated_at := now();
  end if;
  perform public.assert_options(new.processing, 'public.processing_methods', 'processing method');
  return new;
end;
$$;

create trigger roasters_before_write
  before insert or update on public.roasters
  for each row execute function public.roasters_before_write();

-- Renaming a roaster or area changes the search text of shops that mention it.
-- Setting search to null makes shops_before_write recompute it; search is not
-- a tracked field, so no history is written.
create function public.areas_refresh_search()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.label is distinct from old.label then
    update public.shops set search = null where area_id = new.id;
  end if;
  return null;
end;
$$;

create function public.roasters_refresh_search()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.name is distinct from old.name then
    update public.shops set search = null
    where id in (select shop_id from public.shop_roasters where roaster_id = new.id);
  end if;
  return null;
end;
$$;

create trigger roasters_refresh_search
  after update on public.roasters
  for each row execute function public.roasters_refresh_search();

create trigger areas_refresh_search
  after update on public.areas
  for each row execute function public.areas_refresh_search();

-- ---------------------------------------------------------------------------
-- Vote counters: last 90 days only.
-- ---------------------------------------------------------------------------

create function public.refresh_shop_votes(p_shop_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.shops s
  set upvotes = c.up, downvotes = c.down, score = c.up - c.down
  from (
    select
      count(*) filter (where value = 1)::integer as up,
      count(*) filter (where value = -1)::integer as down
    from public.shop_votes
    where shop_id = p_shop_id and updated_at > now() - public.vote_window()
  ) c
  where s.id = p_shop_id and (s.upvotes, s.downvotes) is distinct from (c.up, c.down);
$$;

create function public.shop_votes_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_shop_votes(coalesce(new.shop_id, old.shop_id));
  return null;
end;
$$;

create trigger shop_votes_sync
  after insert or update or delete on public.shop_votes
  for each row execute function public.shop_votes_sync();

-- Nightly: age out votes older than the window, and clear old rate-limit rows.
create function public.refresh_vote_counters()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.shops s
  set upvotes = c.up, downvotes = c.down, score = c.up - c.down
  from (
    select
      sh.id,
      count(v.*) filter (where v.value = 1)::integer as up,
      count(v.*) filter (where v.value = -1)::integer as down
    from public.shops sh
    left join public.shop_votes v on v.shop_id = sh.id and v.updated_at > now() - public.vote_window()
    group by sh.id
  ) c
  where s.id = c.id and (s.upvotes, s.downvotes) is distinct from (c.up, c.down);

  delete from public.rate_limit_events where created_at < now() - interval '1 day';
$$;

create extension if not exists pg_cron;

-- 19:15 UTC is 03:15 in Bali.
select cron.schedule('refresh-vote-counters', '15 19 * * *', 'select public.refresh_vote_counters()');
