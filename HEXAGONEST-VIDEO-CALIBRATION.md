# Hexagonest visual-motion calibration (2026-11-08)

Scope: stage **index 2 (HEXAGONEST)** only. This report updates the previous video-derived reconstruction from user-provided `UrPXBSh4mqU` (316.02-second 768×480/30fps MP4). It does **not** change HARD or RANDOM HEXAGON.

## Observed video vs reconstructed game

Unlike the source game's unavailable generator, these observations can be verified from the submitted frames. Reconstructed patterns remain approximate.

### Radial wall travel

Sampled the input video at ~15Hz; detected bright radial bands in each of six angular lanes on rings 95–258 source-screen px from the nominal center (384,240). Filtered bands by radial width 12–90px and compared matched inward-moving bands in adjacent source frames; restricted per-sample speeds to 100–800px/s. The matching is fallible around overlapping walls, camera projection changes, and sharp zoom.

| Video time | Matched observations | Approx. median radial screen speed | Old world speed × .67 canvas scale | New world speed × .67 scale |
|---|---:|---:|---:|---:|
| 1–59s | 2,956 | 307 px/s | 570 × .67 = 382 px/s | 460 × .67 = 308 px/s |
| 60–119s | 2,801 | 345 px/s | 640 × .67 = 429 px/s | 515 × .67 = 345 px/s |
| 120–305s | 11,054 total (three bins) | 337 px/s | 630 × .67 = 422 px/s | 505 × .67 = 338 px/s |

The screen-space conversion assumes the existing **Hexagonest-only** `.67` viewport scale. Camera tilt and zoom vary, so the conversions are calibrated estimates, not exact original game speed constants. The wall *arrival spacing* and reachability constraints remain separate from inward travel speed.

### Radial wall thickness

Earlier extraction compressed observed source widths as 4px buckets, then the packed decoder converted those buckets into 5-unit values. The prior generator additionally multiplied thin walls by .92 before a .67 canvas scale. This made some walls much thinner on screen than their measured radial thickness. The new stage-only world thickness `min(180, max(22, source.width*1.22))` compensates for that encoding+render scale, then preserves the original single shared collision/render mesh.

### Hue change and screen spin

The vivid wall hue was measured from the original MP4 at 0.25-second samples inside an annulus around the playfield center. The opening cycles **green (~106°), purple (~260°), orange (~18°), cyan (~194°), pink (~310°), yellow (~58°)**. The typical hue dwell is ~1.8–2.0 seconds, rather than the earlier 2.6-second fixed hue index. The 31 observed start times are now in `COLOR_EVENTS` (0–60s). Grayscale from 60s and monochrome from 120s remain unchanged.

The original view's fitted central-hexagon orientation reverses roughly every **5–6s** for the first 120s, with approximate rotation magnitude ~2.2 rad/s initially, ~3.2 rad/s later in the first minute and ~4.3 rad/s for 60–120s. The previous reconstruction incorrectly reused the random **wall-clip group** direction as its spin trigger, producing reversals far too frequently (around each 1–2 second part). The stage now has its own seeded ~5.35-second spin timeline. After 120s orientation fits are uncertain because the bright-core detector often cannot see the black/white central region, so the continuing camera motion is an estimate.

## Testing

- `hexagonest-mode.test.cjs` verifies screen velocity approximation, all 31 hue cues, 100 seeded 320-second runs, safe angular openings, spin direction/dwell and collision replays with movement modes 1/2/3.
- `browser-hexagonest.test.cjs` checks actual Chromium start, 4–305s color-era canvas snapshots, and three control modes.
- Whole repository CI checks six reference stages, HARD and RANDOM HEXAGON; the public GitHub Pages smoke test checks deployed content and real wall rasterization.

All source frames/audio stay outside GitHub. These fixes improve agreement in the measured properties; pixel-identical correspondence or original RNG identity are **not** claimed.

## Video-derived wall arrival rhythm (follow-up, 2026-11-08)

The preceding code built short 1–3-wall snippets from the 360 recorded ring crossings, but **joined snippets with an invented ~0.12–0.30-second gap**. Consequently a sampled 317-second generated run emitted roughly 115/103/342 walls in the 0–60, 60–120, and 120–305-second bands; the source extraction observed only 71/71/217 crossing events in those same bands. The source extraction is incomplete, so observed events are a calibration proxy rather than an exact original wall count.

Now, at the end of a clip, the generator samples an actual **consecutive source-video crossing gap from the matching color era**, with at most ±0.04 seconds of jitter. Within clips, it retains the actual inter-crossing intervals instead of clamping those intervals to a maximum of 1.1 seconds. The source includes repeated 0.2–0.5-second bursts and occasional 2–6.8-second pauses. Existing reachability safeguards still delay a wall when its safe gap moves too far or the previous wave has not cleared; there is no attempt to force impossible exact timing.

Across 250 deterministic 320-second seeds, generated averages in the same 0–60 / 60–120 / 120–305 bands became **72.6 / 77.8 / 233.5**, compared with video observations of **71 / 71 / 217**. The 320-second generated total ranged from 358 to 440 walls; 100-seed tests check this distribution and verify that both short clusters and longer pauses remain. Also corrected a boundary issue where a delayed wave could incorrectly retain the prior 60/120-second speed tier.

At a valid long pause, an empty playfield is intentional; browser tests now permit sparse screenshots, while requiring walls to appear in the majority of sampled frames. The stage-only JavaScript asset is versioned as `hexest-rhythm-v3` so old cached code cannot obscure the new timing on GitHub Pages. HARD, RANDOM HEXAGON and the other stages retain their previous generators and speeds.

## Pattern-family continuity (follow-up, 2026-11-08)

The previous cadence-focused update fixed clip-to-clip timing, but independently selected video snippets could still make the same six-bit wall mask repeat too often while breaking the video’s longer corridor/spoke families.

We classify each six-lane mask independently of camera orientation, using (1) the number of blocked sectors and (2) the number of contiguous blocked runs. Examples: a **5/1** mask is a single open corridor, while **3/3** is the alternating-spoke wall. The clip sampler now sometimes prefers a snippet whose first wall belongs to the same structural family as the last wall (24% weighted continuation for 0–60s and 120s+, 6% for 60–120s). If a new clip would present the *exact same* six-bit mask, it sometimes rotates that first structure by one sector; the existing reachability planner may delay the following wave for safe angular movement.

Measurements from the 360 approximate ring-crossing observations, compared with a 150-seed pre-merge simulation (reference is an imperfect video extraction, not original game RNG):

| Time window | Metric | Video extraction | Prior generator | Generator after change |
|---|---|---:|---:|---:|
| 0–60s | Exact adjacent masks identical | 10.0% | 15.8% | 11.7% |
| 60–120s | Exact adjacent masks identical | 14.3% | 18.9% | 13.1% |
| 120–305s | Exact adjacent masks identical | 12.0% | 16.6% | 13.6% |
| 0–60s | Adjacent wall families identical | 47.1% | 39.3% | 47.7% |
| 60–120s | Adjacent wall families identical | 35.7% | 33.4% | 35.9% |
| 120–305s | Adjacent wall families identical | 50.5% | 41.2% | 49.6% |

The wall arrival timing, source-width conversion, screen-space velocity, all three color eras and camera rotation were not intentionally changed. The Hexagonest-only JS cache is marked `hexest-patterns-v4`; the deployed-site browser test verifies the matching `video-family-v4` runtime marker and earlier calibration values. Existing HARD, RANDOM HEXAGON, and other stage generators remain unchanged.

100-seed regression tests independently compute the source family taxonomy, matching both exact-mask repetition and family continuity to the observed video within small tolerances. Collision-aware 3-mode replay tests still require safe traversal.

## Connected wall-contour rendering (follow-up, 2026-11-08)

The Hexagonest game reuses HARD's six-sided mesh and collision actors while intentionally setting `hardMode=false` to keep its own stage behavior. As a result, the generic renderer previously drew **each Hexagonest panel using an independent Canvas fill**. For abutting panels, the antialiasing of each independent fill can reveal thin gaps or make a thick continuous ring look segmented even when its collision geometry is intact.

A diagnostic sample of eight deterministic Hexagonest seeds across twelve instants each (96 states) contained **1,142 individual wall panels but only 676 connected, on-screen wall runs**, representing **466 unnecessary interior draw boundaries** (~40.8% of fills). The revised Hexagonest-only renderer joins panels belonging to the same wave, radial band, radius and thickness into a single contour. Crucially, it also treats sectors **5 and 0** as neighbors across the 360°/0° angular wrap, rotating each wave's drawing order to begin after an actual unblocked sector. Disjoint walls remain separate; different waves never merge. HARD and RANDOM HEXAGON continue using their existing renderer paths unchanged.

The new Chromium regression records real Canvas `fill()` call counts for a dozen deterministic Hexagonest time samples, compares them with the number of connected wall runs independently calculated from actual six-sector occupancy, and verifies both the wall meshes and current collision result remain unmodified by rendering. It requires at least one tested wall that crosses the 360° wrap and demonstrates fewer fills than raw panel counts. The public Pages browser smoke asserts `play.js?v=hexest-seamless-v5` is loaded, preventing an outdated renderer from passing the new tests.

This is a *rendering continuity* fix only. Wall arrival cadence, family choices, thickness, motion, camera, player physics and source-video content are unchanged.
