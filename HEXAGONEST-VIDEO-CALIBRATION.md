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
