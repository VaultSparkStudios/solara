# Decisions

Append new entries. Do not erase historical reasoning unless it is wrong.

## Entry template

### YYYY-MM-DD - Decision title

- Status:
- Context:
- Decision:
- Alternatives considered:
- Why this was chosen:
- Follow-up:

---

### 2026-03-26 - Adopt VaultSpark Studio OS

- Status: Accepted
- Context: VaultSpark Studios requires all projects to run under Studio OS for agent continuity and Studio Hub integration
- Decision: Bootstrap all required Studio OS files in this repo
- Alternatives considered: No structured context system
- Why this was chosen: Enables agent handoffs, hub visibility, and consistent studio protocols
- Follow-up: Fill out project-specific content in all context files — DONE 2026-03-27

---

### 2026-03-27 - Phase 0 Location/NPC Name Mapping

- Status: Accepted
- Context: IP safety requires removing all OSRS/RuneScape-derived proper nouns before marketing
- Decision: Lumbridge→Solara's Rest, Varrock→The Sanctum, Al Kharid→The Amber District, Barbarian Village→The Outlander Camp, Draynor→Ashfen, Falador→The White Fort, Karamja→The Southern Isle, Wilderness→The Ashlands; NPCs Hans→Alder, Cook→Mara, Doric→Stone-Reader, etc.
- Alternatives considered: Generic fantasy names; keeping names as-is
- Why this was chosen: Names chosen to feel world-appropriate for Solara's desert-sun mythology; Sanctum/Amber District/Ashlands all evoke the sun theme
- Follow-up: Lore codex fragments (Phase 5) should explain why these places have these names

---

### 2026-03-27 - Keep internal curReg IDs stable for old saves

- Status: Accepted
- Context: Changing visitedRegions string IDs would silently break the explorer achievement for players who had already visited Falador/Karamja under Dunescape
- Decision: Internal-only region IDs ("Falador", "Karamja", "AlKharid") left unchanged; only user-visible display strings were updated
- Alternatives considered: Full ID rename with save migration patch
- Why this was chosen: Save migration was already complex; this is an invisible implementation detail
- Follow-up: When Phase 4 roguelite engine ships, consider unifying all region IDs

---

### 2026-03-27 - Ship all 13 implementable innovation items in one sprint

- Status: Accepted
- Context: Full project audit scored 72/100. 20 innovation items brainstormed. Carter directed agent to implement all "highest leverage" (low effort, real impact) and "highest ceiling" (high effort, transformative) items in the same session.
- Decision: Implement all 13 code-implementable items immediately; document remaining 7 Carter-manual/infrastructure items in LATEST_HANDOFF for deferred action
- Alternatives considered: Incremental 1–2 items per session; prioritised subset only
- Why this was chosen: Items are complementary — distribution infrastructure (archive, widget, Discord bot, Twitch ext) + virality mechanics (faction cards, prophecies, landmark naming) + engagement layer (ambient audio, faction dashboard, Oracle subscription) all reinforce each other at once; shipping together maximises launch readiness
- Follow-up: Carter must complete Supabase setup + itch.io listing to activate all social features; Phase 4 roguelite engine is the next agent build task

---

### 2026-03-30 - Declare runtime callbacks before dependent effects

- Status: Accepted
- Context: The app stopped booting even though `vite build` still passed. The cause was `useEffect` dependency arrays reading `fetchGraves` / `fetchSunState` before those `const` callbacks were initialized.
- Decision: Keep callback declarations above any effects or dependency arrays that reference them in `src/App.jsx`.
- Alternatives considered: Leave order as-is and rely on manual browser testing to catch regressions; refactor the whole file immediately.
- Why this was chosen: It fixes the actual bug with the smallest safe change and establishes a clear rule for future edits in the monolithic component.
- Follow-up: Add a lightweight boot smoke test for mount + daily/roguelite startup flows.

---

### 2026-03-30 - Use a repo-native Node smoke harness for boot regressions

- Status: Accepted
- Context: This repo has no browser-test stack, but the runtime bug showed that `vite build` alone is not sufficient protection.
- Decision: Add `npm run smoke`, a lightweight Node harness that mounts a Node-safe copy of `App.jsx`, flushes mount effects, and verifies Daily / Roguelite startup handlers initialize.
- Alternatives considered: Add a full browser runner immediately; rely on build-only CI; leave smoke checks manual.
- Why this was chosen: It catches the exact class of regressions that just broke boot, adds minimal maintenance cost, and fits the repo’s current tooling.
- Follow-up: Extend smoke coverage with save-state validation and additional boot-critical guardrails rather than jumping straight to a heavy test stack.

---

### 2026-03-31 - Prioritize viewport-scale gameplay over always-open utility chrome

- Status: Accepted
- Context: The game was technically running, but the main canvas remained stuck at native size while the side panel permanently consumed screen space. Players reported that the map did not feel like it followed them and did not know how to play.
- Decision: Make the gameplay canvas scale to the full available viewport, add a collapsible utility panel, and add a quickstart overlay with explicit controls and first actions.
- Alternatives considered: Leave the small fixed canvas and only tweak copy; perform a larger architectural split of the UI shell before addressing usability.
- Why this was chosen: It fixes the actual player-facing usability failure with a contained change inside the existing monolithic `App.jsx`, and it immediately improves perceived playability without destabilizing the game loop.
- Follow-up: Add starter-loadout onboarding and an objective tracker so the first 2 minutes are guided, not just explained.

---

### 2026-03-31 - Commit to async shared-world multiplayer framing

- Status: Accepted
- Context: The project’s premise was drifting between “real-time multiplayer game” expectations and its actual codebase, which is a single-player local sim with shared-state hooks.
- Decision: Treat Solara’s multiplayer promise as async shared-world presence first: front door, identity, leaderboards, graves, shared sun, and player echoes before any real-time netcode.
- Alternatives considered: Pivot immediately toward real-time co-op/PvP; keep the async concept implicit instead of productized.
- Why this was chosen: It matches the original idea, fits the current architecture, and creates a shippable social layer without a server-authoritative rewrite.
- Follow-up: Activate Supabase tables and deepen the async layer with objective guidance and richer echoes/ghosts.

---

### 2026-03-31 - Sanitize saves instead of rejecting them outright

- Status: Accepted
- Context: The game now carries more identity and shared-world state, and the repo already had evidence that permissive save loading could become a boot-risk.
- Decision: Coerce and repair boot-critical save fields during load/import rather than rejecting stale saves outright.
- Alternatives considered: Hard-fail on malformed saves; leave load/import permissive and rely on smoke coverage only.
- Why this was chosen: It preserves the migration-friendly philosophy of the project, keeps player progress recoverable, and reduces the chance that a single bad field can blank-screen the app.
- Follow-up: Extend the same validation philosophy to future shared-world fields and any public import/export tooling.

---

### 2026-03-31 - Treat runtime overlays as user-controlled furniture, not fixed chrome

- Status: Accepted
- Context: The objective tracker helped onboarding, but a fixed-position card started blocking gameplay and immediately drew user feedback.
- Decision: Persist runtime overlay preferences and let the player hide or reposition the objective tracker instead of hard-coding one placement.
- Alternatives considered: Shrink the tracker only; remove it entirely; keep it fixed and ask the player to tolerate it.
- Why this was chosen: Guidance is still valuable, but only when it stays subordinate to play space. User-controlled overlays preserve onboarding value without forcing a single layout.
- Follow-up: Apply the same rule to future runtime helper overlays if more coaching surfaces are added.

---

### 2026-03-31 - Centralize layout control once overlay options become a system

- Status: Accepted
- Context: HUD comfort work expanded from a few toggles into draggable overlays, presets, and saved custom layouts. The regular settings column became too cramped for that interaction model.
- Decision: Add a dedicated layout manager modal for built-in presets and named custom layout slots instead of keeping all layout actions inline.
- Alternatives considered: Keep all layout controls in the settings column; stop at presets without custom saves; add more scattered buttons around the runtime HUD.
- Why this was chosen: It keeps the main settings panel readable while still letting layout customization grow into a first-class system.
- Follow-up: If layout control grows further, split the manager into overlay visibility vs saved profiles rather than overloading one panel.

---

### 2026-04-01 — Prioritize Prophecy Scroll PNG over Layout export/import

- Status: Accepted
- Context: With the SIL items (chronicle + echo loop) done, the Next bucket had Layout export/import and Prophecy Scroll PNG both eligible. Engage sits at 2.3/10 (3-session avg) — the single lowest category.
- Decision: Ship Prophecy Scroll PNG first as the highest-value pick because it creates a shareable image on every death (viral hook), directly addressing the Engage gap. Layout export/import addresses UX polish but not acquisition.
- Alternatives considered: Layout export/import (high probability, no Engage impact); App.jsx pressure release (internal housekeeping only).
- Why this was chosen: Viral share surface on every death is the fastest route to raising Engage from 2.3 toward a healthy 5+. The PNG scroll is a concrete deliverable that works offline and doesn't require Supabase.
- Follow-up: Now that viral tooling is in place, Layout export/import and App.jsx pressure release are the correct next two items.

---

### 2026-04-01 — Echo reactions on player_echoes columns vs separate table

- Status: Accepted
- Context: The echo response loop needed to store commend/heed/mourn counts. Options were (a) columns on player_echoes or (b) a separate echo_reactions table with per-player rows.
- Decision: Add columns (`commend_count`, `heed_count`, `mourn_count`) directly to `player_echoes` and use an RPC to increment them.
- Alternatives considered: Separate `echo_reactions` table with `(echo_id, session_id, reaction)` unique constraint — cleaner anti-spam but more complex, requires another SQL block and an extra fetch join.
- Why this was chosen: Simpler schema, one fewer fetch, fits the graceful-offline pattern already established. Anti-spam is handled locally via localStorage (one reaction per player per echo). Sufficient for the current player scale.
- Follow-up: If spam becomes a real problem post-launch, migrate to a separate reactions table with server-side uniqueness enforcement.
