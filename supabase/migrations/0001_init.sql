-- Creator Strategist — initial schema
-- Every table is owned by a user (user_id -> auth.users) and protected by RLS.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  creator_name text,
  primary_platform text check (primary_platform in ('x','linkedin','instagram','youtube','newsletter','other')),
  niche text,
  goals text,
  preferred_formats text[] not null default '{}',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------- platform connections
-- Extensible integration layer: one row per connected platform account.
-- Tokens are stored only server-side; the table has NO client-readable token column
-- (tokens live in `credentials`, which has no select policy for end users).
create table public.platform_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('x','linkedin')),
  handle text,
  status text not null default 'pending' check (status in ('pending','connected','error','revoked')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, platform)
);

create table public.platform_credentials (
  connection_id uuid primary key references public.platform_connections (id) on delete cascade,
  access_token text,
  refresh_token text,
  expires_at timestamptz
);

-- ------------------------------------------------------------- posts
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('x','linkedin','instagram','youtube','newsletter','other')),
  source text not null check (source in ('manual','url','csv','api')),
  external_id text,
  url text,
  content text not null check (char_length(content) between 1 and 25000),
  published_at timestamptz,
  -- Metrics are NULLABLE on purpose: null means "not available", never zero.
  likes integer check (likes is null or likes >= 0),
  comments integer check (comments is null or comments >= 0),
  reposts integer check (reposts is null or reposts >= 0),
  impressions integer check (impressions is null or impressions >= 0),
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
create index posts_user_published_idx on public.posts (user_id, published_at desc);
create unique index posts_user_external_idx on public.posts (user_id, platform, external_id) where external_id is not null;
create unique index posts_user_url_idx on public.posts (user_id, url) where url is not null;

-- Comments / audience replies attached to posts (optional import).
create table public.audience_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------- persisted AI outputs
-- kind: writing_dna | performance_patterns | content_gaps | audience
-- One current row per (user, kind); history kept via version.
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('writing_dna','performance_patterns','content_gaps','audience')),
  version integer not null default 1,
  posts_analysed integer not null default 0,
  result jsonb not null,
  model text,
  created_at timestamptz not null default now()
);
create index analyses_user_kind_idx on public.analyses (user_id, kind, created_at desc);

create table public.draft_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null,
  draft text not null check (char_length(draft) between 1 and 25000),
  result jsonb not null,
  -- suggestion ids the creator accepted; creator stays in control
  accepted_suggestions text[] not null default '{}',
  model text,
  created_at timestamptz not null default now()
);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text not null,
  hook text,
  angle text,
  rationale text,
  format text,
  status text not null default 'new' check (status in ('new','saved','dismissed','used')),
  batch_id uuid,
  created_at timestamptz not null default now()
);
create index ideas_user_idx on public.ideas (user_id, created_at desc);

-- ------------------------------------------------------- row level security
alter table public.profiles enable row level security;
alter table public.platform_connections enable row level security;
alter table public.platform_credentials enable row level security;
alter table public.posts enable row level security;
alter table public.audience_comments enable row level security;
alter table public.analyses enable row level security;
alter table public.draft_reviews enable row level security;
alter table public.ideas enable row level security;

create policy "own profile" on public.profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

create policy "own connections" on public.platform_connections for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- platform_credentials: intentionally NO policies => unreachable with the anon/user key.
-- Only the service role (server-side) can read/write tokens.

create policy "own posts" on public.posts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own audience comments" on public.audience_comments for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own analyses" on public.analyses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own draft reviews" on public.draft_reviews for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own ideas" on public.ideas for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Auto-create a profile row on signup.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
