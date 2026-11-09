# Hexagonest — supplied-video frame analysis (2026-11-09)

Source: user-provided `1556.mp4`; 768×480 H.264, 30fps, 9,479 frames, 316.023583 seconds. This video is a **reference**, not a distributable game asset. The video is not committed to this repository.

## Measured arena motion

Decoded all 9,479 frames and extracted the center hexagon boundary contours on every second frame: 4,740 frame samples, of which 4,298 provided a usable six-corner polygon. At each valid sample the median vertex orientation modulo 60° was calculated from the sixth circular harmonic. The consecutive-frame angular derivative resolves the spin direction and speed without requiring the source game code.

- Approx. 0–5.4 seconds: **−2.2 rad/s** (131°/s).
- Approx. 5.4–59.2 seconds: alternating **±3.25 rad/s** (186°/s).
- Approx. 59.2–116.2 seconds: alternating **±4.3 rad/s** (246°/s).
- At **116.2 seconds**: black/white level begins and the core visibly stops spinning; reset rotation and remove camera tilt in that segment.

Measured reversal anchors (seconds, ± about 0.1 s):
`0, 5.4, 10.5, 15.5, 21.8, 27.1, 32.9, 38.9, 43.8, 48.9, 53.8, 63.6, 69.1, 73.7, 76.6, 81.9, 87.3, 91.5, 97.1, 100.1, 104.5, 111.3, 116.2 (stop)`.

The turn intervals are genuinely uneven, rather than the old random 5.35±0.325-second spin events. Exact easing through a reversal is uncertain due to frame blur and core-outline detection noise; a short exponential interpolation remains.

## Screen, core and wall proportions (rechecked 2026-11-10)

The original movie has a **768×480** image (16:10); the HTML canvas
uses **960×600** virtual units, the same 16:10 aspect ratio. Therefore the
old apparent size mismatch was not letterboxing: Hexagonest previously
scaled its entire arena to 0.67, shrinking both core and walls.

Frame **125.0 s** in the monochrome portion provides an easy measurement:
the central white hexagon spans pixel **x=339..427 at y=240** (89 px
including outline); a thin slanted white bar is about **27.6 px**
perpendicular to its direction. The new Hexagonest-only parameters are:

- Arena scene scale **1.08**; its 50-unit core has a projected diameter
  **86.4 px before the white outline**, matching the observed ~89 px.
  The native core outline uses 5 world units.
- Nominal 35-pixel thin source wall becomes **35×0.92×1.08×(768/960)
  ≈ 27.82 px**. The same linear conversion applies to gray thick slabs.
- World wall speeds **355 / 400 / 390** units/s by era, yielding video
  flow **306.7 / 345.6 / 337.0 px/s**, compared to tracked medians
  ~307 / 345 / 337 px/s. This calculation includes BOTH the scene
  scale and the 768/960 viewport ratio.

## Recorded wall shapes, continuous parts and seamless joins

`hexagonest-video.js` retains the **360** approximate source wall
crossings without reordering or omitting source events. They are now
organized into **31 non-overlapping dodge parts** (6 colorful, 4 grayscale,
21 monochrome). A part runs until a source recovery pause of 1.75 s;
extra-thick slabs (source width >100) stay visibly active longer, so their
uninterrupted chains use a 2.3 s boundary. Entire 20–37-wall stretches
remain intact rather than being cut into short, disconnected fragments.

The generator seeds a randomized, no-repeat bag per source era. On every
part join, it considers the previous escape corridor, the first incoming
mask and the entry/exit wall width. It picks randomly among the three
best-compatible available **complete parts**; the selected part keeps one
consistent rotational alignment for all its walls. Within a part, the
original source offsets, six-sector masks, measured widths and event order
are preserved. The same wall actors progress continuously through each
join: no wall is hidden or teleported by a rendering seam. If necessary,
individual impact crossings are modestly delayed to maintain a reachable
escape, and the delay is recorded in `sourceDelay` for auditing.

The estimated video transitions are **59.2** (desaturate) and **116.2**
seconds (black/white), independent of the randomly replayed wall chains.

**Remaining differences:** the original game's RNG and frame-by-frame
player inputs are unavailable from the movie. Some event masks and wall
widths are estimates, not recovered original game assets or pixel-perfect
polygon traces. Deliberately randomized complete-part order cannot produce
the identical timeline of the original recording.
