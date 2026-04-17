-- Solara public shared-world write hardening
-- Proprietary - All Rights Reserved, VaultSpark Studios LLC.
--
-- Purpose:
--   Mirror the browser trust rules server-side before public traffic scales.
--   Run after the base Solara shared-world tables exist.
--
-- Expected public tables:
--   daily_scores, graves, sun_state, player_echoes

create or replace function public.solara_clean_public_text(
  p_value text,
  p_max_len int,
  p_fallback text
)
returns text
language plpgsql
immutable
as $$
declare
  v text := trim(coalesce(p_value, p_fallback, ''));
begin
  v := regexp_replace(v, '\s+', ' ', 'g');
  v := replace(replace(replace(v, '<', ''), '>', ''), '`', '');

  if v = '' then
    v := p_fallback;
  end if;

  if v ~* '(https?://|www\.|discord\.gg|\.ru/|\.zip\b|\.exe\b)' then
    v := p_fallback;
  end if;

  return left(v, greatest(1, p_max_len));
end;
$$;

create or replace function public.solara_normalize_faction(p_value text)
returns text
language sql
immutable
as $$
  select case
    when p_value in ('sunkeeper', 'eclipser', 'neutral') then p_value
    else 'neutral'
  end;
$$;

alter table public.daily_scores
  add column if not exists traveler_sigil text not null default 'NO-SIGIL',
  add column if not exists is_hidden boolean not null default false,
  add column if not exists moderation_reason text,
  add column if not exists moderated_at timestamptz;

alter table public.graves
  add column if not exists traveler_sigil text not null default 'NO-SIGIL',
  add column if not exists is_hidden boolean not null default false,
  add column if not exists moderation_reason text,
  add column if not exists moderated_at timestamptz,
  add column if not exists sunstone_offerings int not null default 0,
  add column if not exists is_shrine boolean not null default false,
  add column if not exists is_major_shrine boolean not null default false;

alter table public.player_echoes
  add column if not exists traveler_sigil text not null default 'NO-SIGIL',
  add column if not exists is_hidden boolean not null default false,
  add column if not exists moderation_reason text,
  add column if not exists moderated_at timestamptz,
  add column if not exists commend_count int not null default 0,
  add column if not exists heed_count int not null default 0,
  add column if not exists mourn_count int not null default 0;

alter table public.daily_scores enable row level security;
alter table public.graves enable row level security;
alter table public.sun_state enable row level security;
alter table public.player_echoes enable row level security;

drop policy if exists "solara_public_daily_scores_read" on public.daily_scores;
create policy "solara_public_daily_scores_read"
on public.daily_scores
for select
to anon
using (coalesce(is_hidden, false) = false);

drop policy if exists "solara_public_graves_read" on public.graves;
create policy "solara_public_graves_read"
on public.graves
for select
to anon
using (coalesce(is_hidden, false) = false);

drop policy if exists "solara_public_sun_state_read" on public.sun_state;
create policy "solara_public_sun_state_read"
on public.sun_state
for select
to anon
using (true);

drop policy if exists "solara_public_player_echoes_read" on public.player_echoes;
create policy "solara_public_player_echoes_read"
on public.player_echoes
for select
to anon
using (coalesce(is_hidden, false) = false);

-- Once RPCs below are deployed, anonymous direct writes should be denied.
drop policy if exists "solara_deny_anon_daily_scores_write" on public.daily_scores;
create policy "solara_deny_anon_daily_scores_write"
on public.daily_scores
for insert
to anon
with check (false);

drop policy if exists "solara_deny_anon_graves_write" on public.graves;
create policy "solara_deny_anon_graves_write"
on public.graves
for insert
to anon
with check (false);

drop policy if exists "solara_deny_anon_player_echoes_write" on public.player_echoes;
create policy "solara_deny_anon_player_echoes_write"
on public.player_echoes
for insert
to anon
with check (false);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'daily_scores_wave_reached_bounds') then
    alter table public.daily_scores add constraint daily_scores_wave_reached_bounds check (wave_reached between 0 and 30);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'daily_scores_faction_known') then
    alter table public.daily_scores add constraint daily_scores_faction_known check (faction in ('sunkeeper', 'eclipser', 'neutral'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'graves_position_bounds') then
    alter table public.graves add constraint graves_position_bounds check (x between 0 and 99 and y between 0 and 99);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'graves_wave_reached_bounds') then
    alter table public.graves add constraint graves_wave_reached_bounds check (wave_reached between 0 and 999);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'graves_faction_known') then
    alter table public.graves add constraint graves_faction_known check (faction in ('sunkeeper', 'eclipser', 'neutral'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'graves_offerings_nonnegative') then
    alter table public.graves add constraint graves_offerings_nonnegative check (sunstone_offerings >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'player_echoes_kind_known') then
    alter table public.player_echoes add constraint player_echoes_kind_known check (kind in ('death', 'death_memory', 'roguelite', 'daily', 'oracle', 'milestone'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'player_echoes_wave_reached_bounds') then
    alter table public.player_echoes add constraint player_echoes_wave_reached_bounds check (wave_reached between 0 and 999);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'player_echoes_faction_known') then
    alter table public.player_echoes add constraint player_echoes_faction_known check (faction in ('sunkeeper', 'eclipser', 'neutral'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'player_echoes_reaction_counts_nonnegative') then
    alter table public.player_echoes add constraint player_echoes_reaction_counts_nonnegative check (commend_count >= 0 and heed_count >= 0 and mourn_count >= 0);
  end if;
end;
$$;

create index if not exists daily_scores_date_wave_idx on public.daily_scores (date_seed, wave_reached desc);
create index if not exists daily_scores_sigil_recent_idx on public.daily_scores (traveler_sigil, created_at desc);
create index if not exists graves_season_recent_idx on public.graves (season, created_at desc);
create index if not exists graves_sigil_recent_idx on public.graves (traveler_sigil, created_at desc);
create index if not exists player_echoes_recent_idx on public.player_echoes (created_at desc);
create index if not exists player_echoes_sigil_recent_idx on public.player_echoes (traveler_sigil, created_at desc);

create or replace function public.submit_daily_score(payload jsonb)
returns public.daily_scores
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted public.daily_scores;
  v_sigil text := solara_clean_public_text(payload->>'traveler_sigil', 24, 'NO-SIGIL');
  v_recent_count int;
begin
  select count(*)
    into v_recent_count
  from public.daily_scores
  where traveler_sigil = v_sigil
    and date_seed = left(coalesce(payload->>'date_seed', ''), 32)
    and created_at > now() - interval '10 minutes';

  if v_recent_count >= 5 then
    raise exception 'Daily score rate limit exceeded';
  end if;

  insert into public.daily_scores (
    player_name,
    traveler_sigil,
    wave_reached,
    faction,
    date_seed,
    season
  )
  values (
    solara_clean_public_text(payload->>'player_name', 16, 'Adventurer'),
    upper(v_sigil),
    least(30, greatest(0, floor(coalesce((payload->>'wave_reached')::numeric, 0))::int)),
    solara_normalize_faction(payload->>'faction'),
    left(coalesce(payload->>'date_seed', ''), 32),
    greatest(1, floor(coalesce((payload->>'season')::numeric, 1))::int)
  )
  returning * into accepted;

  return accepted;
end;
$$;

create or replace function public.submit_grave(payload jsonb)
returns public.graves
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted public.graves;
  v_sigil text := solara_clean_public_text(payload->>'traveler_sigil', 24, 'NO-SIGIL');
  v_recent_count int;
begin
  select count(*)
    into v_recent_count
  from public.graves
  where traveler_sigil = v_sigil
    and created_at > now() - interval '5 minutes';

  if v_recent_count >= 3 then
    raise exception 'Grave rate limit exceeded';
  end if;

  insert into public.graves (
    player_name,
    traveler_sigil,
    epitaph,
    x,
    y,
    faction,
    wave_reached,
    season,
    date_seed
  )
  values (
    solara_clean_public_text(payload->>'player_name', 16, 'Adventurer'),
    upper(v_sigil),
    solara_clean_public_text(payload->>'epitaph', 80, 'They fell without words.'),
    least(99, greatest(0, floor(coalesce((payload->>'x')::numeric, 20))::int)),
    least(99, greatest(0, floor(coalesce((payload->>'y')::numeric, 28))::int)),
    solara_normalize_faction(payload->>'faction'),
    least(999, greatest(0, floor(coalesce((payload->>'wave_reached')::numeric, 0))::int)),
    greatest(1, floor(coalesce((payload->>'season')::numeric, 1))::int),
    left(coalesce(payload->>'date_seed', ''), 32)
  )
  returning * into accepted;

  return accepted;
end;
$$;

create or replace function public.submit_player_echo(payload jsonb)
returns public.player_echoes
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted public.player_echoes;
  v_sigil text := solara_clean_public_text(payload->>'traveler_sigil', 24, 'NO-SIGIL');
  v_kind text := coalesce(payload->>'kind', 'oracle');
  v_recent_count int;
begin
  if v_kind not in ('death', 'death_memory', 'roguelite', 'daily', 'oracle', 'milestone') then
    v_kind := 'oracle';
  end if;

  select count(*)
    into v_recent_count
  from public.player_echoes
  where traveler_sigil = v_sigil
    and created_at > now() - interval '5 minutes';

  if v_recent_count >= 5 then
    raise exception 'Echo rate limit exceeded';
  end if;

  insert into public.player_echoes (
    player_name,
    traveler_sigil,
    kind,
    headline,
    summary,
    wave_reached,
    faction,
    season,
    date_seed
  )
  values (
    solara_clean_public_text(payload->>'player_name', 16, 'Adventurer'),
    upper(v_sigil),
    v_kind,
    solara_clean_public_text(payload->>'headline', 96, 'An echo stirred in Solara.'),
    solara_clean_public_text(payload->>'summary', 420, 'The world remembers.'),
    least(999, greatest(0, floor(coalesce((payload->>'wave_reached')::numeric, 0))::int)),
    solara_normalize_faction(payload->>'faction'),
    greatest(1, floor(coalesce((payload->>'season')::numeric, 1))::int),
    left(coalesce(payload->>'date_seed', ''), 32)
  )
  returning * into accepted;

  return accepted;
end;
$$;

create or replace function public.offer_sunstone(p_grave_id text, p_traveler_sigil text)
returns public.graves
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted public.graves;
begin
  update public.graves
  set
    sunstone_offerings = least(999999, coalesce(sunstone_offerings, 0) + 1),
    is_shrine = coalesce(is_shrine, false) or coalesce(sunstone_offerings, 0) + 1 >= 50,
    is_major_shrine = coalesce(is_major_shrine, false) or coalesce(sunstone_offerings, 0) + 1 >= 200
  where id::text = p_grave_id
    and coalesce(is_hidden, false) = false
  returning * into accepted;

  if accepted.id is null then
    raise exception 'Grave not found';
  end if;

  return accepted;
end;
$$;

create or replace function public.react_to_echo(p_echo_id text, p_reaction text)
returns public.player_echoes
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted public.player_echoes;
begin
  if p_reaction not in ('commend', 'heed', 'mourn') then
    raise exception 'Invalid echo reaction';
  end if;

  update public.player_echoes
  set
    commend_count = commend_count + case when p_reaction = 'commend' then 1 else 0 end,
    heed_count = heed_count + case when p_reaction = 'heed' then 1 else 0 end,
    mourn_count = mourn_count + case when p_reaction = 'mourn' then 1 else 0 end
  where id::text = p_echo_id
    and coalesce(is_hidden, false) = false
  returning * into accepted;

  if accepted.id is null then
    raise exception 'Echo not found';
  end if;

  return accepted;
end;
$$;
