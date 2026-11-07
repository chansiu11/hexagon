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
- The timer uses a colon separator and large whole seconds with smaller fractional digits. HARD HUD digits are vector contours measured from video seconds 4–13 of the HD recording (`hard-digits.js`); the other stages retain their original font. The timer's suffix runs in 60ths (game ticks), not hundredths. This also agrees with the public technical notes linked below.
- HD recording: visible death flash around video 104.0, frozen time 104.33, camera rotation/enlargement through ~105.0, results arriving around 105.25. The filename's 104.05 is not the displayed death score.
- Death does not paint a white outline around the hit wall or a circle around a computed contact point. The results show LEVEL/rank, LAST, record status, and retry over a central black band.

## Implemented model and estimates

`hard-mode.js` contains a separate seeded pattern generator and `HardGame`. It does not consume `waves-stage-0.json`, camera frames or wall-ID patches. Each retry receives a new seed. Pattern families are two-cell openings, stairs, alternation, separated bars, repeated tunnels and one-cell turns. A repeated family is avoided. Shape events have randomized intervals and adjacent side counts. One persistent six-track mesh deforms core, walls and the player's orbit together.

A gate planner includes the full triangle, square projection, wall thickness, the previous gate's clearance time, real 420°/s movement, 0.18s separate discrete presses and extra transition time. Collision replays test all three control modes. Lateral motion in mode 1 is clipped against existing side faces; advancing wall geometry hitting the fixed orbit is fatal. Modes 2/3 retain real landing collision.

The initial v34 values below were **estimates**, superseded by later v35/v36 revisions where stated: 220 world-units/s before 60s and 285 afterward; 22–42px radial wall thickness; 0.65s morph hold / 0.18s restart; 4.3–8.8s shape intervals; the pattern weights and delays; rotation-rate choices; tilt interpolation and pulse formula; palette waveform; the death camera interpolation. Side blocking is consistent with the user's observation but requires more dedicated near-contact reference footage to prove its exact boundary behavior. Frame differences, font strokes and voice samples have not been proven identical. The existing Courtesy audio was cross-correlated against the first 90 seconds of each recording (4kHz mono): normalized correlations 0.924 / 0.944 / 0.950, with recording offsets 3.60475s / 3.55425s / 0.69050s. This confirms the song identity; it does not establish sample-exact playback or visual beat alignment.

## Preserved paths

Stages 2–6 retain their timelines, camera code, movement speeds and lifecycle corrections. Stage 7 retains its pattern bank, songs, difficulty tiers, full-cell companion walls, random morphs and music-reactive view. Modes, records, fullscreen, loading indication and mobile controls remain available. Existing recorded-HARD tests remain as legacy engine tests; the app's new launch path is checked separately by `hard-mode.test.cjs` and `browser-hard-mode.test.cjs`.

## Additional primary technical reference

[SuperHexagonRE technical observations](https://github.com/sumguytho/SuperHexagonRE#game-mechanics) corroborate the 60-tick timer, time/wave-count/random selector, lateral angular speed, and camera state design. Its binaries and decompiled code were not copied into this project. The supplied recordings are the visual reference.


## Feedback revision: voices, wall families and death zoom

The first reconstruction omitted announcement samples, restricted most walls to 22–42px, and incorrectly enlarged the scene throughout the death pause. The revised build preloads the seven recording-derived clips documented in `assets/voice/README.md`. Announcements are separate from the music transport and survive corrective song seeks. The original death/game-over recording replaces the quiet synthesized hit when the clip is loaded.

HARD now uses a twelve-family shuffle bag: alternating spokes, moving half barriers, C openings, stairs, deep tunnels, inverse bends, thin repeated rakes, broad half walls, teeth, turning spokes, radially staggered steps and mixed-depth long walls. Thin profiles are 18px; ordinary profiles 32–52px; deep walls 100–180px, with an early tunnel in each attempt. Neighboring cell depths and ±32px offsets produce actual stepped silhouettes. Planner clearance includes the complete inner/outer extents. The orbit is kept clear throughout the actual polygon hold/deformation; post-hold arrivals are calculated in wall-motion time rather than a fixed real-time delay.

HD death frame measurements (video seconds): center remains near (479,300) in the 960×600 viewport. Fitted square radius remains ~49–67 until 104.95, then reaches ~89 at 104.983, ~130 at 105.017, ~170 at 105.05, ~209 at 105.083 and ~255 at 105.117. Results begin around 105.24. `hard-feedback.js` therefore leaves enlargement off through 0.933s after death, ramps rapidly to 5.1× by 1.10s, and shows results at 1.20s. The camera retains its existing spin direction and center; the collision world and score remain frozen. Pulse motion continues independently of the late enlargement. Source compression/sampling and the procedural live camera still prevent a claim of pixel-exact identity in every frame.


## Motion calibration (v36)

Three recordings were remeasured without copying one video wall order. `hard-motion-reference.json` records source identities, seven recognized clock readings per clip, steady-window rotation estimates, projection statistics and per-window wall-flow quantiles.

- Visible HUD clock rates are 1.041576, 1.041798 and 1.041731 game seconds per video second. HARD uses 25/24, with music transport in real audio seconds. Real player turning remains 420 degrees per physical second; clearance planning and separate step presses account for the conversion.
- Stable rotation windows (6–9s, 15–18s, 80–83s video time) support 60/120/180 degrees per game second for 0–10/10–60/60+ game seconds. Direction stays seeded; random 103–200 degree/s magnitudes are removed.
- Forward/backward-checked Lucas–Kanade wall-corner tracks (round-trip error <1px), deprojected using core-edge affine fits, give pooled medians of 298.746 before 60s (2250 tracks) and 364.378 afterward (342 tracks), normalized to the clone's 66-unit orbit. These are noisy visual estimates, not original engine constants. Gate speeds are now 300/360 rather than 220/285, retaining full-profile reachability planning.
- Measured median minor/major scale ratios are 0.9194/0.9196/0.9186. The HARD world view maintains ~0.92 vertical foreshortening instead of flattening at a one-axis zero crossing. Small shear and rare stronger perspective kicks remain bounded. The rare kick selection and waveform remain procedural estimates; their hidden original rule has not been recovered.
- One world camera transforms walls, core, arrow, trails and sector labels together. Collision polygons remain unprojected; measured death enlargement remains separate.
- The old 50ms frame cap discarded time below 20 FPS. HARD now accepts gaps through 250ms with the same 240Hz physics substeps; 10/20/60 FPS checks advance the same real-time interval. Stages 2–7 retain their timing/camera paths. Audio synchronization includes the upcoming frame interval to avoid low-FPS music rewinds.
