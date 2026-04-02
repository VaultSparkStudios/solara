<!-- truth-audit-version: 1.0 -->
# Truth Audit

Last reviewed: 2026-04-01
Overall status: yellow
Next action: Run SQL Blocks 1–5 (activation pack) to close the gap between repo truth and live public behavior.

---

## Source Hierarchy

1. `context/PROJECT_STATUS.json`
2. `context/LATEST_HANDOFF.md`
3. `context/CURRENT_STATE.md`
4. Founder-facing derived Markdown

---

## Protocol Genome (/25)

| Dimension | Score | Notes |
|---|---|---|
| Schema alignment | 3 | `PROJECT_STATUS.json` refreshed and truth-audit fields added |
| Prompt/template alignment | 2 | Prompt assets unchanged this session; no new drift introduced |
| Derived-view freshness | 3 | `README.md`, `PORTFOLIO_CARD.md`, and activation docs refreshed |
| Handoff continuity | 3 | Session lock, handoff, task board, and work log all refreshed in order |
| Contradiction density | 3 | Major stale contradiction (`README.md` still saying Dunescape) resolved |
| **Total** | **14 / 25** | Yellow: core truth is healthier, but external activation remains unresolved |

---

## Drift Heatmap

| Area | Canonical source | Derived surfaces | Status | Last checked | Action |
|---|---|---|---|---|---|
| Project identity | `context/PROJECT_STATUS.json` | `context/PORTFOLIO_CARD.md`, `README.md` | green | 2026-03-31 | refreshed this session |
| Session continuity | `context/LATEST_HANDOFF.md` | startup brief | yellow | 2026-03-31 | keep Session Intent current at session start |
| Live state | `context/CURRENT_STATE.md` | founder summaries | yellow | 2026-03-31 | external Studio Ops registry still needs regeneration outside this repo |
| Backend activation truth | `docs/SUPABASE_ACTIVATION_PACK.md` | menu/backend messaging, public surfaces | yellow | 2026-04-01 | SQL Blocks 1–5 documented; Carter must run them |
| Chronicle + echo surfaces | `public/chronicle.html`, `src/App.jsx` | community-facing pages | yellow | 2026-04-01 | pages exist; show offline state until Supabase live |

---

## Contradictions

- Resolved this session: `README.md` no longer describes the project as Dunescape.

---

## Freshness

- `context/PROJECT_STATUS.json`: 2026-04-01
- `context/LATEST_HANDOFF.md`: 2026-04-01
- `context/CURRENT_STATE.md`: 2026-04-01
- Derived founder-facing views: 2026-04-01

---

## Recommended Actions

1. Complete the Supabase activation pack so public async surfaces stop disagreeing with local-only fallback behavior.
2. Regenerate any external founder-facing registry views that still reflect the pre-completion-pass focus.
3. Keep `PROJECT_STATUS.json` and `PORTFOLIO_CARD.md` aligned whenever the next milestone or audit score changes.
