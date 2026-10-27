# Super Hexagon video-trace comparison — 2026-10-27

## Source of evidence

The repository's checked-in `assets/timelines/rigid-stage-N.json` files
contain source video 5mDjFdetU28's measured wall fragments, and
`waves-stage-N.json` contains the player-facing generated wall actors.
These sources permit reproducible numerical comparisons; **they are not
original video frames**, and their tracking noise prevents claiming
pixel-perfect reproduction.

## Root cause and repair

Old `wallTimelineTime()` permanently subtracted 0.28 seconds every
time the core changed polygon sides. That correction makes the game
increasingly late relative to absolute source-video timestamps.

The updated clock freezes wall movement for the existing 0.28 seconds,
then regains those 0.28 seconds over the next 0.35 seconds, with
nondecreasing, continuous actor positions. The wall data, ID, spawn
order, observed sectors, thicknesses, player speed, audio and UI are
unchanged; stage 1's first 18 seconds are unchanged.

### Measured median absolute position error (source track start)

| Stage | Previous 18–60s | New 18–60s (model evaluation) |
| --- | ---: | ---: |
| 1 | 292.9 px | 19.9 px |
| 2 | 15.9 px | 15.9 px |
| 3 | 10.3 px | 10.3 px |
| 4 | 547.9 px | 21.1 px |
| 5 | 17.7 px | 17.7 px |
| 6 | 13.0 px | 13.0 px |

The shape morph pause is a user-requested effect, not independently
validated as exact to the original engine; source errors may remain during
and shortly after the pause, especially on stages 1 and 4.

## Comparison checkpoints

The regression workflow generates 0–60s screenshots for each level.
Especially compare 17.99, 18, 19.99, 20.10, 20.28, 20.45, 20.63 and
21.00 seconds on level 1. It also generates shots before/through/after
every other polygon-side transition. Browser screenshots are available
with both a geometry-only camera and the recorded affine camera.

`node source-geometry-compare.cjs` exports SVG triptychs showing
video-extracted trace fragments, current game wall geometry, and
their overlay at the same instant. These are measurements rather than
original video pixels; gaps are expected where no video fragment was
successfully tracked.

## Tests

- `node first-pentagon-reference.test.cjs`: golden stage 1 0–18s
- `node reference-wall-timing.test.cjs`: reference timestamp alignment
- `node wall-morph-stability.test.cjs`: shape morph / escape passages
- `node camera-wall-continuity.test.cjs`: actors / exits / zoom
- `node wall-renderer.test.cjs`: isolated wall fills
- `node browser-wall-visual.test.cjs`: Chromium pixel audit and screenshots
- `node single-video-wall-source.test.cjs`: single source and sector integrity

## Remaining limitations

Without frame-readable access to the original YouTube recording,
the generated comparisons cannot verify pixel-level original fidelity.
Original pattern generation is partly random; one deterministic
recorded run does not describe every possible original game run.
Post-60s gameplay, exact audiovisual timing and genuine original
perspective tilt remain outside this repair.
