# Task 6 — HEXAGONEST, game 60 seconds onward (work dated 2026-11-11)

## Reference and chronology
User's current supplied reference: \`1557(7).mp4\`, 1152×720, 60 fps, total 740.786 s. The prior brief named \`1557(3).mp4\`; the actual attached file for this task is \`1557(7).mp4\`.

**Video interval:** approx. 04:45–04:58 (285–298 s). The HUD timer passes 60 near video 285.2–285.5 s. In the supplied footage the arena changes from colored to monochrome around 286.2–286.5 s (game about 61 s). Grayscale layers, multibar channels and 6-sided background continue. The source run ends at approx. 297.5–298 s, showing **72.47 s** in the result screen. That is a particular recorded run, **not** a requirement to kill every random replay at 72.47 s.

## Parts and source sampling
At 480×300, 10 fps, ring occupancy was sampled at radii 65/80/100 px. Contiguous dodge flows were grouped **by their observed travel and recovery**, not by equal time slices:

| Part | Video seconds | Approx game seconds | Source events |
| --- | --- | --- | --- |
| H6-A | 287.1–288.8 | 61.91–63.63 | 5 |
| H6-B | 289.3–290.7 | 64.14–65.56 | 4 |
| H6-C | 291.1–292.9 | 65.97–67.80 | 4 |
| H6-D | 293.1–295.2 | 68.00–70.14 | 5 |
| H6-E | 295.3–297.3 | 70.24–72.27 | 6 |

**Total: 5 source candidate dodge parts and 24 candidate wall events.** Each event records a relative wall time, six-sector blocked mask, opening shift, wall thickness, speed and source timing metadata. Color occlusion and grayscale compression make angular masks and widths approximate; these are NOT recovered original engine wall codes.

The noisy source reading for H6-B's final opening was corrected from a 3-sector instant reversal to a neighboring sector consistent with the adjacent visible wall, because the raw low-resolution mask produced a provably untraversable clip. **No event count or event timing was changed.** This must not be reported as an exact source measurement.

The first post-60 wall may be born a little after 60 s. The 0–60 pre-existing walls already visible at the boundary are allowed to finish naturally; source post-60 parts are shifted forward at most as necessary to avoid on-screen popping and impossible overlaps. Part offsets remain unchanged after selecting their play start. Thus exact absolute source timing at the first seam can differ from the video.

## Code structure and immutability
- \`hexagonest-post60.js\` subclasses the existing \`hexagonest-mode.js\` class only for level 2. It never modifies its source file.
- The subclass intercepts the **exact 60.000 s boundary**, retains all already-spawned actors including stage-five filler actors, drops only not-yet-spawned future actors from the original bank, and constructs new post-60 wall actors from the new **five-part shuffle bag**.
- Only the order of complete dodge clips is shuffled. Each clip's relative event timings, masks, thicknesses and sector transitions stay fixed on replay; one whole-clip rotation aligns the first opening with the preceding exit.
- Source wall movement uses 400 world units/s, six-sided sector walls, and the existing polygon collision/sample mechanism.
- A relative, deterministic post-60 reference camera is anchored to the camera at the exact boundary. Source-derived half-second rotation keys are stepped at 30 fps. Zoom, perspective, beat-driven micromovement, and hue do **not** depend on the shuffle bag.
- Since the immutable stage-five palette already switches to gray around time 59.2, stage six intentionally remains gray at the boundary to avoid an artificial green color flash. This slightly differs from the uploaded video, which remains colored into the 60th second.
- On death, store the exact affine snapshot and immediately stop subsequent camera/shake updates; use the existing effect sounds and results scene. The original has no additional confirmed 60+ shape-changing voice cue.
- \`play.js\` and \`index.html\` add only stage-2-post60 conditionals. Existing mode-1 **±0.14 rad visual triangle steering** remains active with unchanged movement/hitbox.
- No modifications to \`hard-mode.js\`, \`hexagonest-mode.js\`, \`hexagonest-video.js\`, \`hexagonest-camera.js\`, the original stage-five 31 whole-part library, or any original assets/storage.

## Verification
- Before 60, compared derived and parent Hexagonest mesh on five checkpoint times across four seeds. No differences detected.
- Five seeds crossed from **59.97 to 60.06** with already-visible wall actors preserved. A simulated collision at game 69.00 captured an affine death-camera snapshot with stopped spin.
- At 60–75 seconds, **8 seeds** passed a 144-lane, 0.04-second coarse orbit reachability check with old+new wall obstacles.
- At 60–90 seconds, **18 seeds** passed a 96-lane, 0.05-second coarse reachability check. Neither check is a proof of reachability for all input sequences, renderer frames, or generated time horizons.
- Regression script added: \`node hexagonest-stage6.test.cjs\`. Optional browser test: \`node browser-hexagonest-stage6.test.cjs\` after starting \`node server.cjs\`.
- Browser tests were **added, but not run** in this session. Public GitHub Pages fetching through available tool did not succeed; **deployment propagation, UI appearance, live collision and reference frame-by-frame fidelity remain unverified**. SFX/video voice timestamps were not matched independently.
- Post-72.47 continuation of the camera uses a deterministic hold of the final estimated pose because the supplied run ends; there is no evidence for later original behavior.

**Task 6 only. Next task if user requests:** Task 7 — HYPER HEXAGON (0–60 s), reference 05:04–06:01. Do not modify task 1 or task 5.
