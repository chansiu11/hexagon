# Hexagon web recreation

Unofficial browser recreation of Super Hexagon. Original game: Terry Cavanagh; soundtrack: Chipzel. This is not the original game or its source code.

## Run

Use Node.js 18 or newer:

```sh
node server.cjs
```

Open http://127.0.0.1:4173/. A web server is required because music and wall timelines are loaded with fetch; opening index.html as a file is not supported. The same files can be served by a static host.

Arrow keys or A/D rotate. Space/Enter selects or retries. Escape pauses/returns. Touch either half of the game to rotate. Click or press a key to enable browser audio.

## Current implementation

- Six stages with measured camera and shape schedules covering their first 60 seconds.
- Stage one uses deterministic wall-wave actors. Members share position, speed, thickness and lifecycle. All waves use one measured speed estimate.
- The stage-one timeline and its wall geometry are preserved. Stages two through six now use stage-specific batched recorded wall waves with linked sectors, continuous movement, early offscreen entrances, bounded wall lifetime, and recorded shape transitions. Overlapping wall polygons use one union fill to avoid separate antialiasing seams.
- Runtime uses uniform camera rotation/zoom, polygon collision, music transport and local records.
- The three supplied recordings are in assets/music. Sound effects are synthesized.


- Left/right orbit movement uses symmetric controls with the original 60-Hz game's reported `arrow_speed` of **7 degrees/tick** in Hexagon, Hexagoner and their Hyper stages, and **9 degrees/tick** in Hexagonest and Hyper Hexagonest. The browser converts these to **7.330383** and **9.424778 rad/s** respectively, independent of display frame rate. Source: [SuperHexagonRE reverse-engineering notes](https://github.com/sumguytho/SuperHexagonRE#arrow_speed). This is an implementation-based calibration; a frame-by-frame video measurement has not been independently completed.
- In stage one, 165 sufficiently well-tracked walls now persist up to 0.75 seconds longer toward the center, without crossing the next recorded shape transition. An angular passage audit detects no fully sealed frames in the first 60 seconds.

## Validation

```sh
node engine.test.cjs
node rigid-walls.test.cjs
node stage-one-continuity.test.cjs
node waves.test.cjs
node wall-continuity.test.cjs
node player-speed.test.cjs
node observed-waves.test.cjs
```

The tests check geometry, collision, shared wave movement, offscreen births, entrance survival, and sampled open passages. They do not establish exact original-game fidelity or prove a continuous solution for every recorded sequence.

## Rebuild recorded geometry

The measured outline data is included in assets/timelines/stage-N.json. Build the fitted timelines in this order:

```sh
node build_rigid_walls.cjs
node stabilize_stage_one.cjs --opening
node build_stage_one_waves.cjs
node build_observed_waves.cjs
```

Stages two through six are generated only from the checked-in observed rigid-stage timelines; rebuild these with `node build_observed_waves.cjs`. Do not regenerate stage one for stage-two-through-six adjustments. Recorded source videos and local analysis caches are not included.

The observation fitting remains imperfect, so the higher-stage generator extends only well-supported walls and audits angular escape passages every 1/30 second. It clips extensions that close all sampled passages, and removes two short, conflicting observed fragments in stage six. The generated JSON records any removed source track IDs in `repair.discardedSuspectTracks`.

## Fidelity limits

Reference gameplay: https://www.youtube.com/watch?v=5mDjFdetU28

Patterns, order, speed, thickness and shape changes for all six stages are fitted from recorded footage, not authenticated original-engine constants; source-tracking errors can produce pattern mismatches. Stage-one continuity repairs cover observations starting before 10 seconds; later tracking errors remain possible. The current camera omits original perspective tilt. Palette timing, UI, voice, effects and exact music cue points are not fully matched. A run stops at its 60-second recorded coverage boundary; original post-60-second progression is not implemented. No claim of pixel-identical reproduction is made.
