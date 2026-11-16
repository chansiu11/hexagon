# HYPER HEXAGONEST / 6-1 source replay preparation — INCOMPLETE

These files are isolated **source-reference utilities**, not a complete playable level.
They are deliberately not connected to the legacy engine or stages 1–5.
Do NOT use candidate masks for collision checks.

## Source review

The prompt listed 1557(20261116-003454).mp4 and 1594.mp4; the
actual available uploads were 1595(3).mp4 (828.09s, 1920x1080, 60fps)
and 1596(3).mp4 (740.79s, 1152x720, 60fps).

| Real upload | Game zero, video seconds | Source 0–60 | Source after 60 | last gameplay video second |
|---|---:|---|---|---:|
| 1595(3).mp4 | 570.85 | 570.85–630.85 | 630.85–786.95 | 786.95 |
| 1596(3).mp4 | 493.47 | 493.47–553.47 | 553.47–710.97 | 710.97 |

Offsets are estimates from in-game clock; the final clear/credits animation
is excluded. 1595 gives 3,242 source candidate frames at 15fps (216.13s).
1596 gives 3,263 frames (217.53s). Local tests for both generated tapes
passed, including sequential frames before/at/after the game 60s boundary.
The actual compressed source tapes and browser preview are in the downloadable
chat package, not on this GitHub branch.

## Regenerate from source uploads

Requires ffmpeg, numpy and opencv-python.

    python stage6/tools/extract_source.py --video "1595(3).mp4" --start 570.85 --end 786.95 --out stage6/data/1595-stage6.json.gz
    python stage6/tools/extract_source.py --video "1596(3).mp4" --start 493.47 --end 710.97 --out stage6/data/1596-stage6.json.gz
    node --test stage6/source-replay.test.mjs

After generating, import source-replay.mjs in a browser and use
loadSource("stage6/data/1595-stage6.json.gz"), frameAt and drawWalls
to inspect the sequential wall observations (never randomized).

## Important fidelity caveat

Automatic image segmentation yields only wall candidates. Some background
wedges are misidentified. This is **screen-space**, with source zoom and
camera rotation already baked in. It is NOT world collision geometry.
Wall creation times, thickness, speeds, morphs, passage correctness, UI,
player control, sound and deaths are not yet source-validated. Native
source is 60fps; this transcript samples at 15fps, so cannot be called
pixel-perfect. More analysis and cleanup are needed to finish 6-1.

## Dependency and merge rules

No task-5 completion SHA or verified task-1 replacement common engine
could be found in the repository. This preparation branch starts from
the older main commit 8f04ce2d93c9b9ac90fb83c64309c6bf7a763ab8
ONLY for isolation. Do not merge it directly into main or delete the
old stage-6 implementation. After the task-5 commit is available, import
only the isolated stage6 files onto the verified common-engine branch,
manually validate/fix the full source wall geometry and speed, and
integrate it there. 6-2 handles playable stage, random parts, and 60s
seam checks; 6-3 handles the six-map end-to-end review.

## Additional video-pixel spot check

At game times 3, 7, 12, 18, 25, 32, 40, 48 and 55 seconds, automated 320x180 grayscale-bright region comparison gave source-mask mean pixel precision of approximately 0.749 for 1595 and only 0.521 for 1596. This is a limited foreground proxy, not true polygon/collision accuracy. Both are below original-fidelity requirements; source 1596 has particularly serious false classifications. Pixel-accurate wall order recreation is therefore NOT completed. The local Node tape-data tests passed; a headless Chromium visual run could not be confirmed in this environment.

During the 6-1 preparation a task5-1-hyper-hexagoner-rebuild-20261116 branch appeared, but no verified finished task-5 source branch/commit was available for integration.
