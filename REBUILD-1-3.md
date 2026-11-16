# HEXAGON — Task 1-3 implementation and handoff

**Branch**: `rebuild-step-1-3-hexagon-20261116`, branched from 1-2 commit `13194a1acdbbaaab3e6e1543e1ae2cfa3bf0d133`.

## Scope: map 1 only, HEXAGON

This is the third and final subtask for the rebuilt HEXAGON map. All other maps remain selectable in the preserved main menu, but maps 2–6 are deliberately unavailable pending their separate tasks. The seventh/random map remains deleted. No files were merged into main.

The input videos actually available under this conversation's mounts were `1595.mp4` and `1596.mp4`. The prompt's named `1557(20261116-003454).mp4` / `1594.mp4` correspondence remains unverified; see `REBUILD-1-2.md`. Original video pixels/audio are **not** committed. Stage geometry is a derived vector trace.

## Source-film phrasing (new `parts.js`)

- 33 time-ordered wall phrases from `1595.mp4`; 20 from `1596.mp4`; **53 total**.
- By recorded in-game start time: **24** pre-60s clips and **29** post-60s clips. Each phrase contains **all** sampled source-frame contours, color/zoom and measured camera motion for its source interval, without reordering frames internally.
- The cut points come from low near-core wall-occupancy windows, with camera/shape transition guards; recordings are sampled at 20 fps, so they are approximations of natural avoidance sequences, not manually labeled original wave events.
- In default gameplay, run start chooses one of the original *opening* phrases, then chooses subsequent phrases based on compatible entrance/exit polygon side counts, four-ring wall occupancy signatures, the current local player corridor, recent-phrase repetition and seeded weighted randomness.
- Sides match exactly at every seam. Phrases never reset **at** the 60-second mark: the current phrase ends normally, and the next chosen phrase is from the post-60 source pool. The score clock is continuous; no once-per-minute full-wall clear.
- Each seam retains the preceding footage's moving wall tail during a short 270-ms color/geometry crossfade. Camera rotation is counter-applied to outgoing walls and player orientation is compensated for any incoming whole-sector rotation. Collision checks disregard the fading wall at opacity < 50%, using the same polygons painted to Canvas.
- Existing raw source playback remains available as `?trace=1595` or `?trace=1596`. The normal page URL uses randomized phrases. For reproducible QA: `?seed=20261116&spectate=1&debug=1`; `spectate=1` prevents collision and preserves record data without recording an artificial best time.
- Randomized play repeats indefinitely until a wall collision. Unlike a raw finite video file, it does not end at the source recording's final frame.

## Wall continuity, graphics, input, audio

- `replay.js`: estimated persistent source contour IDs via adjacent-frame world-position and polygon-size association; tracked sample velocity is exposed for analysis, but is not an independently reconstructed parametric wall generator.
- `parts.js`: source-snapshot polygon vertex interpolation with cyclic-vertex alignment on equal-length rings; source frame rate remains 20 fps but game simulation uses fixed 240 Hz substeps.
- `engine.js`: supports both finite chronological source replays and endless phrase streams, shape-change events and opacity-consistent wall hits; death freezes motion and reports the wall identifier.
- `play.js`: continuous randomized gameplay by default, optional raw-video QA, approximately 160-ms core morph, small impact/death zoom, independently sampled video palettes, source shape cue voice and startup audio, plus source-like 60-second LEVEL UP banner. The timer uses decimal notation `60.05`.
- `menu.js`: preserved six-stage menu and saved `hexagon-web-v2` records. Mode 1/2/3 changes now happen **in place** instead of resetting the random video sequence or the elapsed time. Stage 7 is still absent.
- `replay.js` suppresses mistakenly traced original player triangles and the source film's narrow top HUD/LEVEL UP silhouettes, so that these do not become lethal wall polygons.

## Validation

Run `node --test test/rebuilt-engine.test.cjs test/video-replay.test.cjs test/hexagon-parts.test.cjs`, followed by the GitHub Actions Chromium tests:
`test/rebuilt-browser.test.cjs`, `test/video-browser.test.cjs`, `test/hexagon-parts-browser.test.cjs`.

Coverage includes:
- two independent vector source banks / 53 phrase ranges / 24+29 time cohorts;
- actor-ID continuity sampled across adjacent video frames;
- deterministic RNG and variability under other seeds;
- exit/entrance polygon side-compatibility and player lane entry checks;
- no >1-second empty field in the five tested deterministic QA seeds;
- uninterrupted time, walls and motion across 60 s;
- spectator long play past 135 s and repeated post-60 selection;
- modes 1, 2 and 3; controller mode switching preserving clock;
- paused motion freeze, death freeze, retry, menu return, original six maps and saved record safety;
- both original chronological `trace` routes from 1-2 continue to work.

Browser screenshots from the Actions run are stored in the `filmed-hexagon-1-3-validation-screenshots` artifact.

## Important remaining visual fidelity limitations

**Do not describe this as pixel-identical or original-wall-actor-perfect.**

1. Source contours were obtained from 20fps footage using color segmentation. Per-pixel thin edges, camera jolt timing, source HUD overlaps and some small wall details can differ. Original source geometry was vectorized rather than separately identifying every wall spawn event and its lifetime.
2. Adjacent-frame actor associations are estimates; splits/merges can change IDs. Across shuffled phrase boundaries, different source-wall actors are deliberately bridged visually for 270 ms, not physically the same continuous original object. This is not equivalent to reconstructing original individual spawn speed/shape events.
3. Random phrases use two source recordings with approximate game-clock calibration; a sequence of shuffled source moments cannot have a single frame-for-frame reference video. The raw `?trace=...` route is for direct video comparison, not the normal randomized game.
4. The camera phase and zoom are estimated from video pixels; background parallax, flash, exact colors, music beat cues, ship motion in the filmed run and death scene can differ from the source.
5. The simple top HUD exclusion can hide some contours completely inside the source's original UI area. Actual recorded game audio stems/voices may not be independently available; source media is not redistributable in this branch.
6. The user asked for `1557(20261116-003454).mp4` and `1594.mp4`, but only the two uploaded files identified above were directly inspected in this conversation.

## Handoff to next task (only when requested)

The next work item is **2-1, map 2 HEXAGONER**. Use this branch HEAD as the base; keep HEXAGON complete/unchanged, reuse the rebuilt engine and trace/parts infrastructure where suitable but independently derive HEXAGONER's walls/camera/effects from the actual relevant video time windows. No partial map-2 work was started here.
