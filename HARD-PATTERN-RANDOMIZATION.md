# HARD randomized wall pattern audit — 2026-11-07

Scope: **HARD (level 1 / internal index 0) only**. This is not stage 7 RANDOM HEXAGON and not a recovered copy of the original Super Hexagon RNG. Source MP4 clips remain in the user's library and are **not** committed to this repository.

## Video evidence and time convention

Video timestamps below are approximate absolute positions **in the MP4**, not in-game HUD scores. Gameplay begins approximately 3.60 s (VGkmTsx3HIw), 3.56 s (5mDjFdetU28), and 0.69 s (aD187viql4Q), respectively. Full-range geometry and shape transitions have separate existing measurements in `hard-reference-measurements.json` and `hard-motion-reference.json`.

| Game-relative interval | VGkmTsx3HIw (HD 104.05) | 5mDjFdetU28 (all stages) | aD187viql4Q (1456s HARD) |
| --- | --- | --- | --- |
| ~4–7 s | Video ~7.6–10.6: broad partial hexagon opening, then nested connected outlines | ~7.6–10.6: diagonal isolated spokes followed by a nested outline | ~4.7–7.7: isolated diagonal bars followed by layered partial ring |
| ~10–16 s | ~13.6–19.6: separated bars and large connected outline; multiple near-parallel strips | ~13.6–19.6: thin angled stripes and a wide partial perimeter | ~10.7–16.7: nested outlines and later separated short bars |
| ~19–25 s | ~22.6–28.6: near-core thick segment then large C-shaped/open polygon contour | ~22.6–28.6: open interval followed by repeated narrow stripes | ~19.7–25.7: compact C-like opening followed by large angled open outline |
| ~29–38 s | ~32.6–41.6: broad ring-like opening then close parallel bands | ~32.6–41.6: wide square outline and diagonal layer | ~29.7–38.7: open polygon outlines and several tightly spaced nested rings |
| ~49–75 s | ~52.6–78.6: separated bars and partial corridors; cyan/blue after 60 HUD seconds | ~52.6–78.6: sparse bars, then blue tones and parallel strokes | ~49.7–75.7: offset ring geometry, then blue walls and short offsets |

**Directly observable:** The same named HARD stage has different wall arrangements among the runs. Bar-shaped wall pieces, connected multi-edge C/open-ring silhouettes, nearby parallel layers and unequal widths appear in the footage. A gap remains visible while the center polygon changes. Different changing center polygons do not follow a common fixed sequence; verified times are listed in `hard-reference-measurements.json`. This supports pattern-family-based reconstruction better than repeating the same full 5-of-6 ring with a different rotation, but does **not** reveal how source code groups its random calls.

**Estimated, not confirmed by video alone:** The complete family catalog; exact relative probability of each family; whether every family starts at a music beat; internal pseudo-RNG and seed behavior; whether a left/right reflection is a separate pattern or a direction flag; invisible offscreen spawns and exact collision clearances. No claim of exact algorithm, exact sampled frequency, pixel identity or exhaustive original motif transcription is made.

## Reconstruction and six requested criteria

1. **Independent cells vs motif groups:** Use short multi-wall **pattern groups**, with a seeded weighted shuffle bag; don't pick every cell independently. The observation of coherent bar groups and adjacent rings motivates this, but the original internal grouping remains unknown.
2. **Motifs / radial size:** Retain the existing twelve semantic IDs and connected profiles, with isolated one-sector 24–40px walls (ID 0), thin 18px separated rakes (ID 6), 32–52px ordinary panels, 100–180px deep tunnels and some stepped ±32px offsets. These numeric sizes are clone-calibration choices, not exact measurements of original pixel geometry.
3. **Rotation / reflection / repetition / connectors:** Seed a start gap and directional sign for each group; alternation, stairs, paired outlines and lane-changing patterns move the opening across successive rings. Direction choices implement clockwise/counterclockwise mirror behavior for changing-gap families. Real turning distance, radial approach timing and adjacent polygon changes are included in gate scheduling, retaining an open full sector.
4. **Repeat limits:** Weighted bag `[0,0,1,1,2,3,3,4,5,6,6,7,8,9,10,11]` promotes common simple/rake motifs while keeping all 12 possibilities. Avoid a family matching the preceding two selections; a newly shuffled bag replaces an exhausted bag. These constraints are *heuristic*.
5. **Time/music/shape:** Existing HARD motion (300 units/sec before 60 HUD seconds, 360 after), 60/120/180 degree/s spin tiers and music transport are unchanged. Shape events remain seeded and occur at pattern-independent clock times, with walls scheduled safely around changes. Direct per-beat motif selection is **not** proven and is not fabricated.
6. **Transformation continuity:** Preserve existing single persistent six-track wall mesh, 0.18 game-second morph/hold, smooth radial restart, player carriage and destination-polygon voice announcement. Actor IDs and radial wall age persist across morph; no regenerate/delete/recreate of a running wall at shape changes.

## Verification and limits

`hard-variation.test.cjs` now includes 100 deterministic seeds for motif variability, one-cell barriers, thin/deep walls, open safe tracks, family coverage and consecutive/two-back anti-repeat; `hard-mode.test.cjs` replays 100 seeds in all **three** control modes for the first 120 game seconds. Existing browser tests check HARD launch, morph, wall drawing and death in Chromium. They are guardrails, not proof that every player input can survive, nor that the source game uses exactly these weights.

Only `hard-mode.js` game generation was changed; other stage gameplay logic, audio cues, death effects, controls, and morph code are preserved.
