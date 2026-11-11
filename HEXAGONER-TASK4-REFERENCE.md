# Task 4 — HEXAGONER after 60 seconds (plus requested mode-1 triangle lean)

Reference: current user upload \`1557(7).mp4\` (the original task brief named \`1557(3).mp4\`; only the current upload is available here).

## Video analysis

- Source review window: ~**02:56.8–03:44.5** in the recording.
- On-screen timer reaches **60 seconds at ~02:56.9**, determined from consecutive video timer frames at 175s=58.09, 176s=59.11, 177s=60.14.
- After this time the background becomes light, the center stays six-sided, and colored walls shift between blue, violet, magenta/pink, and other hues.
- The provided recording shows a **108.34 s result screen** at about video 03:44.5; this is the observed end of that particular run, NOT a deterministic kill time to impose on all random replays.
- At 480×300 and 10 fps, radial hue-saturation occupancy near the orbit was sampled to extract candidate crossing events, sector masks and approximate wall thicknesses. On this approximate analysis, there are **15 linked dodge motifs**, containing **60 wall events**.
- A sixfold center-ring phase estimate was unwrapped and sampled into a 49-key camera trajectory. Hue keys and short stepped beat movement are deterministic functions of elapsed game time, not shuffled with wall parts.
- **Fidelity limits:** compressed/occluded thin walls, video color/tilt perspective, and all actor births/masks could not be reconstructed pixel-exactly. Some source lane changes are especially uncertain. The numbers are approximations, not the actual original source level data.

## Architecture

\`hexagoner-post60.js\` is a stage-specific subclass of \`hexagoner-parts.js\` \`HexagonerGame\`:

- At exactly game time 60, divide the update step.
- Preserve all pre-60 waves already spawned and let them finish naturally; do not abruptly remove or reposition them.
- Replace the list of future spawns with the newly measured post-60 parts. The 0–60 source bank cannot newly spawn after the boundary.
- Whole dodge clips play with their original internal relative offsets, blocked-cell masks, and widths; only the order of whole clips is shuffled per run.
- Choose a whole-part angular alignment using the previous exit corridor. Do not independently randomize each wall's orientation.
- All new waves are spawned beyond the game viewport, no earlier than game 60.
- Camera, tint, pulse and microshake are time-only effects and stop when the game dies.
- Existing audio cues, collision detection, control modes and death/result logic remain in use.

The original source data for the first minute remains at 21 parts / 715 recorded actors. The existing stage-one HEXAGON engine and stage-five HEXAGONEST module were not modified.

## Mode-1 triangle steering (explicit additional user request)

Only renderer code in \`play.js\` was changed:

- While the left/right key is held in control mode 1, display triangle can yaw up to **±0.14 rad = ±8.0°** toward the travel direction.
- It eases in on press, and eases back to radial orientation when the key is released.
- This is **visual-only**: orbit angle, player speed, hitbox and collision logic are untouched.
- Modes 2 and 3 retain the previous display geometry.

## Verification and caveats

- Isolated 0–60 HEXAGONER wall geometry and camera were compared across several seeds; no difference was observed.
- Six seeded continuations, approximately 79–83 new walls per run, had valid numbers and no fully sealed six-cell orbit on sampled frames.
- A coarse 144-angle reachability simulation found a possible route for eight seeds over the newly authored post-60 waves alone. **This is not a proof that every run is beatable**, and it does not certify the inherited 0–60 wall combinations.
- Existing first-minute walls are preserved by id/source geometry when switching.
- Regression file: \`node hexagoner-stage4.test.cjs\`, plus existing \`node hexagoner-parts.test.cjs\` and \`node hexagoner-stage3.test.cjs\`.
- **Unverified:** actual GitHub Pages browser play, visual frame-by-frame parity, audio/voice timestamps vs recording, every possible random sequence, first-minute-to-later continuous player route, the exact 108.34-second result presentation.

Task 4 only. Next on request: **Task 6 (HEXAGONEST after 60)**. Task 5 remains protected.
