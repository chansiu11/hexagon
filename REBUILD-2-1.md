# HEXAGONER task 2-1 — separate chronological source-video wall contours

## Base and scope
- Base: `rebuild-step-1-3-hexagon-20261116@72b5af890d8993a11766871896e83e0afd060ebb`.
- Working branch: `rebuild-step-2-1-hexagoner-20261116`.
- Stage 1 (`HEXAGONER` in the rebuilt stage index): newly registered; **only this stage has been added**.
- Original stage 0 HEXAGON, menu styling, six-stage list, saved records, and removed stage 7 are unchanged.
- No legacy HEXAGONER generator survived on the task 1 base. No old stage-specific wall logic was copied into this stage.
- This is **task 2-1 only**. No random phrase joining, phrase counts, new HUD/audio/death choreography or map 3 work.

## Footage and source clock calibration

The request named `1557(20261116-003454).mp4` and `1594.mp4`; these **exact files were not mounted**. Actual available inputs were `1595(1).mp4` and `1596(1).mp4`. File correspondence is unverified. Do not substitute filenames silently when claiming source accuracy.

| Available uploaded video | File length / video resolution | Approx. HEXAGONER start | Extracted video end | Approx. game-time duration | Sample count | Before 60s / after 60s |
|---|---|---|---|---|---|---|
| `1595(1).mp4` | 828.093 s / 1920×1080 / 60fps | 177.96 s | 275.01 s | 101.04 s | 1941 | 1152 / 789 |
| `1596(1).mp4` | 740.786 s / 1152×720 / 60fps | 119.30 s | 223.80 s | 108.80 s | 2090 | 1152 / 938 |

For **either** video, the source time corresponding to game time `t` is approximated by `sourceStart+t*(24/25)`. Consequently game 60s is approximately video 235.56s (1595) or 176.90s (1596). The time scale is estimated from source-game HUD timing; it may drift. Both replays load a **single uninterrupted archive**: game 60s does not create a fresh set of walls or restart the source.

## Actual implementation
- `data/hexagoner-1595.b64` and `data/hexagoner-1596.b64`: new and independent recorded 20fps traces, 480×300 measurement coordinates; source-video pixels were not checked into GitHub. Each frame has observed polygon contours and holes for visible colored walls, estimated camera rotation and zoom, and source sampling order.
- `tools/hexagoner_extract_20fps.py`: the reproducible FFmpeg/OpenCV extraction script; takes video, video-start, duration, output b64, source ID. Requires FFmpeg, Python NumPy and OpenCV. Examples:
  `python tools/hexagoner_extract_20fps.py "1595(1).mp4" 177.96 97.05 data/hexagoner-1595.b64 1595`
  `python tools/hexagoner_extract_20fps.py "1596(1).mp4" 119.30 104.50 data/hexagoner-1596.b64 1596`
- `data/hexagoner-1595-palette.json` and `-1596-palette.json`: sampled per-film palettes at 4fps.
- `stages/hexagoner.js`: new stage 1 registration pointing at this data without legacy pattern functions.
- `play.js`: stage 1 starts deterministic chronological source replay (default 1595, `?trace=1596` selects other); no random section stitching until 2-2. Stage 0 continues to use the old 1-3 randomized phrase engine.
- `replay.js`: cache keys are `videoId|geometryPath` instead of videoId alone, so HEXAGON and HEXAGONER do not leak each other's files. Palette caches also use independent files.
- `index.html`: includes just the new stage registration, leaving title/select/menu markup and CSS alone.
- `test/hexagoner-source.test.cjs` and `test/hexagoner-browser.test.cjs`: time split, chronology, source identity, map selection, pause/menu, finite source end, and 60s frame continuity; CI also runs the existing stage 0 tests.

### What the source data proves, and what it does not
**Verified source-derived measurements**: a source film is decoded in chronological 20fps order; individual visible filled polygons, gaps, camera *estimates*, measured color-sample changes, and changing silhouettes can be inspected at timestamps. The player and HUD are excluded from extracted walls heuristically. A full first 60 seconds and recorded post-60 tail are present in both files.

**NOT yet independently verified or complete**:
1. The original engine's offscreen wall **spawn times**, original physical obstacle IDs/lifetimes, wall velocities and intermediate transition animations are **not reconstructed** from source. The decoded polygons are 20fps screen observations; actor identity association is heuristic and may break on splits/merges, including around 60s. A continuous stream of samples is not proof of one persistent physical wall ID.
2. Screen-camera phase and zoom are estimates; original camera reversal frames can be wrong. For the first extraction, polygon side count is provisionally held at **6** because automated core side detection did not reliably separate true morphs. Shape-switch timing, wall deformation and arrival-time precision at 60fps are not certified pixel identical.
3. A screenshot-based collision implementation exists in the shared engine, but accurate player entry-lane survivability, startup false deaths, no >1s gap in **new incoming walls**, 60s wall ID persistence, and detailed contact timing remain unverified or require correction. They must not be marked done.
4. Stage-specific HUD/character speed/camera, voices, music beat matching, death/retry art and true random part selection are reserved for task **2-2**.
5. The original prompt's video filenames were not available under the exact requested names, so **exact agreement to those filenames is not established**.

## Verification
- Locally decoded both generated binary HXRF streams with independent Python structural parse: correct archive magic/version, 20fps metadata, all `1941 / 2090` frames traversed without length mismatch, both full 60-second boundaries and continuous subsequent frames, valid numeric camera values and nonempty observed walls at 59.9 and 60.1.
- GitHub Actions `node --check` and Node engine+HEXAGON+HEXAGONER chronology tests are authoritative for parser/integration. Chromium tests cover selecting map 2, `?trace=1595` / `?trace=1596`, timeline seek, 60s split, pause and menu return. Record actual workflow run ID/conclusion before marking browser pass.
- During development an initial Chromium test falsely asserted visible walls at game 0.5s, inside an intentional 0.55s intro grace period. It was corrected to test after 1.5s; it was a **test condition**, not a proven original wall spawn.
- **Task 2-1 fidelity remains partial**: a valid source-trace replay is not the same as exact original per-wall event reconstruction.

## Next: task 2-2 (ONLY upon user '이어서')
Verify/refine source contour actor lifetimes and individual wall events first where they would invalidate transitions. Then derive dodge-continuous phrases from **both** recordings, split by pre-60/post-60, connect only reachable transitions while retaining actors across seams and 60s, audit gaps, finish map2 UI/camera/audio/collision/death/restart, and rerun stage0 regression. Do not begin map3.
