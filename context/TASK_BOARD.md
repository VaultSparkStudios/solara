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
- keep outcome receipts, backend readiness, and runtime cost guardrails visible in public status/chronicle contracts
- keep the backend RPC contract manifest, Sundial Queue briefing, Rite Pacing Coach, Last Light result card, and Daily Rite smoke contract aligned as the next App.jsx extraction guardrails
- keep the new Daily Rite stakes ledger, feedback attribution summary, backend readiness runbook fields, and Daily Rite status component aligned with public chronicle/status exports
- keep the new Daily Rite mechanical modifiers, status render contract, and feedback route targets aligned with public chronicle/status exports
- keep the new Daily Rite segment policy, spawn contract, public policy digest, and active-run smoke assertions aligned with public chronicle/status exports
- keep the new Daily Rite room outcome receipts, runtime reward application, public outcome digest, and smoke assertions aligned with public chronicle/status exports
- keep the new Daily Rite room runtime contract, visible latest-receipt status, decision-window digest, route-choice prompts, and smoke/unit assertions aligned with public chronicle/status exports
- keep the new Daily Rite route-choice commitment contract, active status controls, feedback attribution, and zero-token assertions aligned with future room-tuning work
- keep the new Daily Rite route-choice tuning contract, visible adjustment status, public `daily_rite_route_choices` status export, and zero-token assertions aligned with deeper shrine bargain work
- keep the new Daily Rite shrine-bargain receipt contract, active status presentation, public `daily_rite_shrine_bargains` export, and zero-token assertions aligned with future shrine offering mechanics
- keep the new Daily Rite shrine economy contract, active status summary, public digest shape, and bank/spend/oath item-delta assertions aligned with future offering UI
- preserve the Session 75 verification baseline: latest audit sidecar is fully executed, validation is green, and unrelated untracked `obelisk-passport/` remains intentionally untouched until separately assigned
- keep the new Daily Rite offering-intent contract, active status copy, public shrine bargain preview, and zero-token assertions aligned with future grave-shrine offering UI
- keep the new touch movement controls, persisted preference, and coarse-pointer behavior aligned with future mobile/touch playability passes

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
- mirror vow legacy multipliers and Sundial Queue flush validation in Supabase RPC enforcement once `PG_CONNECTION_SOLARA` lands
- use `src/game/backendContract.js` as the source for Supabase hardening verification and update it before adding any new shared-world write kind
- keep Supabase production hardening scoped to `PG_CONNECTION_SOLARA` for project `fjnpzjjyhnpmunfoycrp`; do not reuse the Hetzner/Vorn shared database credential for Solara
- expand Rite Pacing Coach from guidance copy into actual room/reward nudges once the next Daily Rite runtime extraction starts
- continue refining the front-door Sun Almanac and Myth So Far planning panel now that it is visible before Daily Rite commitment
- deepen Daily Rite generation now that rooms consume Director encounter/reward/shrine/rival plans directly
- add browser-level gameplay smoke coverage for first route, combat/death, grave, offering, and save import/export
- continue converting smoke coverage into browser-level validation when a browser runner is added; current smoke now verifies first-session, objective, and world-feed data contracts
- deploy `docs/SUPABASE_PUBLIC_WRITE_HARDENING.sql` to cloud project `fjnpzjjyhnpmunfoycrp` with owner SQL-editor access or project-specific Postgres credentials, then rerun `npm run verify:supabase`
- add GitHub repo secret `PG_CONNECTION_SOLARA`, then update/run the manual Supabase Hardening workflow against that project-scoped key
- rerun Supabase Hardening workflow after `PG_CONNECTION_SOLARA` is present; prior run `24579847516` confirmed the old required-secret preflight worked before the project-scoped gate was adopted
- extend the new deterministic outcome receipts into visible post-action UI surfaces for offerings, echo reactions, and run-end share flows
- use the Director route consequence fields to tune actual Daily Rite reward payout and room modifier behavior beyond public JSON/contracts
- deepen committed Daily Rite route-choice postures into route-specific shrine bargain decisions now that next-room tuning is deterministic
- deepen the shrine economy contract into a dedicated shrine offering UI once browser-level validation exists
- turn Daily Rite offering intents into a one-click Living Map route/highlight once browser-level validation exists
- add browser-level validation for the extracted Daily Rite status component and full mechanical modifier effects once a browser runner exists
- extract Daily Rite dungeon room entry/auto-advance spawning into a pure room-runtime contract now that spawn, policy, and outcome receipts are modular
- deepen shrine bargains from receipt rewards into actual route choice prompts once the next Daily Rite presentation extraction starts
- add browser-level mobile viewport validation for touch movement once a trusted browser runner is in scope

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
- Supabase Hardening workflow now preflights required secrets and reports missing secret names before attempting SQL
- private ops secrets were checked for a reusable Supabase DB URL; none was found without constructing one from a missing database password
- 2026-06-03 audit-derived pass shipped Director route briefs, outcome receipts, backend readiness digest, structured world-feed action results, zero-token runtime cost guardrail, repaired blocker preflight helpers, and clean dependency audit
- dirty/untracked worktree resolved into a clean committed baseline (git status clean at 2026-06-04 session start)
- 2026-06-04 audit-derived pass shipped the Sun Almanac 7-day forecast, Sundial Queue offline outbox with flush-on-connect, Legacy Vows with grave epitaph stamping, Director Memory personal adaptive pressure, Myth So Far chronicle scenes, Last Light challenge links, a 250-seed save-import fuzz harness (which found and fixed a real sanitizer crash), and an XL accessibility text scale
- five studio-ops lib modules (cross-repo-tasks, ignis-insight, sil-forecaster, human-action-ages, task-board, skill-cost-ledger) propagated into scripts/lib so the startup brief renders again
- 2026-06-07 audit-derived pass shipped a backend RPC contract manifest, grouped Sundial Queue briefing, zero-token queue_pending outcome receipts, deterministic Rite Pacing Coach, sanitized Last Light result cards, and a Daily Rite app-surface smoke contract; validation passed 50 unit tests, production build, and smoke runtime
- 2026-06-07 closeout repair normalized Supabase project-ref URLs in runtime, added a regression test, and confirmed the safest long-term hardening path is `PG_CONNECTION_SOLARA` for cloud project `fjnpzjjyhnpmunfoycrp` rather than the Hetzner/Vorn shared database
- 2026-06-10 audit-derived pass shipped a Director-aware Daily Rite room weaver, front-door world-planning panel, local public-safe feedback ledger, public chronicle/status feedback summary export, and updated smoke/unit coverage
- Daily Rite room sequences now consume Director route segments instead of only displaying route-plan copy
- front-door menu now previews Sun Almanac and Myth So Far signals before players enter the Daily tab
- latest local validation: 54 unit tests passing, production build passing, smoke flow passing, startup-brief render passing, brief-format validation passing, closeout-board render passing
- propagated startup protocol scripts now have the missing local shared-policy helper required by the startup-brief renderer
- 2026-06-10 Session 64 pass aligned the hardening gate to `PG_CONNECTION_SOLARA`, added deterministic Daily Rite consequence receipts, extracted Daily Rite run-session assembly/completion, and turned feedback summaries into front-door/public JSON next-action digests
- latest local validation: 56 unit tests passing, production build passing, smoke flow passing
- 2026-06-11 pass shipped Daily Rite stakes ledger, feedback action/source attribution, structured backend readiness runbook fields, local Studio protocol drift shims, and extracted Daily Rite status presentation
- latest local validation: 56 unit tests passing, production build passing, smoke flow passing, startup-brief render passing, brief-format validation passing
- 2026-06-11 closeout continuation added the public closeout brief/audit record and revalidated tests, build, smoke, startup brief, and closeout board
- 2026-06-11 Session 66 pass shipped Daily Rite mechanical modifiers, public `daily_rite_modifiers` exports, deterministic Daily Rite status contracts, and feedback route targets
- 2026-06-11 Session 67 pass shipped Daily Rite segment economy policy, a pure Daily Rite spawn contract, public `daily_rite_policy` exports, and active-run smoke assertions
- 2026-06-12 Session 68 pass shipped deterministic Daily Rite room outcome receipts, runtime clear rewards, public `daily_rite_outcomes` exports, and active-run smoke assertions
- 2026-06-12 Session 69 pass shipped a pure Daily Rite room runtime application contract, visible latest clear receipts in the active status panel, public zero-token outcome decision windows, and bounded reward validation
- 2026-06-12 Session 70 pass shipped deterministic Daily Rite route-choice prompts, active status-panel route recommendations, public zero-token `daily_rite_route_choices` exports, and validation for prompt sanitization/segment alignment
- 2026-06-12 Session 71 pass shipped committed Daily Rite route-choice decisions, active status-panel commit controls, public-safe route-choice feedback attribution, and validation for commitment sanitization/status export
- 2026-06-12 Session 72 pass shipped committed route-choice next-room tuning, visible route-tuned outcome status, public `daily_rite_route_choices` status export, and validation for deterministic zero-token adjustment contracts
- 2026-06-12 Session 73 pass shipped deterministic shrine bargain receipts for committed bank/spend/oath choices, active status presentation, public `daily_rite_shrine_bargains` exports, and validation for bounded zero-token bargain contracts
- 2026-06-12 Session 74 pass shipped deterministic shrine economy item deltas for bank/spend/oath choices, active status economy summaries, public digest guards, and validation for zero-token bounded reward inventory
- 2026-06-12 Session 75 verification pass completed the requested start/audit/implement/closeout loop against current evidence, reran tests/smoke/build, and preserved unrelated untracked `obelisk-passport/` work
- 2026-06-12 Session 76 pass shipped deterministic Daily Rite offering intents for banked shrine bargains, active/completed status rendering, public shrine bargain preview exports, and validation for zero-token bank/spend/oath behavior
- 2026-06-12 Session 77 founder-directed playability/visual pass fixed camera follow, made Set Camp create a real persistent camp (chest + fire, recreated on load), added DPR-aware crisp canvas rendering, root-caused and fixed off-screen panels/menus under CSS `zoom` UI scale, and raised HUD/menu/log/context-menu size + contrast; recommended next lever is a sprite-sheet asset layer (`docs/AUDIT_2026-06-12-visual-playability.md`)
- 2026-06-13 Session 78 audit/implement pass shipped persisted touch movement controls, coarse-pointer auto-surfacing, direct runtime movement bridging, and preference regression coverage

## Deferred to Project Agents

- cross-repo item owned by another repo agent:


## S79 release waves

- Wave 1 complete: recovered the three committed auth-scaffold changes after S78 and synchronized main without losing local work.
- Wave 2 complete: deployment checks, database validation/policies, responsive menus and gameplay layout.
- Wave 3 in progress: production domain, sanitized main commit, verified deployment and release receipt.
- [SIL] Completed: deployment regression tests prove validation precedes artifact publication.
- [SIL] Completed: hash-bound rendered-pixel evidence covers menu palettes and gameplay layouts.

Next product work: authenticated identity integration and separate backend staging, followed by the public launch readiness review.


### S79 wave reconciliation

All selected release waves complete: recovery, implementation, staging evidence, main publication, production verification and closeout. Delivered deployment regression coverage, live backend enforcement, responsive menu/gameplay fixes and runtime parity evidence. Future public-launch and account work remains roadmap work outside this deployment tranche.
