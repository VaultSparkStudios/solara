# Task Board

Public-safe roadmap only. Detailed backlog sequencing is maintained privately.

## Now

- keep the public repo deployable and public-safe
- validate the identity-safe canon, shared-world trust pass, and audit-derived quality bar
- keep CI, smoke coverage, and tests aligned with shipped runtime behavior
- continue the modular extraction pass from `src/App.jsx`
- harden the user feedback loop so the game always states the best next action
- turn shared-world pressure, ritual state, rivals, and prophecy into clearer player-facing guidance
- keep client-side trust rules mirrored in eventual Supabase server enforcement
- migrate shared-world client writes to RPC-first calls with table-write fallback until production Supabase is fully hardened
- ship the audit-derived UX/system tranche in executable slices: security, Director depth, world feed, debrief intelligence, Studio integrations, and deterministic AI/token policy
- convert shared-world summaries and run debrief logic into reusable modules/components
- keep the public repo free of private Studio OS operating procedures while exposing public-safe integration schemas
- turn world-feed items into action targets so feedback can route players to the right tab, map objective, or run loop

## Next

- extract canvas/world loop, player actions, combat, inventory/economy, daily/roguelite runs, runtime panels, and end-of-run presentation out of `src/App.jsx`
- extend browser-level smoke coverage beyond startup into movement/combat/save/import-export flows
- connect ritual, rival, prophecy, and death-memory fields to Supabase schemas where available
- add server-side Supabase enforcement for public writes: RLS, RPC validation, constraints, rate limits, and moderation-safe flows
- turn Sun Director modifiers into deeper seeded Daily Rite mechanics and authored encounter variants
- evolve the world map into a strategic layer for graves, shrines, rituals, directives, and rival routes
- deepen progression with faction identity, relic loadouts, shrine attunements, and stronger run consequences
- improve first-load speed with more aggressive code splitting and deferred shared-world loading
- improve accessibility and readability with larger default text, cleaner HUD hierarchy, and stronger mobile/touch affordances
- add telemetry-lite balancing hooks for onboarding drop-off, ignored systems, and dead-content zones
- add a player-facing session delta layer so the world explains what changed since the last login
- replace browser-native alert/confirm UX with in-world modal flows for import/reset/high-risk actions
- expand debrief surfaces into full daily/roguelite post-run intelligence screens
- add more chunking around menu/status/debrief surfaces to keep startup lean
- add async ghost companion / rival invasion behavior from trusted echo records
- convert grave constellations into map objectives with shrine bargains, faction contests, and visible route value
- add first-session "first myth" onboarding that reaches a shared-world consequence within five minutes
- version Studio Hub / Social Dashboard / Sparkfunnel JSON contracts and include conversion / retention event hints
- add deterministic content-intelligence fallbacks before any paid server-side AI summary work
- resolve the current dirty/untracked worktree into an intentional baseline before the next large refactor
- make Daily Rite generation consume Director encounter/reward/shrine/rival plans directly
- add browser-level gameplay smoke coverage for first route, combat/death, grave, offering, and save import/export
- continue converting smoke coverage into browser-level validation when a browser runner is added; current smoke now verifies first-session, objective, and world-feed data contracts
- deploy `docs/SUPABASE_PUBLIC_WRITE_HARDENING.sql` to the live Supabase project with owner/service credentials, then rerun `npm run verify:supabase`
- add GitHub repo secrets `SUPABASE_DB_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`, then run the manual Supabase Hardening workflow
- rerun Supabase Hardening workflow after secrets are present; run `24576797263` confirmed the workflow path but failed because secrets were blank

## Combined Top Recommendations

- modularize `src/App.jsx` first; this is the highest-leverage technical prerequisite
- make the async shared world the real meta-game through rituals, constellations, rivals, and seasonal directives with visible consequences
- improve first-session onboarding and HUD hierarchy so players reach a meaningful shared-world payoff quickly
- strengthen the feedback loop so every major action explains personal gain, communal impact, and the next best move
- secure shared-world writes with server-enforced Supabase protections, not client trust alone
- reduce initial bundle cost and polling overhead to improve load time and runtime efficiency
- expand authored run depth through encounter choices, shrine bargains, prophecy decisions, and rival intrusions
- add stronger save resilience, migration visibility, and import/export recovery UX
- improve accessibility, control clarity, and device adaptability
- add broader tests around save migration, deterministic daily generation, ritual/rival logic, and shared-world boundaries
- introduce a persistent world briefing and debrief layer so major actions explain impact, consequence, and next move
- add observability hooks for suspicious public-write patterns and progression anomalies
- fix the smoke harness so CI can validate app startup without direct Node `.jsx` loader failures
- add a session-delta layer that summarizes the latest run, world pressure, ritual progress, rival signal, live-link status, and next best move
- keep AI/token work deterministic-first: only add paid generation behind cached server-side summaries with hard budgets and non-generative fallbacks
- publish deterministic `status.json` / `chronicle.json` snapshots for Studio Hub, Social Dashboard, Sparkfunnel, Discord, Twitch, and public embeds
- convert Sun Director text modifiers into reusable gameplay mechanic plans before deeper runtime integration
- add versioned save migration reports before touching higher-risk import/reset UX
- wire Sun Director mechanics into runtime price/enemy scaling and active run feedback
- replace browser-native confirm/alert flows with in-world modal feedback for destructive or high-risk actions
- extract save payload creation from `src/App.jsx` and expand smoke coverage into save/import validation

## Implemented Ideas

- Identity-safe canon pass
- Shared-world trust layer
- First Five Minutes route guidance
- Sun Director 2.0 foundation
- Sun Crisis Director
- Echo Rival System
- Grave Constellations
- Community Rituals
- Prophecy Deck
- Death Memory Cards
- CI now expected to run tests as well as build/smoke
- public-safe audit roadmap captured in repo memory
- storage and objective/guide logic extraction started with dedicated game modules
- Daily Rite UI now surfaces clearer best-next-action guidance from shared-world state
- shared-world Supabase/local persistence extraction started with a dedicated service module
- objective guidance now has direct test coverage for ritual/rival priority selection
- Supabase now lazy-loads instead of being eagerly imported on startup
- shared-world service tests now cover shrine-threshold updates and echo reaction acceptance rules
- shared-world briefing synthesis extracted into `src/game/feedback.js`
- reusable `SharedWorldStatus` and `RunDebriefCard` components started to pull status/debrief UI out of `src/App.jsx`
- Daily Rite and front-door status surfaces now share the same world-briefing logic
- run-end cards now explain impact and the next best action instead of only showing a score card
- smoke harness now stubs display-only JSX components while it rewrites the app for Node-based startup checks
- session-delta synthesis now lives in `src/game/feedback.js` with test coverage and reusable UI via `SessionDeltaCard`
- front-door and Daily Rite surfaces now show a concise world/session delta alongside the broader shared-world briefing
- public `status.json` and `chronicle.json` generation added through a deterministic build script with zero browser token cost
- Sun Director mechanics now expose encounter bias, reward bias, shrine/rival weighting, scaling, and telemetry tags for later runtime integration
- save migration now reports restored modern fields and normalizes saves to the current save version
- Supabase activation docs now specify the recommended RPC/RLS hardening sequence for public shared-world writes
- Sun Director mechanics now affect merchant pricing and monster world scaling through `worldRuntime`
- Daily/Roguelite starts now record and explain active Director tuning: enemy scale, reward multiplier, and rival pressure
- run debrief cards now include impact highlights and share-oriented session prompts
- save payload creation is centralized in `src/game/save.js` instead of duplicated inside `src/App.jsx`
- import/reset/prestige/Ironman flows now use Solara in-world modals instead of native browser `alert` / `confirm`
- smoke coverage now validates save and import sanitization paths in addition to startup and run initialization
- public chronicle exports now include Studio Hub, Social Dashboard, and Sparkfunnel integration hints
- audit-derived implementation plan captured in public-safe task board memory
- public write hardening SQL starter added for Supabase RPC/RLS/constraint/rate-limit activation
- deterministic AI/token policy now lives in a reusable module and keeps browser token cost at zero by default
- public chronicle now exports world feed, intelligence digest, integration contract, and telemetry-lite schema data
- runtime Daily Rite and front-door surfaces now include a compact World Feed card
- run debriefs now separate personal gain, world contribution, and Director guidance
- next highest-impact implementation list captured: RPC writes, worktree baseline, App.jsx extraction, interactive world feed, grave-map objectives, Director-driven Daily Rites, browser smoke, first myth onboarding, moderation outputs, and bundle splitting
- constellation objective planning added as a reusable map-objective layer for grave clusters, offerings, shrine progress, and landmark rewards
- first-session "First Myth" planner added for equip, Mara, hearth, and Daily Rite activation flow
- smoke harness now exports and validates first-session plan, objective state, and actionable world-feed entries
- Supabase hardening verification script added as `npm run verify:supabase`; current live probe confirms public reads but reports missing hardened RPCs until SQL is applied
- manual Supabase Hardening GitHub Actions workflow added; it applies the hardening SQL and verifies it once deploy-capable secrets exist

## Deferred to Project Agents

- cross-repo item owned by another repo agent:
