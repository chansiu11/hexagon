# HEXAGON step 1-2 — two independently traced source-video orders

Base: `rebuild-step-1-1-core-20261116` (task 1-1 was completed before this work).
Only map 0 (HEXAGON) was connected in this step. No parts/randomization and no maps 1–5 were implemented.

## Source material actually opened

The user requested `1557(20261116-003454).mp4` and `1594.mp4`.
The files mounted in THIS conversation had the names `1595.mp4` and `1596.mp4`.
Their correspondence to the requested names is **unverified**. Never silently relabel them.
Both files were inspected frame-by-frame, including their stage transitions.

| Uploaded file | Full file duration | Source dimensions | HEXAGON recording start | Last active wall sample | Approx. in-game end | Source video position for game 60s |
|---|---|---|---|---|---|---|
| 1595.mp4 | 828.093 s | 1920×1080; 1728×1080 centered gameplay | 0.000 s (HUD already about game 0.10) | 176.600 s (02:56.600) | 182.58 s | 57.970 s |
| 1596.mp4 | 740.786 s | 1152×720 | ~3.550 s (menu→play, opening flash) | 113.850 s (01:53.850) | 114.58 s | 61.289 s |

The actual 0.00–0.10 second opening of 1595.mp4 is **not present** in the uploaded footage.
The approximated footage→game-time calibration is `gameStartOffset + (videoTime - videoStart) * gameRate`, with
rates 1.0333 and 1.0383 respectively. These rates come from sampled HUD clock checkpoints and are NOT guaranteed exact for every frame.

## Derived geometry and separate replay paths

The prior procedural/pattern code was not reused.
- `data/hexagon-1595.b64`: 3,533 observed geometry snapshots, video rate 20 fps, ~182.58 game seconds. Of these, 1,160 samples are before game 60s and 2,373 after.
- `data/hexagon-1596.b64`: 2,207 independent snapshots, 20 fps, ~114.58 game seconds. 1,155 samples before game 60s and 1,052 after.
- `data/hexagon-palettes.json`: independently sampled source background/wall colors at 4 fps.
- `replay.js`: binary decode plus observed camera phase and zoom estimates; optional video source selection.
- `stages/hexagon.js`: explicit data registration; `engine.js` always uses decoded real-video coordinates for both rendering and polygon hit testing.

Open the development branch with `?trace=1595` (default) or `?trace=1596` to select the exact chronological ordering of one source. The debug flag `&spectate=1` disables collision for inspecting the full reference run without falsifying saved records. Map IDs 1–5 remain unavailable, and map 6 is removed.

The 60-second boundary is NOT a fresh source load: the continuous sampled video clock advances across that boundary using the same video frames, without deleting the on-screen wall field.

## Shape observations (approximate first minute game clock)

- **1595**: 6 sides → 5 at ~20.869 s → 6 at 28.464 → 5 at 36.730 → 6 at 43.654 → 5 at 52.075 → 4 at 58.378. At game 60s the recorded core is 4-sided.
- **1596**: 6 sides → 5 at ~21.024 s → 4 at 28.032 → 5 at 37.688 → 4 at 44.905 → 5 at 51.705 → 6 at 57.728. At game 60s the recorded core is 6-sided.

Source frame masks were segmented by image-color modes, the on-screen center and HUD were masked out, and wall contours were fitted into vector loops including holes. This is a **source-frame geometric trace**, not an independently measured actor-level wall wave bank. Shape detections were median-smoothed to suppress brief misclassifications. The screen-space vectors are reverse-transformed by an independently estimated camera phase and zoom, and re-transformed for Canvas painting and shared collision geometry.

### Post-reconnect decoder correction
The original source masks also contained the recorded player's small triangle and small central-core remnants. Those are **not descending walls**. `replay.js` now removes only small, near-center source contours (10 or fewer vertices, at most 52 original sample pixels from center, contour area at most 65 sample pixels²) at decoding time before drawing or collision. The compressed original derived-geometry assets are not changed, so the raw observations remain available for audit. `test/video-replay.test.cjs` asserts those false wall fragments have been filtered for **both** recordings. Some truly small wall details close to the core may be lost under this conservative geometric rule, so this is not a claim of perfect actor reconstruction.

## Evidence and measured limits

Twenty-five extracted source-frame contour-mask / stored-vector reconstruction comparisons were run across two films, including launch, mid-run, morphs, immediately before and after 60, and late sections. IoU range: **0.872–0.982**, average about **0.952**. This statistic compares the extracted **wall masks to the vectorized masks**, not full rendered game video to the original and not per-pixel original-game fidelity.

GitHub Actions runs both independent binary timeline tests and two Chromium source-view tests. Screenshots of selected time checkpoints are stored as Actions artifacts.

## Pending (DO NOT call complete/verified)

- The frames are sampled at 20 fps, so the rendering is not an original 60 fps or guaranteed pixel-by-pixel timeline. Original source game-time mapping may drift by a few tenths of a second.
- The wall outlines are real source observations, but actor identities, true wall spawn time beyond the screen edge, individual world-space wall speed and morph velocity have NOT yet been separately recovered. Every sampled polygon is re-created as part of its frame snapshot; persistent per-actor identity across 60 seconds is NOT proved by a frame continuity check alone.
- The camera angle/zoom are extracted estimates and can be uncertain during four/five-sided transitions; only the traced wall silhouettes themselves were quantified.
- The launch flash, original arrow position, fine shake, complete HUD, audio cue timing, death animation and final recording transitions still need visual calibration in step 1-3.
- Source-frame replay is deterministic by film. Random part extraction, transition compatibility, 1-second empty-sequence audit and 0–60 vs 60+ part counts do not exist yet; they belong to 1-3.
- Original filenames `1557(20261116-003454).mp4` and `1594.mp4` were not directly available under those exact names, so the correspondence must be verified before claiming exact agreement to them.

Next requested step after another user '이어서': 1-3, but first address any unresolved 1-2 accuracy/actor-continuity issue that would invalidate random-part connections.
