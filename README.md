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
- Stage-one actors are created outside the viewport along their existing trajectories. Overlapping wall polygons use one union fill to avoid separate antialiasing seams.
- Runtime uses uniform camera rotation/zoom, polygon collision, music transport and local records.
- The three supplied recordings are in assets/music. Sound effects are synthesized.

## Validation

```sh
node engine.test.cjs
node rigid-walls.test.cjs
node stage-one-continuity.test.cjs
node waves.test.cjs
```

The tests check geometry, collision, shared wave movement, offscreen births, entrance survival, and sampled open passages. They do not establish exact original-game fidelity or prove a continuous solution for every recorded sequence.

## Rebuild recorded geometry

The measured outline data is included in assets/timelines/stage-N.json. Build the fitted timelines in this order:

```sh
node build_rigid_walls.cjs
node stabilize_stage_one.cjs --opening
node build_stage_one_waves.cjs
```

The source video and local analysis caches are not included.

## Fidelity limits

Reference gameplay: https://www.youtube.com/watch?v=5mDjFdetU28

Patterns and speed are fitted observations, not authenticated original engine constants. Stage-one continuity repairs cover observations starting before 10 seconds; later tracking errors remain possible. The current camera omits original perspective tilt. Palette timing, UI, voice, effects and exact music cue points are not fully matched. A run stops at its 60-second recorded coverage boundary; original post-60-second progression is not implemented. No claim of pixel-identical reproduction is made.
