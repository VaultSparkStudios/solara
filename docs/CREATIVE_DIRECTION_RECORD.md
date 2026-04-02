# Creative Direction Record — Dunescape

**ADDITIVE ONLY. Never delete or edit prior entries. Append only.**

This is the authoritative ledger of all human creative direction for this project.
It exists for IP protection, creative continuity, and agent alignment.

## Enforcement rule

An agent MUST append an entry to this file whenever the human gives:
- Creative direction of any kind
- Feature assignments or goals
- Brand, tone, or visual guidance
- Canon-affecting decisions
- Naming decisions
- Any explicit "do this / don't do this" creative instruction

Agents MUST NOT add entries autonomously without human input.
Agents MUST NOT modify or remove existing entries.

---

## Entry categories

| Category | Use when |
|---|---|
| **Direction** | Human specifies what the project should do or become |
| **Assignment** | Human assigns a specific feature, task, or goal |
| **Guidance** | Human gives style, tone, brand, or quality guidance |
| **Canon** | Human makes a lore, world, or story decision |
| **Rejection** | Human rejects a direction, idea, or approach |
| **Approval** | Human approves a proposed direction |

---

## Entries

### 2026-03-26 — Studio OS onboarding

- Category: Direction
- Human input: All VaultSpark projects must adopt Studio OS, including self-improvement loop and Creative Direction Record
- Area affected: Process / Studio OS compliance
- Previous state: No structured creative direction tracking
- New required direction: All human creative direction must be recorded in this file, additive only
- Why it matters: IP protection, agent continuity, creative alignment across sessions
- Supersedes prior entry: —

---

### 2026-03-27 — Full project audit + innovation sprint

- Category: Assignment
- Human input: "Audit project in its entirety and provide score/rating, areas of improvement, category scores, analysis/recommendations and another innovative solutions brainstorm list with every single item scored. Out of this list, recommend items by 'Highest leverage right now (low effort, real impact)' and 'Highest ceiling (high effort, transformative)'. Update memory and task board with all item ideas and implement all items that are 'Highest leverage' and 'Highest ceiling'."
- Area affected: Full project — src/App.jsx, public/, discord-bot/, twitch-extension/, docs/, context/, memory/
- Previous state: Phases 0–3 complete (game + social loop coded, Supabase not yet live); no external distribution infrastructure; no viral mechanics beyond share card
- New required direction: Implement all 13 code-implementable innovation items: Archive of the Fallen, Oracle subscription UI, Sun Observatory widget, Discord bot, Faction Rivalry Dashboard, Weekly State of Sun template, Grave clustering landmark auto-naming, Twitch extension, Ambient audio system, Faction Recruitment share card, Prophetic epitaph suggestions, Faction share card, Sunfall Event Boss HP Tracker
- Why it matters: Moves project from 72/100 to launch-ready; establishes distribution infrastructure before first player arrives; virality mechanics baked in at the code level
- Supersedes prior entry: —

---

### 2026-03-27 — Closeout + git push

- Category: Assignment
- Human input: "Complete push and commit to git/github/audit to make sure nothing was missed/update all files/memory. CLOSEOUT"
- Area affected: All context files, git history
- Previous state: All 13 innovations implemented, build passing, context files partially updated
- New required direction: Full Studio OS closeout — verify nothing missed, update DECISIONS and CDR, stage correct files (exclude .claude/, Archived/, zips, SOLARA_SUNFALL_HANDOFF/), commit and push to origin/main
- Why it matters: Ensures agent continuity and hub compliance across sessions
- Supersedes prior entry: —

---

### 2026-03-30 — Diagnose and fix the game failure

- Category: Assignment
- Human input: "start prompt - then analyze why this game is not working and fix the problem"
- Area affected: Runtime stability / game boot path
- Previous state: Project built successfully, but the live app had a startup failure and was not usable
- New required direction: Follow the startup protocol first, then isolate the concrete runtime break and ship the fix instead of speculating
- Why it matters: A working build artifact is not enough if the browser boot path is broken; startup reliability is a prerequisite for every other milestone
- Supersedes prior entry: —

---

### 2026-03-30 — Implement the smoke test

- Category: Assignment
- Human input: "yes"
- Area affected: Runtime verification / CI guardrails
- Previous state: Boot regression fixed, but there was still no automated smoke coverage for mount/startup flow
- New required direction: Implement the smoke test now rather than leaving it as a follow-up
- Why it matters: Converts the runtime fix from a one-off repair into an enforceable guardrail
- Supersedes prior entry: —

---

### 2026-03-31 — Make the game playable and overhaul the gameplay screen

- Category: Direction
- Human input: "the game is currently very much unplayable. The map doesn't follow the character and I have no clue how to play. The screen should be full size (game play screen) this game may need a massive overhaul/renovatipn"
- Area affected: Gameplay shell / first-run UX / overall playability
- Previous state: Runtime was booting again, but the gameplay canvas still presented as a small fixed screen with weak onboarding
- New required direction: Prioritize real playability over minor polish: make gameplay fill the screen, improve camera/screen feel, and make the game understandable on first contact even if it requires substantial renovation
- Why it matters: A technically running build is still a failure if the player cannot understand or comfortably play it
- Supersedes prior entry: —

---

### 2026-03-31 — Choose async shared-world over real-time multiplayer

- Category: Direction
- Human input: "we will do 1 as I think that is the original game idea"
- Area affected: Multiplayer / social architecture / roadmap
- Previous state: The project had async social systems in progress, but the multiplayer framing still needed a concrete product decision
- New required direction: Treat Solara's core multiplayer premise as async shared-world play first: shared sun state, graves, leaderboards, ghosts, seasonal records, and social persistence rather than real-time synchronous co-op/PvP
- Why it matters: This matches the original concept, fits the current architecture, and avoids a premature real-time server rewrite
- Supersedes prior entry: —

---

### 2026-03-31 — Complete the async shared-world build order in one pass

- Category: Assignment
- Human input: "Complete the 1-5 build order in one go, make it the highest quality build possible"
- Area affected: Front door / identity / async social systems / menu UX
- Previous state: The project had only in-world tabs and scattered shared-state hooks; the async multiplayer idea was not productized end-to-end
- New required direction: Implement the full async shared-world presentation layer now: main menu, how-to-play, knowledge base, features, update log, identity, and ghost/echo-style social memory in one quality-focused pass
- Why it matters: This turns the original game idea into a player-facing build instead of a mostly internal roadmap
- Supersedes prior entry: —

---

### 2026-03-31 — Full project audit with scored recommendations

- Category: Assignment
- Human input: "Audit project in its entirety and provide score/rating, analysis/recommendations (short descriptions). Provide short innovative solutions brainstorm list with each items having a score/rating attached to it and how it would improve/impact the project's overall score, potential, momentum (etc.). Recommend the top items to implement by highest impact/potential. (do all of this with minimal token waste)"
- Area affected: Full project audit, prioritization, roadmap, and implementation order
- Previous state: The repo had strong shipped systems, but the next highest-impact actions had not been re-ranked after the front-door pass
- New required direction: Produce a concise, scored audit of the entire project, generate a ranked idea list, and identify the highest-impact items for implementation
- Why it matters: The project needed a reality-checked priority stack instead of continuing to add features on intuition alone
- Supersedes prior entry: —

---

### 2026-03-31 — Complete all recommendations and add all ideas

- Category: Assignment
- Human input: "Complete all recommendations annd add all ideas"
- Area affected: Runtime onboarding, shared-world presence, save resilience, repo truth surfaces, task board
- Previous state: The audit produced a concrete recommendation list, but those improvements were not yet shipped
- New required direction: Implement the full agent-side recommendation set now and add the resulting future ideas into project memory/tracking
- Why it matters: It converts the audit from advisory output into shipped product movement and retained next-step intelligence
- Supersedes prior entry: 2026-03-31 — Full project audit with scored recommendations

---

### 2026-03-31 — Fix camera follow and expand gameplay viewport

- Category: Direction
- Human input: "again, the player starts the world off screen and then you have to move him onto screen and then when you move anywhere outside of the starting view box, he disappears again. The camera doesn't follow your character. Fix this issue. Also expand the gameplay to be bigger on the screen as there are two massive vertical black boxes that make the gameplay screen small. Audit and propose fix plan." and "Complete follow up plan"
- Area affected: Runtime camera, viewport sizing, gameplay shell
- Previous state: The gameplay shell was larger than before, but camera framing was still broken and the viewport still behaved like a fixed box on wide screens
- New required direction: Fix camera follow immediately, remove the boxed-in gameplay presentation, and complete the responsive viewport/camera follow-up plan rather than stopping at diagnosis
- Why it matters: A game that lets the player fall off-screen or wastes most of the monitor on black bars is still effectively unplayable
- Supersedes prior entry: —

---

### 2026-03-31 — Add music, stronger HUD affordances, and broader settings/customization

- Category: Assignment
- Human input: "start - add music to the game with mute option. Improve the siz e of the top banner and the icons and give them hoverable descriptions (like on the save buttons - that whole area of buttons/icons). There should be a settings option or menu that allows them to customize different aspects of the game - visually, features, settings, etc. It should also have the main menu pages built in for easy reference. Look for other ways to improve the game"
- Area affected: Runtime HUD, audio, settings UX, menu/reference access
- Previous state: Ambient audio existed technically, but it was not surfaced as a player-facing music control; the top action cluster was small and under-explained; settings were too thin
- New required direction: Surface music with mute controls, enlarge/improve the top HUD and icon affordances, add hoverable descriptions across the action area, and expand settings into a broader customization/reference hub that also links back to the front-door pages
- Why it matters: The game needs to feel readable and configurable in use, not only feature-rich in code
- Supersedes prior entry: —

---

### 2026-03-31 — Make the objective tracker hideable or movable

- Category: Direction
- Human input: "the objective tracker is in the way and should be able to be hidden or moved around the screen"
- Area affected: Runtime overlay ergonomics / objective guidance
- Previous state: Objective tracker existed as a fixed-position helper card
- New required direction: Treat the tracker as optional/user-positionable guidance instead of locked interface chrome
- Why it matters: Guidance should support play, not obstruct it
- Supersedes prior entry: —

---

### 2026-03-31 — Continue overlay/layout tooling and close out to git

- Category: Assignment
- Human input: "yes and then push'commit and closeout", "do that", and subsequent "yes" approvals for draggable ghost overlays, presets, custom slots, renaming, and layout-manager follow-up

---

### 2026-04-01 — Complete next moves (Session 16)

- Category: Assignment
- Human input: "Complete next moves"
- Area affected: Product — engagement tooling
- Direction: Deliver the SIL-committed items (Season Chronicle + Echo Response Loop) and any remaining next-move items from the handoff
- Agent decision: Executed the two SIL items and also shipped Prophecy Scroll PNG as a third "next move" derived from the phase 5b backlog
- Supersedes prior entry: —

---

### 2026-04-01 — Highest-value feature prioritization (Session 16)

- Category: Direction
- Human input: "complete highest value" (after SIL items were done)
- Area affected: Product — viral sharing surface
- Direction: Prioritize the single highest-value unblocked feature from the backlog
- Agent decision: Identified Prophecy Scroll PNG as highest-value because it directly targets the Engage gap (2.3/10) with a viral image on every death; shipped over Layout export/import
- Supersedes prior entry: —
- Area affected: Runtime layout system, settings UX, repo closeout, git history
- Previous state: Tracker drag/hide and ghost drag/hide were shipping incrementally, but preset/custom-slot management was still cramped inside the settings column
- New required direction: Keep extending the overlay/layout control system through presets, named custom slots, and a cleaner management surface, then complete commit/push and Studio OS closeout in the same session
- Why it matters: The user wanted the UI-control work finished end-to-end, not left half-wired or uncommitted
- Supersedes prior entry: —
