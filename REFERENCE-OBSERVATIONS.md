# Reference observations — 2026-10-26
Reference: https://www.youtube.com/watch?v=5mDjFdetU28
Inspected with YouTube paused, frame stepping in 1/30-second increments.

Observed frames:
- 3.533 s: title/menu still visible.
- 3.567 s: white frame. Cannot distinguish game flash from video editing; not added.
- 3.600 s: gameplay HUD already visible, timer running, large central polygon.
- 3.667 s: polygon substantially smaller, timer continues.
- 3.700 s: polygon smaller again.
- 3.833 s: polygon approximately normal play size.

Approximate manually measured radii, converted from 864x540 video viewport to 960x600: 280,171,124,50. These are screenshot measurements, not original engine constants. Linear interpolation between measured frames is used; there is no invented easing curve. The retained menu UI is unchanged. The former lower-menu-position-to-center motion and frozen timer are removed.

Not verified: whether the white frame is an edit, unseen frames before first gameplay frame, all subsequent rotation/tilt/pulse curves, exact audio synchronization, internal obstacle timing. Existing approximation code for these remains and is not claimed to match the original. Do not retune it without further evidence.
