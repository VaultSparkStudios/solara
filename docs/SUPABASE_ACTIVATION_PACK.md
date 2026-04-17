# Supabase Activation Pack

Purpose: turn Solara's prepared async world into a live shared system without changing game code.

## Required env vars

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Set them in local `.env.local` and in GitHub Actions secrets before expecting live leaderboard/grave/sun/echo behavior.

## Required tables / RPC

Run the SQL blocks in [context/LATEST_HANDOFF.md](/C:/Users/p4cka/documents/development/solara/context/LATEST_HANDOFF.md):

1. `daily_scores`
2. `graves`
3. `sun_state` plus `increment_death_counter()`
4. `player_echoes`
5. Echo reaction columns + RPC (SQL Block 5 below)

## SQL Block 5 — Echo Reaction Loop

Run this after activating `player_echoes` (Block 4):

```sql
alter table player_echoes
  add column if not exists commend_count int not null default 0,
  add column if not exists heed_count    int not null default 0,
  add column if not exists mourn_count   int not null default 0;

create or replace function react_to_echo(p_echo_id bigint, p_reaction text)
returns void language plpgsql security definer as $$
begin
  if p_reaction not in ('commend', 'heed', 'mourn') then
    raise exception 'Invalid echo reaction';
  end if;

  if p_reaction = 'commend' then
    update player_echoes set commend_count = commend_count + 1 where id = p_echo_id;
  elsif p_reaction = 'heed' then
    update player_echoes set heed_count = heed_count + 1 where id = p_echo_id;
  elsif p_reaction = 'mourn' then
    update player_echoes set mourn_count = mourn_count + 1 where id = p_echo_id;
  end if;
end;
$$;
```

## Public write trust rules

The client now sanitizes public shared-world writes before sending them, but Supabase must still enforce the same posture server-side:

- clamp `daily_scores.wave_reached` to the valid Daily Rite range
- clamp grave `x` / `y` to the map bounds and `wave_reached` to a non-negative range
- allow only `sunkeeper`, `eclipser`, or `neutral` faction values
- allow only `commend`, `heed`, or `mourn` reactions
- truncate public text fields and reject links / HTML-like payloads in names, epitaphs, headlines, and summaries
- add per-IP or per-session rate limits before public traffic grows
- keep moderation scripts for leaderboard rows, graves, and echoes

Concrete SQL starter: [docs/SUPABASE_PUBLIC_WRITE_HARDENING.sql](/C:/Users/p4cka/documents/development/solara/docs/SUPABASE_PUBLIC_WRITE_HARDENING.sql)

## Recommended RPC hardening sequence

Move public mutations behind validated functions before scaled traffic:

1. `submit_daily_score(payload jsonb)` validates name, faction, date seed, season, and clamps `wave_reached` to `0..30`.
2. `submit_grave(payload jsonb)` validates public text, clamps map coordinates to `0..99`, and records a moderated grave row.
3. `offer_sunstone(p_grave_id bigint, p_traveler_sigil text)` atomically increments offerings, prevents rapid duplicate offerings, and sets shrine flags at `50` and `200`.
4. `submit_player_echo(payload jsonb)` validates echo kind, public text, wave range, and per-sigil write limits.
5. `increment_death_counter()` remains the only way to mutate `sun_state.total_deaths` / brightness.

Each function should return the accepted public row or an explicit rejection reason so the client can show in-world feedback instead of failing silently.

Minimum table controls:

- enable RLS on every public shared-world table
- allow anonymous reads only for public-safe selected fields
- deny direct anonymous inserts/updates once RPCs are live
- add check constraints for faction, reaction kind, coordinate range, wave range, and text lengths
- add moderation columns: `is_hidden boolean default false`, `moderation_reason text`, `moderated_at timestamptz`
- add duplicate/rate-limit indexes around `traveler_sigil`, `date_seed`, `created_at`, and target IDs

## Public status exports

The repo now generates deterministic public-safe JSON for Studio Hub / Social Dashboard / Sparkfunnel style consumers:

- `/status.json` — compact current phase, ritual, director, mechanics, and AI policy
- `/chronicle.json` — richer public chronicle with top runs, graves, echoes, social hooks, and cached deterministic copy

These files deliberately report `browser_token_cost: 0`; paid AI generation should only be added as a server-side cached enhancement with hard budgets and deterministic fallbacks.

## Surfaces that activate immediately after setup

- Main game daily leaderboard
- Living Map grave persistence
- Shared sun brightness + death counter
- Async player echoes feed (with commend / heed / mourn reactions)
- Public archive page (`/archive.html`)
- Public sun widget (`/sun-widget.html`)
- Season chronicle page (`/chronicle.html`) — top runs, graves, echoes, sun state
- Discord bot slash commands
- Twitch extension panel

## Verification checklist

1. Start the app and confirm the menu reports live async services detected.
2. Run `npm run build`.
3. Run `npm run smoke`.
4. Run `npm run verify:supabase` to confirm public tables are readable and hardened RPCs are visible through the anon API.
5. Start a Daily Rite and confirm scores write through `submit_daily_score`.
6. Die once and confirm a grave record plus sun-state update.
7. Trigger an echo event and confirm `player_echoes` receives the record through `submit_player_echo`.

Current deployment note:

- `npm run verify:supabase` is non-mutating. It probes table reads and checks RPC existence with invalid/no-row inputs.
- If it reports `PGRST202`, the SQL in [docs/SUPABASE_PUBLIC_WRITE_HARDENING.sql](/C:/Users/p4cka/documents/development/solara/docs/SUPABASE_PUBLIC_WRITE_HARDENING.sql) has not yet been applied to the live Supabase project.

## Notes

- The repo already degrades gracefully when Supabase is absent; activation should not require additional feature flags.
- If one surface appears offline after setup, verify the anon key has read/write policy coverage for the expected table first.
