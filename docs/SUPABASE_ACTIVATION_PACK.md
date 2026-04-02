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
4. Start a Daily Rite and confirm scores write to `daily_scores`.
5. Die once and confirm a grave record plus sun-state update.
6. Trigger an echo event and confirm `player_echoes` receives the record.

## Notes

- The repo already degrades gracefully when Supabase is absent; activation should not require additional feature flags.
- If one surface appears offline after setup, verify the anon key has read/write policy coverage for the expected table first.
