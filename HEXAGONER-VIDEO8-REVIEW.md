# HEXAGONER tasks 3 & 4 – video 1557(8).mp4 reanalysis

Reference: user-uploaded \`1557(8).mp4\` (1152×720 @ 60fps, 740.68 s).
This task addresses **only** the 0–60 s and 60+ HEXAGONER segments (video approximately 01:59–03:44). Tasks 1 (HEXAGON), 2 (HEXAGON 60+) and 5 (HEXAGONEST 0–60) were not modified.

## Findings

The previously active HEXAGONER task 3 used 715 fragment traces sourced from another video (\`5mDjFdetU28\`), not the current user video. Task 4 used 15 hand-approximated parts and a camera artificially zoomed to ~0.8. Its color gradients were also inaccurate. These old code modules are still present for comparison but are no longer used when playing HEXAGONER.

**Source measurements (approximate):**
- At 480×300 and 10fps, center-orbit bright colored-band occupancy was sampled at radial distances of 25–43px, yielding **134 candidate crossing events**: 70 before 60 s and 64 after.
- At those candidate timestamps the bright-band radial thickness was measured separately; the world thickness is estimated as \`2 × source_px_width / camera_magnification\`, bounded to 22–116 world units.
- Crossing events were grouped into 15 contiguous 0–60s dodge clips and 10 contiguous post-60 clips using a 1.0s observed recovery gap. Whole clips preserve source-relative event offsets and masks. Only the clip order and one complete clip orientation are changed during replay.
- The source's dark green/yellow/orange progression and later white-backed blue/violet/pink progression use separate source-derived HSL keys. Color and camera depend only on game time, never the randomized wall sequence.
- The 15fps first-minute affine camera profile is reused for original phase/shear, but scaled to 60 one-second median **interior center-ring radius** measurements from this recording. The later era uses 50 further one-second core-radius samples and the original post-minute phase-change timetable. The 60s scale ratio is ~0.96 rather than an abrupt ~0.805.
- In the uncertain post-60 screenshot lane decoding, **four** direction masks were reinterpreted once as part of source extraction (near game 91.7, 95.2, 95.8, 106.2 s). This is a documented corrective approximation, not a claim of pixel-exact source recovery. No event counts, source offsets, or measured widths were modified by this correction.
- HEXAGONER player movement stays at the 7°/60Hz-step stage-specific reference, **420°/s**; the existing mode-1 visual steering of ±0.14rad remains cosmetic only. Core radius, player orbit radius, collision center and canvas dimensions are not changed globally.
- The next (post-60) list cannot spawn before 60s. Previously visible walls finish naturally instead of being erased at the boundary.

## Changed files

- \`hexagoner-video8-data.js\` (new, video-derived candidates, width, color, zoom)
- \`hexagoner-video8.js\` (new, phase-aware clip decoder, shuffled replay, stage-only gameplay)
- \`index.html\` (load new stage-specific modules)
- \`play.js\` (use new HEXAGONER timeline/renderer/palette on both launch and control-mode restart)
- \`hexagoner-video8.test.cjs\` (new regression test)

## Verification and remaining differences

Validated in-memory with the actual repository engine:
- 134 source candidates, 15+10 clips, four corrected lane directions.
- 12 seeded timelines, ~156–158 new wall rings per full 115s play.
- Sampled polygon coordinates remain finite; no frame in the sampled 0–108s windows closed all six sectors.
- A conservative 144-angle, 0.05s temporal reachability solver found at least one movement path for all 12 seeds through 108s. It tests approximate sector/orbit collision and **does not prove every random game can be beaten**.
- Crossed the 60-second boundary in a live engine update at time 60.03 with no crash, no death and six-sided geometry.
- Updated game script still has the mode-1 triangle lean; all task-1/2/5-specific modules remain unchanged.

**Unverified:** actual GitHub Pages browser run and screenshot overlay comparison, pixel-accurate wall masks, perfect wall birth timing, exact source voice/sound timings, every random sequence, and post-108s original behavior. The reference footage is compressed and wall segmentation is an approximation. No video or soundtrack was uploaded to the repository.

This commit does **not** begin task 7. The user explicitly prioritized tasks 3 and 4.
