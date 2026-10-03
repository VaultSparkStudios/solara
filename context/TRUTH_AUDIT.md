<!-- truth-audit-version: 1.1 -->
# Truth Audit

Overall status: green
Last reviewed: 2026-06-13
Public-safe summary only. Sensitive verification notes are maintained privately.

## 2026-06-13 Session 78 Public-Safe Check

- touch movement controls are local browser UI only; they do not touch credentials, backend writes, private Studio context, or paid generation
- coarse-pointer auto-surfacing and the explicit `showTouchControls` preference preserve accessibility while keeping the browser runtime token cost at zero
- movement still flows through existing walkability/path rules, so the new input surface does not bypass map collision or action routing
- local validation passed: 69 unit tests, production build, and smoke runtime

## 2026-04-14 Public-Safe Check

- runtime/public/context scan found no remaining matches for the major borrowed-feel terms targeted in the canon pass
- local validation passed: 13 unit tests, production build, and smoke runtime
- remaining launch caveat: Supabase-side policies and moderation should mirror the client trust helpers before scaled public traffic

## 2026-04-17 Public-Safe Check

- public chronicle/status generation is deterministic and keeps browser token cost at zero by default
- Supabase public-write hardening is documented in a repo-local SQL starter, but live backend verification remains a human/backend-access task
- shared-world client writes now prefer RPCs with legacy table fallback for staged rollout
- Studio Hub / Social Dashboard / Sparkfunnel exports remain public-safe and derived from public shared-world state
- local validation passed: 30 unit tests, production build, and smoke runtime

## 2026-06-03 Public-Safe Check

- public chronicle/status generation now includes backend readiness, outcome receipt summaries, and explicit zero-token runtime cost guardrails
- Director route brief fields are deterministic and derived from public shared-world state; no paid generation or private Studio context is required
- blocker preflight now runs locally and reports the remaining Supabase DB URL blocker with evidence-oriented attempt order
- local validation passed: 31 unit tests, production build, smoke runtime, and `npm audit --json` with 0 vulnerabilities

## 2026-06-04 Public-Safe Check

- public chronicle gained `shared_world.almanac` and `shared_world.myth_scenes`; both are deterministic functions of public state and the date seed
- `generate-public-status.mjs` dayNumber now matches the runtime season-day (was days-since-epoch), so exported day references read correctly
- offline write queue (Sundial Queue) stores only trust-sanitized payloads already accepted by the client trust layer; flush reuses the RPC-first service path
- save sanitizer hardened against symbol/function coercion crashes found by the new fuzz harness
- local validation passed: 45 unit tests, production build, and smoke runtime

## 2026-06-07 Public-Safe Check

- public chronicle/status exports now include `backend_contract`, `shared_world.sundial_queue`, and `shared_world.result_card_shape`; all are deterministic and contain no secrets
- Supabase hardening verification now reads required tables/RPCs from `src/game/backendContract.js`, keeping runtime queue kinds and backend deployment checks aligned
- Sundial Queue briefings and queue_pending receipts summarize only sanitized counts/kinds and preserve zero browser token cost
- Solara's runtime Supabase client now normalizes the stored project ref `fjnpzjjyhnpmunfoycrp` to a full cloud Supabase URL before client creation
- the remaining hardening credential is project-scoped `PG_CONNECTION_SOLARA`; using the Hetzner/Vorn shared database would be a cross-project migration and is not the current safe path
- local validation passed: 51 unit tests, production build, and smoke runtime

## 2026-06-10 Public-Safe Check

- Daily Rite room weaving is deterministic, date/Director-derived, and keeps browser token cost at zero
- front-door Sun Almanac and Myth So Far planning surfaces reuse deterministic public shared-world state already exported through chronicle/status contracts
- local feedback ledger stores only capped aggregate event metadata with explicit zero token cost; it does not store raw saves, private notes, credentials, cookies, or internal ops data
- public chronicle/status exports now include `feedback_summary`, which is deterministic/public-safe when generated from provided aggregate events and empty by default in static generation
- propagated protocol scripts remain public-safe; the copied shared-policy helper contains only blocked-status labels needed by startup brief rendering
- local validation passed: 54 unit tests, production build, smoke runtime, startup-brief render, brief-format validation, and closeout-board render

## 2026-06-10 Session 64 Public-Safe Check

- active backend hardening surfaces now consistently use the project-scoped `PG_CONNECTION_SOLARA` gate; public status/chronicle output no longer advertises stale `SUPABASE_DB_URL`
- Daily Rite consequence receipts are deterministic functions of Director route segments and do not require paid generation, private state, or credentials
- feedback next-action digest is derived only from capped local aggregate event counts and keeps `token_cost: 0`
- Daily Rite session extraction moved run object assembly/completion out of `src/App.jsx` without moving combat state or changing persistence boundaries
- local validation passed: 56 unit tests, production build, and smoke runtime

## 2026-06-11 Public-Safe Check

- Daily Rite stakes are deterministic functions of the Director route plan and expose only public route labels, risk scores, rewards, and guidance; `token_cost` remains 0
- feedback attribution stores only capped, sanitized `action_id` and `source` labels plus aggregate counts; it still stores no raw saves, private notes, credentials, cookies, or internal ops data
- backend readiness now exports a public-safe runbook for `PG_CONNECTION_SOLARA` without exposing connection material
- local Studio protocol shims are explicit no-ops for public-repo boundaries and do not read private cargo or credentials
- local validation passed: 56 unit tests, production build, smoke runtime, startup-brief render, and brief-format validation
- closeout continuation revalidated the same public-safe surfaces, added `docs/CLOSEOUT_BRIEF_2026-06-11.md` and `audits/2026-06-11.json`, and confirmed the closeout board format gate passes

## 2026-06-11 Session 66 Public-Safe Check

- Daily Rite mechanical modifiers are deterministic functions of public route stakes; they expose bounded enemy/reward multipliers and keep `token_cost: 0`
- public chronicle/status exports now include `daily_rite_modifiers` so Studio integrations can distinguish visible stakes from mechanical route pressure without credentials or paid generation
- Daily Rite status contracts expose only UI state, action availability, stake labels, risk labels, and modifier labels; no private player payloads or secrets are included
- feedback route targets are fixed public UI intents and remain aggregate-only alongside capped local feedback attribution
- local validation passed: 57 unit tests, production build, and smoke runtime

## 2026-06-11 Session 67 Public-Safe Check

- Daily Rite segment policy is deterministic from public route modifiers and exposes only bounded reward, drop, recovery, and shrine bargain fields with `token_cost: 0`
- Daily Rite spawn policy now lives in a pure module; it applies public world state and active route policy without reading credentials or private Studio context
- public chronicle/status exports include `daily_rite_policy` for Studio surfaces while preserving deterministic zero-token behavior
- active-run smoke coverage now verifies stakes, modifiers, policy, and 30-wave segment mapping after Daily Rite start
- local validation passed: 58 unit tests, production build, and smoke runtime

## 2026-06-12 Session 68 Public-Safe Check

- Daily Rite room outcome receipts are deterministic from public segment policy and expose only bounded recovery, coin, Sunstone, shrine-bargain, and next-action fields with `token_cost: 0`
- active Daily Rite wave clears apply the receipt locally in the browser loop without reading credentials, private Studio context, or paid generation
- public chronicle/status exports include `daily_rite_outcomes` for Studio surfaces while preserving deterministic zero-token behavior
- active-run smoke coverage now verifies stakes, modifiers, segment policy, outcome policy, latest outcome receipts, and 30-wave segment mapping after Daily Rite start
- local validation passed: 59 unit tests, production build, and smoke runtime

## 2026-06-12 Session 70 Public-Safe Check

- Daily Rite route-choice prompts are deterministic from outcome decision windows and expose only sanitized labels, payoff/cost copy, recommended choice ids, and `token_cost: 0`
- active Daily Rite status surfaces show route-choice guidance without storing raw private player payloads, credentials, private Studio context, or paid generation output
- public chronicle/status exports include `daily_rite_route_choices` for Studio surfaces while preserving deterministic zero-token behavior
- local validation passed: 61 unit tests, production build, and smoke runtime

## 2026-06-12 Session 72 Public-Safe Check

- Daily Rite route-choice adjustments are deterministic from committed local run choices and bounded to sanitized choice id, label, posture, risk/reward deltas, recovery delta, and next-room bias
- active Daily Rite status surfaces show applied route tuning without storing raw private player payloads, credentials, private Studio context, or paid generation output
- public status now includes `daily_rite_route_choices` in addition to chronicle integration surfaces; generated outcome samples expose `route_choice_adjustment: null` when no local run choice exists
- local validation passed: 63 unit tests, production build, smoke runtime, syntax checks, and public status route-choice export presence

## 2026-06-12 Session 73 Public-Safe Check

- Daily Rite shrine bargains are deterministic from committed local route choices and bounded to sanitized choice id, label, posture, shard/relief/oath/reward deltas, receipt, and next action
- active Daily Rite status surfaces show applied shrine bargains without storing raw private player payloads, credentials, private Studio context, or paid generation output
- public chronicle/status now includes `daily_rite_shrine_bargains` beside `daily_rite_route_choices`; generated digest entries expose only sanitized deterministic bargain windows and `token_cost: 0`
- local validation passed: 64 unit tests, production build, and smoke runtime

## 2026-06-12 Session 74 Public-Safe Check

- Daily Rite shrine economy is deterministic from committed local route choices and bounded to sanitized posture, item delta, offering credit, relief credit, oath charge, reward credit, receipt, and next action
- active Daily Rite status surfaces show shrine economy summaries without storing raw private player payloads, credentials, private Studio context, or paid generation output
- public chronicle/status keeps `daily_rite_shrine_bargains` deterministic and zero-token; generated digest entries expose only sanitized bargain windows and economy previews when shrine windows exist
- local validation passed: 64 unit tests, production build, smoke runtime, and syntax checks

## 2026-06-12 Session 75 Public-Safe Check

- Session 75 made no new product-facing runtime changes; it verified the already-executed Session 74 audit against the current tree.
- public chronicle/status generation still succeeds and only changed generated timestamps during the verifier build.
- unrelated untracked `obelisk-passport/` files were inspected as worktree context and left untouched.
- local validation passed: 64 unit tests, production build, and smoke runtime.

## 2026-06-12 Session 76 Public-Safe Check

- Daily Rite offering intents are deterministic from banked shrine bargain receipts and expose only sanitized source choice, item, segment, target, summary, next action, and `token_cost: 0` fields.
- active/completed Daily Rite status surfaces show offering-opened guidance without storing raw private player payloads, credentials, private Studio context, or paid generation output.
- public shrine bargain digests include offering-intent previews only for deterministic shrine windows; spend/oath bargain postures intentionally do not create offering targets.
- local validation passed: 64 unit tests, production build, and smoke runtime.


## S79 — 2026-10-03

Corrected stale claims: PG_CONNECTION_SOLARA absence did not prevent migration through the management API; hardening is now applied and verified. The inherited production path was a marketing redirect, not a verified game runtime. Obelisk Passport is scaffolding only. Local audience is corrected to public-unlaunched. Frontend staging isolation does not imply separate backend isolation. Aggregate doctor, Core Web Vitals, cost audit and launch readiness remain unmeasured/pending rather than green.


### S79 final evidence

Runtime deployment is now verified independently of the original push wrapper exit code. Native GitHub custom-domain certificate remains failed; the actual client HTTPS edge is the verified Caddy proxy. Production and staging now serve identical CI runtime assets. Browser checks show live async services and saved progress. Optional favicon 404 and unmeasured launch/doctor checks remain explicit.
