# Task 3 — HEXAGONER (game time 0–60 seconds)

Reference uploaded during this work: `1557(7).mp4` (740.786 s, 1152×720, 60 fps).
The requested filename in the original brief was `1557(3).mp4`. Only the newly attached `1557(7).mp4` was available for this turn.

## Video timing and measured effects

- Video time approx. **118.1 s**: HEXAGONER play begins. Video time 120 s shows the HUD timer at approx. 1.9 s.
- Video time approx. **175.9–176 s**: game timer reaches 60 s and the subsequent era begins.
- During game time 0–60 the arena is six-sided; the footage contains deep full-cell corridors, alternating bars, thin nested walls and thick stair-like corridors.
- Camera motion was extracted from 900 analyzed frames at 15 fps (480×300 working frames), measuring six-fold rotation from central ring/backdrop angular phase. The resulting 121 half-second angle samples are in `hexagoner-reference-60.js`. The first transition is extrapolated due to capture UI.
- Noticeable approximate rotation reversals around game 10.5, 22.5, 27.5, 36.5, 40, 47, and 50 seconds. Keyframes are piecewise linear, without ease across direction changes; frame-quantized pulse moves are deterministic.
- The new color track is an approximate screenshot-derived orange→yellow→green→chartreuse progression. Exact hue and pulse shapes remain uncertain, especially through rapid changes.

## Wall source, part method and limits

`hexagoner-parts.js` already groups the checked-in `waves-stage-1.json` into **21 full dodge parts** using a 0.45-second observed-impact recovery gap. The source contains **715 individual recorded wall actors**, from **another source recording** (`5mDjFdetU28`). That source is not mislabeled as a measurement of the newly uploaded 1557 video. The existing full-part approach preserves source-internal sequence, relative event timings, sector geometry, wall thickness, speed and lifecycle. Only the complete part order and one whole-part angular alignment may change on each replay. Compatibility screening avoids an immediate impossible entry lane.

It has **not** been established that these original 21 source parts precisely reproduce the newly uploaded 1557 video. Extracting and validating all individual radial wall tracks from the new video, including fully reliable color/occlusion masks, is still outstanding. Do not label the stage frame-exact.

## Changes for this task

- Added `hexagoner-reference-60.js` for deterministic video-driven camera and color, exclusively for HEXAGONER 0–60.
- `hexagoner-parts.js` keeps all 21 source part structures and all wall rules, but chooses the new camera only before game 60 s; after 60 s it retains previous behavior for task 4.
- `index.html` loads the stage-specific module before HEXAGONER mode.
- `play.js` selects the video palette and bypasses the generic start-camera easing for this stage only.
- Existing start, progress voice, death sound, impact freeze, enlargement and results implementation was not overwritten.
- No edits were made to `hard-mode.js`, `hard-post60.js`, `hexagonest-mode.js` or stage-one/five source data.

## Verification

- 7 independent seeded wall timelines were checked. Part source wave IDs, thickness, speed, radii and lifetimes matched the pre-existing recorded source. Part order varied with seed.
- 21-part count and 715 source actors were unchanged. New camera was deterministic for every seed, with fixed 60-second scope and no invalid wall radii in sampled frames.
- Forced collision check verified a death-camera snapshot and stopped spin with the existing death zoom.
- Additional reproducible test: `node hexagoner-stage3.test.cjs`.
- **NOT VERIFIED**: live Pages browser visual/playability, exact original-camera frame correspondence, voice synchrony against every reference second, source-video-specific wall event reproduction, continuous route viability for every random bag. Do not claim complete parity.

Task 3 only. Next requested item is Task 4 (HEXAGONER, 60+), **not started**.
