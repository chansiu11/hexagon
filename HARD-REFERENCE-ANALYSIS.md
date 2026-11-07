# HARD reconstruction from supplied recordings (2026-11-07)

This is an independent reconstruction, **not a verified identical implementation of Super Hexagon**. The original source, random-number generator and complete pattern selector were not supplied. Do not describe this change as pixel-perfect or algorithm-identical. The new HARD branch is separate from stages 2–7.

## Evidence

Three user-supplied MP4 recordings were decoded locally. Source media is not redistributed in this repository.

| Recording | Frame size / fps | Examined gameplay |
| --- | --- | --- |
| VGkmTsx3HIw, HARD 104.05 | 1920×1080 / 30 | First 109 seconds, including death |
| 5mDjFdetU28, all stages | 1152×720 / 60 | HARD opening through 112 video seconds |
| aD187viql4Q, HARD long run | 1280×720 / 60 | First 180 video seconds |

The actual playing field is 16:10. The 16:9 recordings contain horizontal side margins. Frames were normalized to 960×600 before comparing geometry. Core outlines were extracted at 10 samples/second using saturated bright contours enclosing the screen center, approximated as polygons, and regular polygons fitted by affine least squares. Fits with large residuals should not be used as camera measurements. `hard-reference-measurements.json` contains the transition observations (video times, **not game times**) and source identities. Detection is approximate to ~0.1 seconds and can be obscured when walls join the core.

### Confirmed visible behavior

- All three recordings begin with a hexagon. Subsequent outlines include pentagons and squares. Changes go via 5: no observed direct 6↔4 transition.
- Their shape sequences differ. At video time ~30, HD is hexagonal while the other two are pentagonal; at ~45, HD is hexagonal and the other two pentagonal. A single fixed timestamp/shape table cannot reproduce all recordings.
- First stable pentagons are detected at video times 23.967, 23.783 and 23.483 respectively. Their gameplay start times differ, so these are not interchangeable game timestamps.
- Bright walls follow the same polygon edges as the center and background. Multiple sides of one ring are connected. A shape change must deform existing wall vertices rather than replace/discard actors.
- Warm reds/oranges/yellows precede 60 game seconds; cyan/blue palettes follow it. The former monotonically increasing hue used in this project does not describe these recordings.
- The timer's suffix runs in 60ths (game ticks), not hundredths. This also agrees with the public technical notes linked below.
- HD recording: visible death flash around video 104.0, frozen time 104.33, camera rotation/enlargement through ~105.0, results arriving around 105.25. The filename's 104.05 is not the displayed death score.
- Death does not paint a white outline around the hit wall or a circle around a computed contact point. The results show LEVEL/rank, LAST, record status, and retry over a central black band.

## Implemented model and estimates

`hard-mode.js` contains a separate seeded pattern generator and `HardGame`. It does not consume `waves-stage-0.json`, camera frames or wall-ID patches. Each retry receives a new seed. Pattern families are two-cell openings, stairs, alternation, separated bars, repeated tunnels and one-cell turns. A repeated family is avoided. Shape events have randomized intervals and adjacent side counts. One persistent six-track mesh deforms core, walls and the player's orbit together.

A gate planner includes the full triangle, square projection, wall thickness, the previous gate's clearance time, real 420°/s movement, 0.18s separate discrete presses and extra transition time. Collision replays test all three control modes. Lateral motion in mode 1 is clipped against existing side faces; advancing wall geometry hitting the fixed orbit is fatal. Modes 2/3 retain real landing collision.

These are **estimates**, not verified original constants: 220 world-units/s before 60s and 285 afterward; 22–42px radial wall thickness; 0.65s morph hold / 0.18s restart; 4.3–8.8s shape intervals; the pattern weights and delays; rotation-rate choices; tilt interpolation and pulse formula; palette waveform; the death camera interpolation. Side blocking is consistent with the user's observation but requires more dedicated near-contact reference footage to prove its exact boundary behavior. Frame differences, font strokes, voice samples and music phase have not been proven identical.

## Preserved paths

Stages 2–6 retain their timelines, camera code, movement speeds and lifecycle corrections. Stage 7 retains its pattern bank, songs, difficulty tiers, full-cell companion walls, random morphs and music-reactive view. Modes, records, fullscreen, loading indication and mobile controls remain available. Existing recorded-HARD tests remain as legacy engine tests; the app's new launch path is checked separately by `hard-mode.test.cjs` and `browser-hard-mode.test.cjs`.

## Additional primary technical reference

[SuperHexagonRE technical observations](https://github.com/sumguytho/SuperHexagonRE#game-mechanics) corroborate the 60-tick timer, time/wave-count/random selector, lateral angular speed, and camera state design. Its binaries and decompiled code were not copied into this project. The supplied recordings are the visual reference.
