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

## Recorded wall shapes and motion

The existing `hexagonest-video.js` contains **360** approximate observed crossing masks grouped into **33** non-overlapping continuous dodge runs. Comparison with the supplied frame imagery verified six-sector bright ring motifs and prominent thick slabs in the 60–116 second gray stage. The existing source-event sequence is retained, as are its randomized **whole-chain** replay and safe-corridor stitching (requested separately by the user). A former **180-unit thickness cap** could flatten the video-observed 195–250-unit slabs; it has been removed for this stage so source-derived thick sections render without truncation.

The previously calibrated on-screen wall velocities (~307/345/337 px/s across source eras), color-change sequence, and the 33 source parts remain intact. The video transition estimates are **59.2** (desaturate) and **116.2** seconds (black/white). Timing is in video seconds, not the in-game timer at the upper right.

**Remaining differences**: original game RNG and per-frame player inputs cannot be reconstructed uniquely from a single playthrough. The individual source wall masks and widths are estimates, not pixel-perfect 3D source geometry; the game reorders *complete* observed dodge sequences at random on purpose, so no two runs are frame-identical to the recording.
