# Wall transcription review

Current status (revision 6): stage one loads `assets/timelines/waves-stage-0.json`; other stages load their `rigid-stage-N.json` files. Stage-one walls are wave actors: each actor owns its sector mask, radius, thickness and lifecycle. Members cannot independently change speed or expire. There are 44 supported multi-sector batches; uncertain observations remain separate actors. The menu layout is unchanged.

Wave births are now back-projected along their existing constant-speed trajectory to a conservative offscreen radius. Clamped time-zero births are independently checked against the initial camera. Thus no new actor is born inside the viewport, and positions at previously observed timestamps are preserved. Expiry policy is unchanged by this correction. Tests cover the birth apothem against the full viewport diagonal, including minimum zoom. The renderer uses a single nonzero compound path for all rigid wall quadrilaterals, giving overlapping geometry a union fill rather than separate antialiased seams; it does not fill genuine open gaps between non-overlapping walls. Browser checks observed an empty entrance at 0.07 s and running gameplay with wall geometry at 7.01 s.

Stage-one independent speed fits ranged from 31.86 to 1317.70 logical units/second and caused visibly inconsistent movement. All wave actors now use 327.453 units/second, the median of 139 observations with at least 30 samples and 0.5 seconds of support. This is a measured estimate, not an authenticated original engine constant. Re-anchoring at the middle of each observation preserves its measured middle position; original timing fidelity remains unverified. `node waves.test.cjs` passes atomic lifecycle, equal member geometry, a single common speed, safe entrance and a sampled open-passage audit.

Raw per-frame outline rendering was withdrawn after visible wobble and background misalignment.

`build_rigid_walls.cjs` samples radial intersections in the observed outlines, associates consecutive observations, fits constant inward velocity per track and fixes each track's thickness to its observed median. Brief adjacent track fragments are joined only when their measured position and time agree. These are fitted observations, not an exact manual wall-by-wall transcription; missed/fragmented detections and timing uncertainty can remain. No random wall generator is used.

All wall endpoints now lie on the same canonical sector rays as the background. The shared camera retains measured rotation and uniform scale with temporal smoothing, but deliberately removes shear, independent axis scaling and centre drift. Original perspective tilt is therefore not reproduced by this corrective revision. This prevents noisy image-fit matrices from deforming every object. Geometry is evaluated continuously at simulation time, rather than swapping arbitrary silhouettes each video frame.

`node rigid-walls.test.cjs` passes all six stages: equal camera axis scales, orthogonal camera axes, centred projection, wall/background ray alignment, fixed thickness, constant speed, no random calls, and safe first-second startup at 24 angles per stage. Browser DOM confirmed `wallSource=rigid-observed-tracks`; stationary first-stage collision occurred at 2.877 seconds, not on startup.

The remaining sections document earlier extraction and its limitations.

### Stage-one disappearance repair

Applied scope: 64 reconstructed tracks whose observations start before 10 seconds. Their lifetime now ends only after the outside edge reaches radius 42, behind the core. Source-supported connected sectors share one radius, velocity and thickness. Later observations retain the prior implementation. `stabilize_stage_one.cjs --opening` produces this bounded repair after `build_rigid_walls.cjs 0`.

The full-stage lifetime-extension candidate was rejected: a 0.1-second/144-angle sampled collision audit found nine fully blocked samples beginning at 16.4 seconds. That candidate is saved in `stage-one-continuity-candidate.json` for investigation, not loaded by the game. The bounded opening repair has zero fully blocked samples under the same audit. This audit does not prove the existence of a continuous playable route or exact video fidelity. Later disappearance problems and original camera fidelity remain unresolved.

Validation: `node stage-one-continuity.test.cjs` and `node rigid-walls.test.cjs` pass. Runtime timeline cache is per page load; reload is needed if the stage was already loaded before this change.

Reference: https://www.youtube.com/watch?v=5mDjFdetU28 (JTexted gameplay, not an official account).

The previous engine's `spawn()` selected pattern families randomly. It has been removed. The current engine reads frame-indexed polygon coordinates; drawing and concave/hole-aware collision use the same polygons. Input and random seeds cannot change the recorded walls.

`transcribe_walls.py` reads the locally available full video and saves individual candidate wall tracks in `wall-transcription-candidates.json`. Each track records its sector, side count and time-indexed radius/width observations. Frame indices are relative to the stage's approximate video start at 15 samples per second. No candidate is marked reviewed.

| Stage index | Candidate tracks | Rejected short tracks |
| --- | ---: | ---: |
| 0 | 284 | 966 |
| 1 | 308 | 1813 |
| 2 | 488 | 1356 |
| 3 | 261 | 1073 |
| 4 | 109 | 1257 |
| 5 | 453 | 1644 |

These are tracker fragments, **not verified wall counts**. The same wall can split into multiple tracks. Occlusion, the HUD, changing core geometry and the difference between core and wall projection make radius/sector inference uncertain. The white-background stage remains especially incomplete. Merely filtering short fragments cannot prove that the remaining walls are correct.

Visual review of video times 4–8 seconds confirms separated opposing/alternating walls followed by connected walls. It does not establish all wall identities, spawn times or transition keyframes for six stages. The contact sheet is `../../cache/wall-order-review.png`.

Do not load these rejected sector/radius candidates into `index.html`, infer missing walls, extrapolate unobserved timings, or describe them as exact original patterns.

## Outline replay and known limits

`record_wall_geometry.py` records 3,600 frames per stage (60 seconds at 60 Hz), including visible edges and holes, inverse-transformed through the matching observed camera matrix. Connected walls may merge or split; IDs are correspondence hints, not proof of physical identity. Coordinates are sampled from a 480 × 300 analysis image. This is a measured replay of one video, not the original procedural engine or a manually verified transcription of every wall.

The initial implementation used raw compressed-pixel contours and a brightness percentile contaminated by HUD text. That caused jagged edges, missing darker walls and false entrance collisions. Revised extraction uses the core foreground colour, includes the darker wall shade, closes subpixel compression gaps and simplifies contours to straight segments. Thin central outlines are excluded separately. The first 0.5 seconds of all six reference segments were visually inspected and contain no walls; these frames explicitly have empty wall lists. This is a data correction, not collision immunity.

Runtime stops at the 60-second coverage boundary rather than inventing a continuation. Entrance tilt suppression and player speed of 6 radians/second are retained. Video timing, source resolution and segmentation remain accuracy limits; do not claim pixel-perfect or exact original mechanics.

Validation: `node engine.test.cjs` checks finite geometry across all 21,600 frames, deterministic input-independent replay, concave openings, holes, collision, coverage boundaries, and startup survival at 24 starting angles for each of six stages. These are implementation checks, not independent proof of visual fidelity.
