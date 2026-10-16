-- Row Level Security. Visitors read the public directory and nothing else;
-- they write only through the vote and submit-shop Edge Functions, which use
-- the service role. Admins are users with a row in public.admins.

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()))
$$;

-- Start from nothing, then grant exactly what each role needs.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public directory: anyone reads; admins write.
-- ---------------------------------------------------------------------------

grant select on
  public.shops, public.shop_slug_redirects, public.roasters, public.shop_roasters, public.shop_preparations,
  public.areas, public.roast_levels, public.bean_origins, public.processing_methods, public.preparation_methods
to anon, authenticated;

-- No delete on shops: phase 1 has no hard delete, only hiding.
grant insert, update on public.shops to authenticated;
grant insert, update, delete on
  public.roasters, public.shop_roasters, public.shop_preparations,
  public.areas, public.roast_levels, public.bean_origins, public.processing_methods, public.preparation_methods
to authenticated;

create policy "Anyone reads visible shops; admins read all"
  on public.shops for select to anon, authenticated
  using (not is_hidden or (select public.is_admin()));

create policy "Admins add shops" on public.shops for insert to authenticated
  with check ((select public.is_admin()));
create policy "Admins edit shops" on public.shops for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

do $$
declare
  t text;
begin
  foreach t in array array[
    'roasters', 'shop_roasters', 'shop_preparations',
    'areas', 'roast_levels', 'bean_origins', 'processing_methods', 'preparation_methods'
  ] loop
    execute format('create policy "Anyone reads" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "Admins add" on public.%I for insert to authenticated with check ((select public.is_admin()))', t);
    execute format('create policy "Admins edit" on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format('create policy "Admins delete" on public.%I for delete to authenticated using ((select public.is_admin()))', t);
  end loop;
end;
$$;

-- Written only by the slug trigger; read by the shop page to redirect old links.
create policy "Anyone reads" on public.shop_slug_redirects for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Admin-only tables.
-- ---------------------------------------------------------------------------

grant select on public.shop_votes, public.shop_revisions, public.admins to authenticated;
grant select, update on public.shop_submissions to authenticated;

create policy "Admins read votes" on public.shop_votes for select to authenticated
  using ((select public.is_admin()));
create policy "Admins read history" on public.shop_revisions for select to authenticated
  using ((select public.is_admin()));
create policy "Admins read admins" on public.admins for select to authenticated
  using ((select public.is_admin()));
create policy "Admins read submissions" on public.shop_submissions for select to authenticated
  using ((select public.is_admin()));
create policy "Admins review submissions" on public.shop_submissions for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- rate_limit_events: no grants, no policies. Only security-definer functions touch it.

-- ---------------------------------------------------------------------------
-- Functions callable through the Data API.
-- ---------------------------------------------------------------------------

grant execute on function public.is_admin() to anon, authenticated;
