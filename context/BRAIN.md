# Brain

Public-safe architecture note only. Detailed implementation and operator reasoning are maintained privately.

## 2026-04-14 Architecture Note

- Public shared-world writes now route through `src/game/trust.js` before local or remote persistence.
- Sun Director planning lives in `src/game/sharedWorld.js` and is exposed through the shared-world snapshot.
- `src/App.jsx` remains the largest maintainability risk; the current extraction slice moved browser storage and objective/guide computation into `src/game/clientStore.js` and `src/game/objectives.js`.
- the next technical milestone is extracting shared-world service calls and larger UI/runtime panels without changing gameplay behavior.
