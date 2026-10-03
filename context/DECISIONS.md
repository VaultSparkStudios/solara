# Decisions

Public-safe decisions only. Detailed internal decision history is maintained privately.

## 2026-06-12 — Canvas renders in logical pixels; the backing store carries DPI

**Decision:** The world canvas keeps all drawing/click math in logical (CSS) pixels and scales only the backing store by `devicePixelRatio` (capped at 3×), re-applying the scale via `setTransform` each frame. UI absolute-positioning that lives under the root CSS `zoom:uiScale` must divide window coordinates by `uiScale` (panels, drag clamps, context menu) so nothing renders off-screen at scale > 1.

**Applies to this project:** Yes — `src/App.jsx` (`syncCanvasSize`, `getViewportMetrics`, `draw`, click handlers, panel/menu positioning).

**Rationale:** Owner reported blur and off-screen text/menus. Logical-pixel rendering keeps the existing tile/camera math intact while delivering HiDPI crispness, and the zoom-aware positioning fixes the real root cause of panels drifting past the viewport edge.

---

## 2026-04-06 — CANON-008: All VaultSpark IP is proprietary by default

**Decision:** All code, content, assets, and designs created by VaultSpark Studios are proprietary and all rights are reserved by VaultSpark Studios LLC unless an open-source license is explicitly declared and approved by the Studio Owner. No agent may apply or imply an open-source license without Studio Owner direction.

**Applies to this project:** Yes — `docs/RIGHTS_PROVENANCE.md` reflects this project's specific license status.

**Rationale:** VaultSpark Studios LLC is a commercial entity building owned IP. Open-sourcing any project without deliberate strategy gives away commercial advantage and creates ownership ambiguity.

**Studio canon:** `vaultspark-studio-ops/docs/STUDIO_CANON.md` → CANON-008

---

## 2026-04-14 — Public shared-world writes require trust boundaries

**Decision:** Client code may sanitize public shared-world writes for player experience and local fallback, but production safety must also be enforced by Supabase RLS, RPC validation, constraints, rate limits, and moderation workflows before scaled public traffic.

**Applies to this project:** Yes — `src/game/trust.js` provides the client-side trust layer, and `docs/SUPABASE_ACTIVATION_PACK.md` records the server-side mirror requirements.

**Rationale:** Solara's core fantasy depends on public records such as graves, scores, echoes, reactions, and offerings remaining readable and abuse-resistant.

---

## 2026-04-14 — Solara canon must remain identity-safe

**Decision:** Player-facing runtime names, bosses, quests, region labels, and lore should use Solara-owned language and avoid borrowed-feel naming from adjacent RPGs or legacy prototypes.

**Applies to this project:** Yes — the runtime now uses `Cinderwake Colossus`, `Cinderwake Slayer`, `Cinderwake emberling`, `Mara's Hearth`, and Solara-owned region comments / labels for the audited targets.

**Rationale:** Proprietary-first ownership requires a distinctive public identity, especially for flagship threats and first-session quests.

---

## 2026-04-17 — Browser AI/token cost remains deterministic-first

**Decision:** Browser runtime AI/token cost remains zero by default. Public chronicle, status, world-feed, intelligence digest, and Studio integration outputs are generated deterministically from structured public game state. Paid generation may only be added later as a server-side cached enhancement with hard budgets and deterministic fallback.

**Applies to this project:** Yes — `src/game/intelligencePolicy.js` and `src/game/chronicle.js` encode the public-safe policy.

**Rationale:** Solara's shared-world systems can produce strong player-facing intelligence without exposing private data, increasing latency, or creating recurring browser-side token cost.

---

## 2026-04-17 — Public shared-world writes should be RPC-first

**Decision:** Client shared-world mutations should call validated Supabase RPCs first and only use direct table writes as a temporary compatibility fallback during staged backend rollout.

**Applies to this project:** Yes — `src/game/sharedWorldService.js` now prefers RPC calls, and `docs/SUPABASE_PUBLIC_WRITE_HARDENING.sql` provides the starter hardening script.

**Rationale:** Public graves, scores, echoes, reactions, and offerings are core to Solara's identity and need server-enforced validation, moderation posture, and rate-limit protection before scaled traffic.

---
## 2026-06-04 — Offline shared-world writes queue locally and flush RPC-first

**Decision:** When the Supabase client is unavailable, public shared-world writes (graves, daily scores, echoes, reactions, offerings) are sealed into a trust-sanitized, capped, deduplicated local outbox (the Sundial Queue) and flushed automatically through the existing RPC-first service path the moment the backend link connects.

**Applies to this project:** Yes — `src/game/sundialQueue.js` implements the queue and `src/game/sharedWorldService.js` enqueues on disconnect and exposes `flushSharedWorldQueue`.

**Rationale:** The live backend gate (`SUPABASE_DB_URL`) is a human action outside agent control. Queuing instead of dropping converts that blocker into a launch moment: the day hardened RPCs deploy, accumulated player records join the chronicle through the same validated write path, preserving the trust-boundary decision of 2026-04-14.

---

## 2026-06-04 — Player-facing intelligence stays seeded and forecast-honest

**Decision:** New player-facing intelligence surfaces (Sun Almanac forecast, Myth So Far scenes, Director Memory remembrance) must derive only from the date seed, public world state, and local play history — and may only forecast what is genuinely deterministic (route rotation by day seed; phase drift expressed as distance-to-band, never as a predicted flip).

**Applies to this project:** Yes — `src/game/almanac.js`, `src/game/chronicleScenes.js`, and `src/game/directorMemory.js` encode this posture.

**Rationale:** Extends the 2026-04-17 deterministic-first decision from cost policy into honesty policy: the game should never imply knowledge of future communal outcomes it cannot have.

---

## 2026-06-07 — Shared-world backend contracts live in runtime code

**Decision:** Required shared-world tables and RPC write contracts are declared in `src/game/backendContract.js` and consumed by both public chronicle/status exports and `scripts/verify-supabase-hardening.mjs`.

**Applies to this project:** Yes — the manifest covers daily scores, graves, sun state, player echoes, and the five write kinds used by the Sundial Queue.

**Rationale:** The Supabase hardening gate should fail because a live backend is missing a contract, not because a verifier checklist drifted away from runtime behavior. One manifest keeps deploy verification, queue semantics, and Studio integration status aligned.

---

## 2026-06-07 — Solara stays on its cloud Supabase project

**Decision:** Solara remains pointed at cloud Supabase project `fjnpzjjyhnpmunfoycrp`; production hardening should use a project-specific `PG_CONNECTION_SOLARA` secret rather than a generic `SUPABASE_DB_URL` or the Hetzner/Vorn self-hosted database password.

**Applies to this project:** Yes — `src/supabase.js` now normalizes the stored project ref into a full Supabase URL, and `tests/supabase-url.test.mjs` guards that behavior.

**Rationale:** The Hetzner/Vorn database is a different shared backend. Repointing Solara there would risk cross-project drift; a Solara-scoped Postgres connection keeps hardening precise without disturbing other projects that share Studio infrastructure.

---


## S79 — 2026-10-03

- Use a dedicated root origin for the playable runtime because the inherited /solara/ URL redirects to the Studio marketing page. Keep GitHub Pages production and a stable independent frontend staging origin.
- Menu appearance uses explicit Dark menu/Light menu labels; it does not recolor the authored game world.
- Restrictive policies cover both anon and authenticated roles because legacy PUBLIC permissive policies otherwise allow signed-in clients to bypass direct-write restrictions.
- Existing account scaffolds do not constitute Obelisk adoption. No account rollout, public launch announcement or lifecycle promotion is claimed.
- Frontend staging shares the existing shared-world backend; SQL rehearsal uses a rollback transaction. A physically separate backend staging environment remains future work.
- Legacy public-launch and Studio-tooling checks remain separate from this bounded runtime deployment; missing project-scoped doctor tooling is unmeasured, never reported as green.

S79 verification tooling note: the propagated Windows-hide checker targets Studio infrastructure roots absent from this game repo; its default scope exits unscanned, not green. Solara deployment helpers explicitly hide spawned windows. Restored the repository-local pre-push hook path after finding it pointed to a nonexistent sibling directory.
