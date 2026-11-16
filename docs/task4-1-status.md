# 작업 4-1 — HYPER HEXAGON 독립 영상 순차 벽 재생 상태
2026-11-16

## 작업 시작점
- Base: `rebuild-step-3-1-hexagonest-20261116` @ `1a429d1b5a33172d7b0dd37a87f85fb1eccca7c6`.
- Work branch: `rebuild-step-4-1-hyper-hexagon-20261116`.
- Stage index 3 (fourth map), only chronological video-wall replay. Stage 5/4-2 not started.
- Original prompt mentions `1557(20261116-003454).mp4` and `1594.mp4`, **not attached to this chat**. Actual directly read files: `1595(3).mp4` and `1596(3).mp4`.
- An unrelated older `task4-1-hyper-sequential-20261116` branch descends from the legacy engine, not Task3. No code from that branch copied.

## Source segments
| source | recorded screen size | stage4 start / end (video clock) | approximate game clock | sampled snapshots |
| --- | --- | --- | --- | --- |
| `1595(3).mp4` | 1920×1080, 60fps | 382.99–472.59s | 0–93.333s | 1,793 at 20fps |
| `1596(3).mp4` | 1152×720, 60fps | 303.32–398.57s | 0–99.219s | 1,906 at 20fps |

Both source clips include 0–60s and beyond, with a **single continuous frame sequence** across 60s. Approximate HUD-derived game rate 25/24, cannot certify exact source clocks. The MP4s contain additional stages, menus and recording transitions outside the stated ranges, not imported as HYPER HEXAGON walls. Both 20fps traces are drawn from **this upload**, not stage1 HEXAGON walls or legacy HYPER code.

## Files and integration
- `data/hyper-hexagon-1595.b64`, `data/hyper-hexagon-1596.b64`: compressed HXRF source-frame foreground polygons, includes per-frame 20fps camera/core approximations. **Per-frame silhouettes, not original engine wall creation records**.
- `data/hyper-hexagon-{1595,1596}-palette.json`: independent 20fps RGB sequences.
- `data/hyper-hexagon-sources.json`: provenance and data limitations.
- `stages/hyper-hexagon.js`: registers only stage4; both source recordings and zero procedural wall entries.
- `engine.js`, `replay.js`, `play.js`, `index.html`: load stage4 source replays and palettes, maintain other maps' source bindings.
- Source-start alignment: rejected one 1595 transition frame at 382.94s (source begins 382.99s), and prepended 4 previously omitted source frames for 1596 (source begins 303.32s instead of 303.52s). Both palette banks now align to geometry at 20fps.\n- Original ~0.1–0.8s colored alternating background sectors were sometimes misread as incoming wall polygons. Removed false 60k-pixel color regions only during stage4 source launch. Both non-spectator intros were tested against death before 0.7 game seconds.\n- Chronological playback: `?trace=1595` or `?trace=1596`, default stage4 source is 1595. **No phrase randomization yet**. Former 7th RANDOM map remains absent; `menu.js` untouched.

## Executed checks
- 20fps decoder: 1595 1,793 frames and 1596 1,906 frames. Both have visible wall silhouettes pre/post 60s. Longest consecutive no-foreground samples after source alignment and opening-background filtering, measured maximum no-foreground spans 1595 16 frames (~0.833 game seconds), 1596 17 frames (~0.885 game seconds). First observed wall silhouette arrives before one game second in both recordings, **does not measure wall generation gaps**.
- Node unit suite on actual source files and Chromium browser with both source replays: source 0–60 / 60+, no reset at 60, open orbit corridor, blocked orbit triggers death, retry and menu navigation, screenshots. 4-1 Actions run 43870667175 on SHA 488fdf478665e50395e3864003f7b1d1b04b7280 concluded **success**: https://github.com/chansiu11/hexagon/actions/runs/43870667175.
- Source and browser regressions for map1–3 added later in same branch; check the latest run's final verdict separately.
- Existing repo-wide workflow test/rebuilt-browser.test.cjs fails even on base Task3: it incorrectly expects HEXAGONEST to be unavailable, although Task3 registered that map. The old test's failure is **not** itself proof of a stage4 gameplay regression.

## Remaining differences / do not call pixel identical
1. Direct source videos are 60fps, but full extraction was interrupted; stage4 bank is **20fps**. Interim interpolation and walls moving faster than frame cadence may differ from source video. Re-extract at 60fps and compare the full source-frame sequence.
2. Foreground polygons measured from source pixels combine moving walls and camera motion. Individual original spawn timestamps, radial speeds, thicknesses, lane bearings, shape-change rules, actor identity under cut/morph and continuous collision paths are **not independently reverse engineered**. Need a stronger wall-actor correspondence audit and video-vs-browser pixel IoU.
3. The no-wall gap audit is not an arrival-event audit: cannot certify every newly entering wall arrives within <=1s. That test belongs with part building; source-mode long idle gaps remain subject to validation.
4. Start ship bearing, stage-specific player speed, camera rotations/zoom, angle changes, tilted camera, hard shakes, synced sound/voice, exact HUD and death animation are not done in 4-1; scheduled in 4-2.
5. Two-video corridor/source replay passes do **not** prove original full runs are continuously survivable under human-speed inputs. Part connectivity, 60s transition and random selection not yet implemented.
6. Since `1557(20261116-003454).mp4` and `1594.mp4` were absent, those particular files and their game-clock coverage are **unverified**. Do not represent the other uploads as those filenames.

## Next
**4-2: address remaining verified 4-1 fidelity gaps if they affect joining, divide independent source timelines into pre-60 and 60+ dodge phrases, ensure traversable transitions with <=1s arrivals and no in-flight wall loss, then HUD/controls/camera/voice/death and browser video comparison. Do not start until the user says “이어서”.**
