# Current State

## Snapshot

- Date: 2026-04-01
- Overall status: Active development
- Current phase: Engagement tooling pass shipped — Season Chronicle page, Echo Response Loop (commend/heed/mourn), and Prophecy Scroll PNG image generator all live. Targeting the Engage gap (was 2.3/10 avg) with viral-sharing and community story surfaces.

## What exists

- systems: Full browser RPG (21 skills, combat, crafting, quests, pets, prestige, farming, dungeon, arena, factions, bestiary, daily challenges, offline progression)
- branding: Solara: Sunfall (Phase 0 complete)
- Phase 1 — Daily Rites: Seeded PRNG, 30-wave daily dungeon, wave tracking, daily share card generator, Supabase leaderboard client (graceful offline fallback)
- Phase 2 — Living Map: Epitaph modal on death, graves submitted to Supabase, ✝ markers on world map, grave click popup, shrine evolution at 50/200 offerings, 5-minute auto-refresh
- Phase 3 — Sun Phase Engine: sunBrightness state, fetchSunState (mount + 5-minute interval), canvas desaturation filter, increment_death_counter() wired to every death, HUD sun indicator with pulse animation, milestone death announcements, graceful offline fallback
- Phase 4 — Roguelite Engine: Infinite wave roguelite mode, 17 room pool (4 difficulty tiers) + boss every 10 waves, monster stat scaling (+6% per wave), 5-relic system with persistent bonuses, roguelite stats (bestWave, totalRuns, relics) persisted in save
- runtime stability: Boot regression fixed and protected by smoke coverage; stale/malformed save data is now sanitized on load/import before it reaches boot-critical refs
- runtime usability: Gameplay canvas now resizes to the actual gameplay viewport instead of staying trapped in a fixed `17x14` view; camera follow is clamped and centered correctly; utility panel collapses with `Tab` / `☰`; quickstart overlay explains controls; the objective tracker can now be hidden or moved between screen corners
- runtime customization: In-world settings now persist interface/audio preferences, including sound-effects mute, ambient-music mute, HUD density, hover tooltips, ghost visibility, objective visibility, menu-reference shortcuts, and tracker position
- layout control: Objective tracker and ghost stack are draggable, resettable, and hideable; players can switch between Guided / Minimal / Explorer presets or save/load three named custom layouts through the new layout manager modal
- engagement layer: Season Chronicle (`public/chronicle.html`) combines top runs, graves, echoes, and sun state in one discoverable page; echo reaction loop (commend/heed/mourn) surfaces strongest async stories; Prophecy Scroll PNG canvas generator produces a shareable 400×600 image card on every death and roguelite run
- HUD pass: The top banner and runtime icon strip are larger, more readable, and carry hover descriptions so the action cluster is self-explanatory instead of relying on guesswork
- front door: Full-screen title/menu flow exists before runtime entry, with Play / How To Play / Knowledge Base / Features / Update Log / Settings framing the async shared-world premise
- identity: Persistent traveler name + sigil exist locally and are applied to the player profile; starter loadout auto-equips on fresh entry
- echoes: Async player echoes record major run/death events locally and attempt Supabase sync through `player_echoes`; runtime now surfaces recent echoes as visible ghost manifestations instead of menu-only memory
- daily nudges: Daily tab now pulses when the current day’s rite has not been played; roguelite runs now generate their own share card on death
- activation prep: README truth pass completed and `docs/SUPABASE_ACTIVATION_PACK.md` now centralizes the backend activation checklist for the shared-world stack
- SIL items: Oracle NPC, Sunstone Shard, daily streak, seeded boss name, deaths ticker, grave clustering, Oracle dialogue state machine, Sunstone offering mechanic, shrine glow on map, milestone death announcements, sun pulse animation, faction leaderboard split, objective tracker, daily tab pulse, roguelite share card, save-state validation, season chronicle page, echo response loop (commend/heed/mourn), Prophecy Scroll PNG generator
- Innovation Sprint (2026-03-27): 13 items shipped — landmark auto-naming, faction share card, prophetic epitaph suggestions, ambient audio system (Web Audio API), faction rivalry dashboard in Daily tab, Oracle email subscription UI, Sunfall Event boss HP tracker, Archive of the Fallen (`public/archive.html`), Sun Observatory widget (`public/sun-widget.html`), Discord Bot (`discord-bot/`), Twitch Extension (`twitch-extension/`), Weekly State of Sun template
- save: `solara_save` key, `SAVE_VERSION=5`, migration shim active, import/export path now sanitizes boot-critical fields
- build: Passing (`606.08 KB` JS, `175.50 KB` gzip) with build + smoke verified after the engagement tooling pass

## Important paths

- Main game: `src/App.jsx` (~3919 lines — do NOT split until 5000 lines)
- Season Chronicle: `public/chronicle.html`
- Supabase client: `src/supabase.js`
- Supabase activation guide: `docs/SUPABASE_ACTIVATION_PACK.md`
- Archive of the Fallen: `public/archive.html`
- Sun Observatory widget: `public/sun-widget.html`
- Discord bot: `discord-bot/index.js` (run separately, needs discord.js + .env)
- Twitch extension: `twitch-extension/panel.html` + `manifest.json`
- Weekly digest template: `docs/templates/STATE_OF_SUN_WEEKLY.md`
- Env template: `.env.local`
- Build output: `dist/`

## In progress

- active work: External activation runway plus runtime comfort pass follow-through — shared-world backend go-live, richer public season surfaces, deeper async echo interaction, and quality-of-life UI refinement

## Blockers

- Supabase activation is still not complete — social systems, archive, widget, and bot remain local/offline-safe until Carter runs the live setup
- Itch.io listing — Carter must post manually
- Discord bot deployment — Carter must create Discord app + token + host separately
- Twitch extension submission — Carter must submit via Twitch Developer Console

## Next 3 moves

1. Carter: Complete the backend checklist in `docs/SUPABASE_ACTIVATION_PACK.md` and run all shared-world SQL blocks (1–5)
2. Agent: Layout export/import — shareable UI layout presets (promote from Next to Now)
3. Agent: App.jsx pressure release — extract layout-manager config/helpers as module-level constants
