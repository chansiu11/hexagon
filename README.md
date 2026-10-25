# Hexagon web recreation

Open index.html directly, or run `node server.cjs` and visit http://127.0.0.1:4173.

Controls: left/right arrows or A/D rotate; Space/Enter selects or retries; Escape pauses/returns; Tab opens records from level selection. Touch the left/right half of the gameplay canvas to rotate.

Includes title/options/credits/level selection/records/gameplay/pause/game over/unlock screens, six difficulty configurations, fixed-substep polygon collision, rotating background, original synthesized effect tones, local records, and 60-second Hyper unlocks. Hidden tabs pause automatically. No dependencies or external requests.

## Fidelity limits
This is an unofficial reconstruction, not the original game. Reference: official https://superhexagon.com/ trailer https://www.youtube.com/watch?v=2sz0mI_6tLQ and user-provided PC video https://www.youtube.com/watch?v=5mDjFdetU28 . The title layout follows the PC video. Geometry and lettering are redrawn. Movement/speed, generated patterns, palette timing and sound effects are approximations, not extracted original values. Original music, voice, exact typeface, all original patterns, polygon-side transitions, full post-60-second progression, online leaderboards, achievements and original ending are not included. A basic speed increase after 60 seconds is implemented instead of the full original progression. No claim of pixel-identical reproduction is made.

Original game: Terry Cavanagh. Original soundtrack: Chipzel (not bundled).

Test: `node engine.test.cjs`.
