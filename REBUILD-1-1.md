# HEXAGON rebuild handoff — task 1-1

Base: `main` at `8f04ce2d93c9b9ac90fb83c64309c6bf7a763ab8`.
Current working branch: `rebuild-step-1-1-core-20261116`.

## Scope completed
- Kept `index.html`'s canvas, controls, body CSS, title, and font.
- Rebuilt `menu.js` as the sole owner of title/stage-select/options/credits/records/navigation.
- Kept six stage identifiers, names, difficulty labels and hue identifiers (0..5).
- Existing `hexagon-web-v2` saved `records`, `recordsMode2`, `recordsMode3`, and `settings` remain readable. Legacy seventh entries are discarded when next saving the six entries.
- Removed all seventh-stage menus, routing, data sources, generators and obsolete tests.
- Removed previous gameplay scripts and timeline archives for stages 0..5.
- Rebuilt `engine.js` around a map registry, physical wall actors, shared render/hit polygons, continuous movement with fixed simulation substeps, discrete/direct sector controls, death and pause.
- Rebuilt `play.js` with gameplay drawing and controller; rewrote `audio.js` with a small Web Audio transport.
- Inaccessible maps 1..5 remain selectable but cannot start or fall back into a different map.

## New stage registration API
Call `HexEngine.registerMap(index, {sourceStatus, shapes, walls, camera?})`.
Indices 0..5 only. Registration of 6 throws an error.
`shapes`: array of `{at: seconds, sides: integer}`, first at 0.
`walls`: array of `{id, spawnAt, radius, speed, thickness, sides, blocked: [sector indices]}`.

- Time is measured in seconds from the actual run's start.
- Radius, speed, and thickness are in local world pixels, world pixels/s, and world pixels respectively.
- Each wall entry creates persistent individual blocked-sector actors once; actors are not reset at 60 seconds.
- The engine computes `walls[].points` with `panelPolygon` and draws and checks collision from these identical points.
- `HexEngine.ArenaGame(level)` requires a registered map and does not pick another map as a fallback.
- Stage 0 is registered in `stages/hexagon.js` with `sourceStatus:'awaiting-video-transcription-1-2'` and **zero** walls. This is deliberate: task 1-1 does not invent video patterns.
- Stage definitions for 1..5 are deliberately absent until their future separate tasks.
- Additional video-specific transformation, camera and morphological wall-event support belongs to task 1-2/1-3; the initial registry schema is a foundation to extend, **not** a claim of visual fidelity.

## Validation
Run `node --test test/rebuilt-engine.test.cjs`, or see GitHub Actions `Rebuilt HEXAGON 1-1 validation`.
Browser tests in Chromium use injected TEST-ONLY walls; these do **not** become the production HEXAGON pattern.
Checks cover: six-menu wrap, absent seventh, legacy record read/trim, unavailable-stage handling, run start, elapsed game time, displayed walls, blocked/open sectors, movement, collision, death-time freeze, retry, pause and menu return.

## Pending for task 1-2 (do not report as completed)
- Locate game-time zero independently in both requested reference videos.
- Transcribe observed wall actors for 0..60s and 60s..end for each film, preserving continuous actors over 60s.
- Video-accurate speeds, morphs, camera, audio cues, HUD, death scene and random part playback are not yet claimed.
- The chat requested `1557(20261116-003454).mp4` and `1594.mp4`; uploads surfaced as `1595.mp4` and `1596.mp4`. Their content-to-name mapping has not been verified by task 1-1.

## Important limitations
Normal HEXAGON currently opens a mechanically functional test-ready playfield with no descending walls until 1-2. Consequently, continuous wall-gap and random-part requirements cannot yet be tested in production gameplay. The browser tests prove the shared collision/movement machinery with explicit synthetic actors only.
