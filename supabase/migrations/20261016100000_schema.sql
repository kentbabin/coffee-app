-- Coffee App phase 1 schema: five admin-editable option lists, eight core tables,
-- and one internal table for rate limiting the public write functions.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Option lists (A7). Every list has the same shape so one admin screen edits
-- them all. Shops store option slugs; a slug never changes once created, so
-- renaming an option only changes its label.
-- ---------------------------------------------------------------------------

create table public.roast_levels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null check (length(trim(label)) between 1 and 60),
  sort_order integer not null default 0,
  is_retired boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.bean_origins (like public.roast_levels including all);
create table public.processing_methods (like public.roast_levels including all);
create table public.preparation_methods (like public.roast_levels including all);

create table public.areas (
  like public.roast_levels including all,
  region text not null default 'Bali' check (length(trim(region)) between 1 and 60)
);

-- ---------------------------------------------------------------------------
-- Shops
-- ---------------------------------------------------------------------------

create type public.shop_type as enum ('roaster', 'maker', 'both');

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  -- Generated from the name on insert, then fixed so shared links keep working.
  slug text not null unique,
  address text not null check (length(trim(address)) between 1 and 300),
  area_id uuid not null references public.areas (id),
  maps_url text check (maps_url ~* '^https?://'),
  lat numeric(9, 6) check (lat between -90 and 90),
  lng numeric(9, 6) check (lng between -180 and 180),
  type public.shop_type not null,
  roast_levels text[] not null default '{}' check (cardinality(roast_levels) >= 1),
  -- Copy of shop_preparations as slugs, kept in sync by trigger, so filters
  -- and change history read one row.
  preparations text[] not null default '{}',
  bean_origin text not null references public.bean_origins (slug),
  processing text[] not null default '{}' check (cardinality(processing) >= 1),
  -- Copy of shop_roasters, kept in sync by trigger, for the same reason.
  roaster_ids uuid[] not null default '{}',
  description text check (length(description) <= 600),
  website text check (website ~* '^https?://'),
  instagram text check (length(instagram) <= 60),
  -- Not used in phase 1 (open question 6); here so photos need no migration.
  cover_image_url text,
  is_hidden boolean not null default false,
  -- Vote counters over the last 90 days, maintained by trigger and nightly job.
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  score integer not null default 0,
  search tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create index shops_rank_idx on public.shops (score desc, (upvotes + downvotes) desc, name) where not is_hidden;
create index shops_area_idx on public.shops (area_id);
create index shops_roast_levels_idx on public.shops using gin (roast_levels);
create index shops_preparations_idx on public.shops using gin (preparations);
create index shops_processing_idx on public.shops using gin (processing);
create index shops_search_idx on public.shops using gin (search);
create index shops_name_trgm_idx on public.shops using gin (lower(name) extensions.gin_trgm_ops);

create table public.shop_preparations (
  shop_id uuid not null references public.shops (id) on delete cascade,
  preparation_id uuid not null references public.preparation_methods (id),
  primary key (shop_id, preparation_id)
);

create index shop_preparations_preparation_idx on public.shop_preparations (preparation_id);

-- ---------------------------------------------------------------------------
-- Roasters
-- ---------------------------------------------------------------------------

create table public.roasters (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  slug text not null unique,
  city text check (length(city) <= 80),
  processing text[] not null default '{}',
  website text check (website ~* '^https?://'),
  -- Set when the roaster is also a shop here (type roaster or both).
  shop_id uuid unique references public.shops (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shop_roasters (
  shop_id uuid not null references public.shops (id) on delete cascade,
  roaster_id uuid not null references public.roasters (id),
  primary key (shop_id, roaster_id)
);

create index shop_roasters_roaster_idx on public.shop_roasters (roaster_id);

-- ---------------------------------------------------------------------------
-- Community: votes and submissions
-- ---------------------------------------------------------------------------

create table public.shop_votes (
  shop_id uuid not null references public.shops (id) on delete cascade,
  voter_token uuid not null,
  ip_hash text not null,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (shop_id, voter_token)
);

create index shop_votes_window_idx on public.shop_votes (shop_id, updated_at);

create type public.submission_status as enum ('pending', 'approved', 'rejected');

create table public.shop_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  address text check (length(address) <= 300),
  area_text text check (length(area_text) <= 120),
  maps_url text check (maps_url ~* '^https?://'),
  notes text check (length(notes) <= 1000),
  submitter_email text check (length(submitter_email) <= 254),
  status public.submission_status not null default 'pending',
  -- Never shown publicly.
  rejection_reason text check (length(rejection_reason) <= 500),
  ip_hash text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  shop_id uuid references public.shops (id) on delete set null,
  created_at timestamptz not null default now(),
  check (coalesce(trim(address), '') <> '' or coalesce(trim(area_text), '') <> '')
);

create index shop_submissions_pending_idx on public.shop_submissions (created_at) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Change history (A4)
-- ---------------------------------------------------------------------------

create type public.revision_action as enum ('create', 'update', 'hide', 'unhide');

create table public.shop_revisions (
  id bigint generated always as identity primary key,
  shop_id uuid not null references public.shops (id) on delete cascade,
  -- One revision per shop per transaction: a save that touches the shop row
  -- and its join tables is recorded as one change.
  txid bigint not null,
  action public.revision_action not null,
  changed_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now(),
  -- {field: {from, to}}
  changes jsonb not null default '{}',
  -- The tracked row after the change, so "restore" can be added later.
  snapshot jsonb not null,
  unique (shop_id, txid)
);

create index shop_revisions_shop_idx on public.shop_revisions (shop_id, changed_at desc);

-- ---------------------------------------------------------------------------
-- Admins: a user is an admin if and only if a row exists.
-- ---------------------------------------------------------------------------

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Rate limiting for the public vote and submit functions. Internal only.
-- ---------------------------------------------------------------------------

create table public.rate_limit_events (
  id bigint generated always as identity primary key,
  bucket text not null,
  key text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_events_lookup_idx on public.rate_limit_events (bucket, key, created_at);
