# Current State

Public-safe summary:
- this repo remains deployable
- internal operational records were sanitized for public-repo safety on 2026-04-03
- detailed internal state now lives in the private Studio OS / ops repository
- shared-world innovation pass added public-safe runtime support for crisis directives, ritual progress, grave constellations, rival echoes, prophecy surfacing, and death-memory cards
- identity-safe canon pass removed borrowed-feel runtime names and replaced the flagship boss / starter quest surface with Solara-owned naming
- shared-world trust layer now sanitizes client-side public writes for scores, graves, echoes, reactions, offerings, coordinates, factions, and public text
- Sun Director 2.0 foundation now exposes pressure, daily modifiers, ambience guidance, NPC tone, music cue, and faction objectives
- first-session guidance now routes new travelers through gear, Mara's Hearth, and the Daily Rite
- objective and guide computation now has its own module so the game can surface clearer next-action feedback without further bloating `src/App.jsx`
- browser storage helper logic now has its own module to reduce duplicated localStorage parsing/writing paths
- shared-world service I/O now has its own module to reduce direct Supabase/local persistence coupling inside `src/App.jsx`
- Supabase client loading is now deferred behind a lazy loader instead of being eagerly imported at startup
- automated checks now include explicit test coverage in CI alongside build and smoke validation
- latest local validation: 17 unit tests passing, production build passing, smoke flow passing
