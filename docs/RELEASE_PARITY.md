# Solara S79 runtime release

Date: 2026-10-03. Status: staging verified; main promotion pending.

Staging: https://solara.staging.vaultsparkstudios.com/
Production target: https://solara.vaultsparkstudios.com/

71 unit tests and gameplay smoke pass. Chrome screenshots cover all six menu panels in dark and light at 1440×1000 and 390×844; all reviewed. Gameplay and opened utility panel also fit at both sizes. Four UI scales retain physical viewport dimensions. Saved touch movement changed x=21 to x=20 at y=28 and remained available after reload. Evidence: [visual receipt](visual-qa/LATEST.json).

The shared-world migration rejects invalid factions, wave values, coordinates and echo kinds, normalizes sigils, and denies direct public-client inserts/updates. Both anon and authenticated role checks pass in rollback rehearsal. Nine live table/RPC checks pass. SQL SHA-256: 20d561531b5a8c37f628a2000e4f961b8ccbc68f128f86b5773754d33e7f96b9.

Rollback: retain earlier staging release and restore the previous source through a normal revert/redeploy. Database changes are additive and restrictive; do not remove validation to recover frontend code.

Limits: frontend staging uses the shared backend. Obelisk scaffolds are unmounted. Public launch readiness (Core Web Vitals, cost audit, own-domain legal/contact completeness) is not certified. The aggregate Studio doctor has no project-scoped local runner and is recorded unmeasured, not green. No lifecycle promotion or announcement accompanies this runtime deployment.
