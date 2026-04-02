# Task Board

## Now — Agent can do immediately

- [SIL] Layout export/import — encode current layout config as a shareable string; paste to load a friend's layout
- [SIL] App.jsx pressure release — extract layout-manager constants/helpers as module-level constants without breaking the single-file rule

## Human Action Required

- [ ] **Complete the Supabase activation pack** — follow `docs/SUPABASE_ACTIVATION_PACK.md`, add live env vars/secrets, and run the SQL blocks so the shared-world systems stop falling back to local-only behavior
- [ ] **Run SQL Block 1 (`daily_scores`)** — execute the SQL in `context/LATEST_HANDOFF.md` to activate Phase 1 leaderboard storage
- [ ] **Run SQL Block 2 (`graves`)** — execute the SQL in `context/LATEST_HANDOFF.md` to activate Phase 2 grave storage and map persistence
- [ ] **Run SQL Block 3 (`sun_state`)** — execute the SQL in `context/LATEST_HANDOFF.md` to activate Phase 3 shared sun tracking and death counter RPC
- [ ] **Run SQL Block 4 (`player_echoes`)** — execute the SQL in `context/LATEST_HANDOFF.md` to activate cross-player async echoes
- [ ] **Run SQL Block 5 (echo reactions)** — run the ALTER TABLE + `react_to_echo` RPC SQL in `docs/SUPABASE_ACTIVATION_PACK.md` to enable commend/heed/mourn counts
- [ ] **Post the itch.io listing** — publish the game and devlog entry at itch.io/vaultsparkstudios to open the first real distribution channel
- [ ] **Deploy the Discord bot** — create the Discord app/token and host `discord-bot/` so the social distribution layer can run
- [ ] **Submit the Twitch extension** — submit `twitch-extension/` through the Twitch Developer Console to activate the stream-side surface

## Next — Agent (after Supabase is live)

- ✅ [SIL] Overlay layout presets — minimal / explorer / guided HUD layouts for quick interface switching
- ✅ [SIL] Draggable runtime overlays — let objective/ghost cards be drag-positioned, not only corner-anchored
- ✅ [UI Comfort] Custom layout slots + manager — named save/load layout profiles with dedicated modal
- ✅ [SIL] Season chronicle page — public current-season ledger combining top runs, recent graves, echoes, and sun milestones
- ✅ [SIL] Echo response loop — commend / heed / mourn reactions on echoes; local-first, Supabase-ready; SQL Block 5 in activation pack
- ✅ [Phase 5b] Prophecy Scroll PNG — canvas-drawn 400×600 image card generated on every death/roguelite run with download/share
- [SIL] Map-tied echo traces — render ghost echoes as faint spectral markers on the world map near death coordinates
- [SIL] Prophecy scroll in grave popup — mini scroll thumbnail alongside epitaph when clicking a grave on the world map
- [Phase 5] Season 1: The Wandering Comet config + launch prep
- [Phase 5b] Roguelite leaderboard — shared best-wave board parallel to the daily leaderboard
- [Phase 5b] Season leaderboard + season reset flow
- [Innovation #9] Player milestone push notifications (grave became Cairn/Shrine)
- [Innovation #10] Daily Rites historical archive (replay any past day's seed)
- [Innovation #16] Run of the Week community seed challenge
- [Innovation #17] Death heatmap weekly visual asset
- [Innovation #19] QR code on death screen linking to player's Archive grave
- [Innovation #20] Season End Legacy Certificate (generated PNG for season participants)

## Done

- ✅ [Completion Pass] Objective tracker — persistent on-screen pointer for current quest target / dungeon entrance / next meaningful step
- ✅ [UI Comfort] Objective tracker controls — tracker can now be hidden or moved to different screen corners instead of blocking gameplay
- ✅ [UI Comfort] Runtime settings expansion — persistent controls for music, tooltips, ghost cards, HUD density, and front-door reference shortcuts
- ✅ [UI Comfort] Top HUD readability pass — larger banner/action icons with hover descriptions across the runtime controls
- ✅ [Completion Pass] "First run today" tab pulse — gold glow on ☀️ Daily tab when daily not yet played
- ✅ [Completion Pass] Roguelite share card — generate share text on roguelite death
- ✅ [Completion Pass] Save-state validation — guard boot-critical refs/fields during load so stale saves cannot poison startup
- ✅ [Completion Pass] Ghost manifestations — recent async echoes now surface as runtime ghost cards, not only menu/settings memory
- ✅ [Completion Pass] Supabase activation pack — `docs/SUPABASE_ACTIVATION_PACK.md` centralizes the live backend checklist
- ✅ [Completion Pass] Public truth pass — `README.md` now reflects Solara instead of the stale Dunescape label
- ✅ [Phase 0] All Dunescape → Solara: Sunfall string replacements
- ✅ [Phase 0] Save migration shim (dunescape_save → solara_save, SAVE_VERSION 4→5)
- ✅ [Phase 0] OSRS IP cleanup (all location/NPC names replaced)
- ✅ [Phase 0] package.json, vite.config.js, index.html, deploy-pages.yml updated
- ✅ [Phase 1] mulberry32 PRNG + getDailySeed + getDayNumber
- ✅ [Phase 1] generateDailyRooms (30-wave seeded sequence, same for all players per day)
- ✅ [Phase 1] Daily dungeon integration (seeded rooms used when dailyRun active)
- ✅ [Phase 1] Wave-advance logic (clears dead dailyRun monsters, spawns next wave)
- ✅ [Phase 1] Death hook (records wave reached, generates share card, submits score)
- ✅ [Phase 1] generateShareCard (emoji share card with day, wave, faction, season)
- ✅ [Phase 1] src/supabase.js with graceful offline fallback
- ✅ [Phase 1] submitDailyScore + fetchDailyLeaderboard (Supabase, graceful no-op offline)
- ✅ [Phase 1] "☀️ Daily" tab — play button, wave progress bar, share card, leaderboard
- ✅ [Phase 2] Epitaph prompt modal on player death (input, 80-char limit, skip option)
- ✅ [Phase 2] submitGrave to Supabase on death
- ✅ [Phase 2] fetchGraves from Supabase — on mount + every 5 minutes, graceful offline
- ✅ [Phase 2] Render graves as ✝ markers on world map canvas
- ✅ [Phase 2] Grave click → epitaph popup card on world map
- ✅ [Phase 2] Shrine evolution — client-side is_shrine/is_major_shrine update at 50/200 offerings
- ✅ [Phase 3] fetchSunState + sunBrightness state (0–100, default 100)
- ✅ [Phase 3] Canvas desaturation filter tied to sunBrightness (saturate + sepia)
- ✅ [Phase 3] Sun brightness fetch on mount + every 5 minutes, graceful offline
- ✅ [Phase 3] increment_death_counter() wired to every player death (submitGrave)
- ✅ [Phase 3] HUD sun indicator: ☀N% with colour shift (gold→orange→red)
- ✅ [Runtime Rehab] Gameplay canvas now scales to the full gameplay viewport instead of staying fixed at native size
- ✅ [Runtime Rehab] Utility side panel can be collapsed with `Tab` / `☰` to prioritize gameplay space
- ✅ [Runtime Rehab] Quickstart overlay now explains controls, interaction model, and immediate next steps for new/returning players
- ✅ [Async World] Full-screen main menu / front door with Play, How To Play, Knowledge Base, Features, Update Log, and Settings
- ✅ [Async World] Persistent traveler identity layer — player name + sigil carried across menu and runtime
- ✅ [Async World] Starter loadout onboarding — fresh entries auto-equip the opening weapon/shield
- ✅ [Async World] Player echoes — local-first async shared-world stories with Supabase-ready `player_echoes` hook
- ✅ [Phase 4] Roguelite run mode — infinite waves, 17 rooms + boss, difficulty scaling, relic system
- ✅ [Phase 4] ROGUE_ROOMS pool (4 tiers × 4+ rooms + Shadow Drake boss every 10 waves)
- ✅ [Phase 4] scaleRogueMon — monster stats scale +6% per wave
- ✅ [Phase 4] RELICS system — 5 relics (Solar Fragment, Ember Ring, Shade Cloak, Comet Shard, Oracle's Eye)
- ✅ [Phase 4] Roguelite UI in Daily tab — start button, wave display, stats, relic inventory
- ✅ [Phase 4] Roguelite stats persisted in save (bestWave, totalRuns, relics)
- ✅ [SIL] Oracle NPC in The Sanctum with sun-mythology dialogue
- ✅ [SIL] Sunstone Shard starter item + HUD welcome message
- ✅ [SIL] Daily run streak counter in localStorage + display in Daily tab
- ✅ [SIL] Wave 30 boss seeded daily name (getDailyBossName)
- ✅ [SIL] Recent deaths ticker — new graves announced in chat on 5-minute refresh
- ✅ [SIL] Grave clustering — 💀 badge with count when ≥5 graves within 3 tiles
- ✅ [SIL] Oracle dialogue state machine — 4 threshold branches based on sunBrightness
- ✅ [SIL] Sunstone Shard offering mechanic — spend shard on grave
- ✅ [SIL] Shrine glow on world map — ✦ gold for ≥50 offerings, glow for ≥200
- ✅ [SIL] Milestone death announcements — HUD flash + chat at 100/500/1K/5K/10K/50K/100K
- ✅ [SIL] Sun pulse animation — HUD ☀ blinks faster as brightness drops (4s→0.7s)
- ✅ [SIL] Faction leaderboard split — grouped by Sunkeepers/Eclipsers/Unaligned
- ✅ [Innovation #1] Archive of the Fallen — public/archive.html (SEO-indexed grave browser)
- ✅ [Innovation #2] Oracle subscription UI — email subscribe in Daily tab, Supabase SQL in handoff
- ✅ [Innovation #3] Sun Observatory widget — public/sun-widget.html (embeddable iframe)
- ✅ [Innovation #4] Discord Bot — discord-bot/index.js (Solara Sun Bot)
- ✅ [Innovation #5] Faction Rivalry Dashboard — in Daily tab, live balance display
- ✅ [Innovation #6] Weekly State of Sun template — docs/templates/STATE_OF_SUN_WEEKLY.md
- ✅ [Innovation #7] Grave Clustering Auto-Landmark — 15+ graves → procedural landmark name on map
- ✅ [Innovation #8] Twitch Extension — twitch-extension/panel.html + manifest
- ✅ [Innovation #11] Prophetic Epitaph Generator — Suggest Prophecy button in epitaph modal
- ✅ [Innovation #12] Faction Recruitment Share Card — generateFactionShareCard() + share button
- ✅ [Innovation #13] Ambient audio system — phase-adaptive Web Audio API, tied to sunBrightness
- ✅ [Innovation #14] Sunfall Event Boss HP Tracker — section in Daily tab when sun < 10%
- ✅ [Innovation #15] Public Sun API — archive.html + widget both expose /sun state via Supabase public query
- ✅ [Maintenance] Fix startup TDZ crash in `src/App.jsx` by moving Supabase polling effects below `fetchGraves` / `fetchSunState` callback initialization
- ✅ [SIL] Add a lightweight boot smoke test for app mount + daily/roguelite startup flows
- ✅ Build passing ✅ (`575.91 KB` JS, `166.85 KB` gzipped)
