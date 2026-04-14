# Task Board

Public-safe roadmap only. Detailed backlog sequencing is maintained privately.

## Now

- keep the public repo deployable and public-safe
- validate the identity-safe canon and shared-world trust pass
- keep CI, smoke coverage, and tests aligned with shipped runtime behavior
- continue the modular extraction pass from `src/App.jsx`
- harden the user feedback loop so the game always states the best next action
- turn shared-world pressure, ritual state, rivals, and prophecy into clearer player-facing guidance
- keep client-side trust rules mirrored in eventual Supabase server enforcement

## Next

- extract storage, shared-world service, and runtime panel logic out of `src/App.jsx`
- extend browser-level smoke coverage beyond startup into movement/combat/save/import-export flows
- connect ritual, rival, prophecy, and death-memory fields to Supabase schemas where available
- add server-side Supabase enforcement for public writes: RLS, RPC validation, constraints, rate limits, and moderation-safe flows
- turn Sun Director modifiers into deeper seeded Daily Rite mechanics and authored encounter variants
- evolve the world map into a strategic layer for graves, shrines, rituals, directives, and rival routes
- deepen progression with faction identity, relic loadouts, shrine attunements, and stronger run consequences
- improve first-load speed with more aggressive code splitting and deferred shared-world loading
- improve accessibility and readability with larger default text, cleaner HUD hierarchy, and stronger mobile/touch affordances
- add telemetry-lite balancing hooks for onboarding drop-off, ignored systems, and dead-content zones

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

## Deferred to Project Agents

- cross-repo item owned by another repo agent:
