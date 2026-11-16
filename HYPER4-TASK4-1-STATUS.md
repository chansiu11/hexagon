# HYPER HEXAGON — task 4-1 work record (2026-11-16)

## Scope and provenance
- Only map index 3 (4th map, HYPER HEXAGON) was connected to a new sequential replay module.
- Requested baseline was task 3 branch/SHA, but the prompt contained the literal placeholders `[입력]`. No completed task 1–3 branch was found among the repository branches. **This experimental branch starts at current main 8f04ce2d93c9b9ac90fb83c64309c6bf7a763ab8, NOT verified task 3.**
- The requested files `1557(20261116-003454).mp4` and `1594.mp4` were not attached under those names. The accessible user uploads are `1595(2).mp4` and `1596(2).mp4`.
- The two inspected recordings are 60 fps. Video timestamps below are approximate and intentionally separate from the in-game timer.

| Source | Video start | Last gameplay | HUD duration | 0–60 video end | Optical crossing candidates 0–60 | 60+ |
|---|---:|---:|---:|---:|---:|---:|
| 1595(2).mp4 | 382.95 s | ~473.0 s | ~93.5 s | 440.55 s | 62 | 36 |
| 1596(2).mp4 | 303.51 s | ~399.0 s | ~99.2 s | 361.11 s | 63 | 44 |

## What is actually implemented
- Created `hyper4-filmed-observations.js`: source-isolated chronological 10 Hz optical bright-wall crossing observations and approximate visual polygon-side schedule.
- Created `hyper4-video-order.js`: distinct per-video sequential stage-4 wall playback, maintaining source event identity at game time 60 s. `?hyper4Source=1595` or `?hyper4Source=1596` selects the replay; without a query, 1596 is selected.
- New source does not import or derive scripts from the old HYPER HEXAGON generator. Deleted `hyper-hexagon-stage7.js`, `hyper-hexagon-78-data.js`, `hyper-hexagon-78.js`, and its obsolete `hyper-hexagon-78.test.cjs` from this work branch.
- `index.html` now loads the new replay in place of the three deleted scripts. The existing play-screen interface uses the new module through an intentional compatibility export (`HexHyper78`).
- No part shuffling/random stitching was attempted. That belongs to 4-2.
- Shared engine and levels 1–3 were not modified. The source branch still carries the old RANDOM HEXAGON because the task 1–3 baseline is missing; this must not be mistaken for a restored/verified task 1 state.

## Validation performed
- Source candidates parsed and strictly ordered: 1595: 62+36=98; 1596: 63+44=107.
- The exact new stage-class code was loaded together with the existing engine code into a Node-compatible JavaScript runtime, with stage-profile dependencies stubbed for test isolation.
- Both source modes produce finite wall polygons, start without phantom wall collisions, and preserve source wall IDs spanning t=59.99→60.01.
- Actual engine point-hit collision under 240 Hz update: 1595 first blocked sector dies at t≈2.267 s, its clear lane survives to t≈2.790 s; 1596 blocked sector dies at t≈2.579 s and its clear lane survives to t≈3.100 s.
- No local browser end-to-end verification, screen comparison, remote deployment, or whole-run continuous play validation has been performed. No map1–3 or map7 regression can be certified against the missing baseline.

## Still UNVERIFIED / NOT DONE: important
- Each observation is a bright-stripe crossing **candidate**, not a uniquely reconstructed continuous wall. Sector masks were measured in screen coordinates before undoing camera rotation. Exact world angles, full thickness/radius trajectories, real spawn/despawn instants, zoom/tilt contribution and wall transition continuity have **not** been calibrated frame by frame.
- Current numeric wall speed (420 game units/sec), thickness (42), transform, and color approximation are temporary estimates and must not be presented as original measurements or pixel-identical gameplay.
- The stored 10 Hz optical candidates cannot prove all walls, absence of >1 s new-wall gaps, dodge-route reachability, seamless angular morphing, or whether either video order can be survived from beginning to end.
- The shared stage-profile cache still contains legacy stage 4 reference snapshots; new replay does not consume their camera data. Remove unused shared data only once task3 base and maps1–3 regression are available.
- HUD, sound, detailed camera, death UI and random source part linking remain for 4-2, after completing any 4-1 defects that would block it.

This record deliberately distinguishes *implemented sequential optical replay* from the user's intended *frame-exact reconstruction*. 4-1 should be treated as **partial**, not fully accepted.
