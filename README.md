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
- The entire stage-one wall timeline is unchanged (`waves-stage-0.json`). **Stages 2-6 use the same stage-one wall-generation rules**: the same strict sector grouping (0.15 s / 10 px / 8 px), median speed from sufficiently observed tracks, constant-speed linear inbound movement, offscreen back-projected births, and the same 0.75-second maximum continuation. The stage-specific recorded order, shapes, sectors and thicknesses remain sourced from their respective recordings. Overlapping walls render as one union fill.
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

Stages two through six are generated only from the checked-in observed rigid-stage timelines using the same algorithm as stage one; rebuild these with `node build_observed_waves.cjs`. You can rebuild just a single higher stage by passing its zero-based level index, e.g. `node build_observed_waves.cjs 2` for stage three. Do not regenerate stage one for stage-two-through-six adjustments. Recorded source videos and local analysis caches are not included.

The observation fitting remains imperfect. Stage 2 has three video fragments that cannot be placed offscreen with constant-speed entry; stage 5 has one. Stage 6 has one contradictory fragment excluded, plus two speculative lifetime extensions clipped. These exceptions are preserved in each timeline's `repair.discardedSourceActors` and `repair.clippedExtensions` metadata. No special curved or accelerated entrance animation is used. Tests audit all stages at 30 samples per second for fully sealed angular passages; this does not prove a complete playable path or exact visual fidelity.

## Fidelity limits

Reference gameplay: https://www.youtube.com/watch?v=5mDjFdetU28

Patterns, order, speed, thickness and shape changes for all six stages are fitted from recorded footage, not authenticated original-engine constants; source-tracking errors can produce pattern mismatches. Stage-one continuity repairs cover observations starting before 10 seconds; later tracking errors remain possible. The current camera omits original perspective tilt. Palette timing, UI, voice, effects and exact music cue points are not fully matched. A run stops at its 60-second recorded coverage boundary; original post-60-second progression is not implemented. No claim of pixel-identical reproduction is made.
