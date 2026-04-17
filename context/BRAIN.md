# Brain

Public-safe architecture note only. Detailed implementation and operator reasoning are maintained privately.

## 2026-04-14 Architecture Note

- Public shared-world writes now route through `src/game/trust.js` before local or remote persistence.
- Sun Director planning lives in `src/game/sharedWorld.js` and is exposed through the shared-world snapshot.
- `src/App.jsx` remains the largest maintainability risk; the current extraction slice moved browser storage and objective/guide computation into `src/game/clientStore.js` and `src/game/objectives.js`.
- the next technical milestone is extracting shared-world service calls and larger UI/runtime panels without changing gameplay behavior.

## 2026-04-17 Audit Implementation Note

- The audit priority is deterministic shared-world depth first: make the daily/world consequence loop visible before adding paid AI generation.
- AI/token consumption should remain zero in the browser runtime unless a server-side cached chronicle/oracle feature is deliberately added with hard budgets.
- Smoke coverage must remain green because the app's largest risk is integration drift across the still-large runtime file.
- Session delta feedback now has a reusable synthesis path so front-door, Daily Rite, and future Studio Hub exports can share the same public-safe interpretation of run/world changes.

## 2026-04-17 Systems Tranche Note

- Public status export is deterministic and generated at build time; it is suitable for Studio Hub / social surfaces without exposing private ops context.
- Sun Director mechanics are now represented as structured runtime-neutral data before being wired deeper into room generation and map objectives.
- Save repair work should stay explicit: migration reports are better than silent normalization when player trust is at stake.
- Supabase public write hardening should move toward RPC-only mutations with RLS denying direct anonymous table writes.

## 2026-04-17 Runtime Refinement Note

- Director mechanics now participate in actual runtime scaling through `worldRuntime`, so modifier data is no longer only explanatory copy.
- Save payload serialization has a reusable module seam; future import/export/reset UX should build on that rather than re-expanding `App.jsx`.
- Native browser prompts are no longer needed for the audited high-risk flows; use the Solara modal pattern for future confirmations.
- Smoke coverage now includes save/import because runtime regressions in persistence are high-cost for long-lived chronicles.

## 2026-04-17 Closeout Architecture Note

- Shared-world writes are now RPC-first in the service layer, with legacy table-write fallback only to support staged Supabase rollout.
- Public chronicle/status exports are the integration boundary for Studio Hub, Social Dashboard, Sparkfunnel, Discord, Twitch, and public embeds.
- Grave constellations should be treated as routeable map objectives, not only summary text; the objective layer now exposes urgency, offering value, shrine progress, and reward labels.
- First-session onboarding should continue through the "First Myth" planner instead of one-off UI conditionals in `src/App.jsx`.
- Remaining high-leverage technical debt is still `src/App.jsx` modular extraction and browser-level gameplay validation.
