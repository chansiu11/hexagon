# HARD — video-derived short wall parts (2026-11-07)

Scope: the **first HARD stage** only (internal index 0), **not** RANDOM HEXAGON (index 6). The three user-owned MP4s were analyzed locally. Original video/audio frames are **not committed**. This is a lossy visual reconstruction, **not** a recovery of the original game's source RNG, collision map, or source wall program.

## Measured evidence and method

The recordings were examined at normalized 480×300 gameplay resolution, sampled at 10 FPS. The bright/high-saturation foreground crossing a 65px radial ring was measured, with candidate arrivals selected from peaks (prominence 0.14, separation ≥0.4s). Each accepted event approximates a polygon side count, a group of blocked angular sectors relative to one open sector, and the radial duration/thickness. A segment is 1, 2 or 3 **adjacent source events** with a bounded interval and no source polygon-side change. Overlapping windows allow a large bank of short motifs without storing video pixels.

| Source video ID | Video HARD section inspected | Radial peaks before filtering | Retained event candidates |
| --- | --- | ---: | ---: |
| `VGkmTsx3HIw` — Hard 104.05 HD | from ~3.60s, 100s of play | 91 | 77 |
| `5mDjFdetU28` — PC All Stages | from ~3.55s, 100s of play | 82 | 60 |
| `aD187viql4Q` — 1456s HARD | from ~0.69s, 180s of play | 148 | 105 |

The detected events yield **436 de-duplicated 1–3-event parts**, after rejecting inconsistent transitions and unusable / fully blocked angular masks. Their original source/video timestamps can be recovered from `hard-video-parts.js`. No pixel frames or copyrighted sounds are embedded. Data may miss narrow walls, detect multiple contours as one, or shift a mask due to camera rotation/perspective and source compression. **Part count is the size of this clip bank, not a claim about the number of original engine patterns**.

The earlier source-video feature tracking found median radial wall-flow speeds of **298.746 game units/s before 60 game seconds** and **364.378 afterward** (see `hard-motion-reference.json`). The existing HARD-only **300/360** is already within those measurement tolerances; increasing it indiscriminately would be *less* faithful. This change accelerates **the cadence of new walls**, not the physical inwards velocity.

## Random construction and connection rules

- At each attempt, the seeded shuffle bag draws source parts from the full bank without repeating the same part during a short run. Its 12 weighted visual motif families remain as color/size/shape modifiers, while video-derived masks, widths and intra-part intervals drive the majority of the wall arrangements.
- A group starts from the previous opening or one adjacent lane in most cases, is allowed to rotate and mirror, and maps its reference-sector mask onto the current 4/5/6-sided polygon. Each wall protects a full-cell exit. Groups never reproduce a single fixed video order.
- The new target interval is **0.36–0.68 game seconds** where safe, with reduced inter-group padding, instead of the previous 0.78-second standard interval. The reachability planner can **delay** any requested arrival that needs extra movement time. Deep corridors and 18px thin bars remain.
- Multiple successive walls may overlap in travel time **only if the exit remains identical**. The planner retains the maximum clearance of that whole layered corridor before it permits a turn to a different exit. Existing collision tests and three controller modes are unchanged.
- Scheduled polygon events still pause/deform walls together through the existing 0.18-game-second HARD morph: old actors remain continuous, the player's lane is carried with the polygon and destination-name voice cues are unchanged. Other stage scripts are unchanged.

### Quantitative before/after

For 100 deterministic seeds, old generator typically produced ~119 walls per 120 game seconds. The revised source-spliced generator produced **133–150, mean ~141.3 walls per 120 game seconds**, an approximately **19% greater average wall arrival count**. This is intentionally a brisker reconstruction, not an assertion that the original always uses that number. All 436 parts were selectable across these seeds and all 3 source videos contributed to runs.

## Validation

- `hard-video-parts.test.cjs`: structural integrity of all 436 snippets, all 3 sources, deterministic variety, 100 seeded runs and fully open escape sectors.
- `hard-mode.test.cjs`: 100 seeds × 3 controllers × 120 game seconds of collision-aware movement replay; overlapping safe tunnels and changed exits covered by normal physics.
- `hard-variation.test.cjs`, `hard-motion.test.cjs`, `browser-hard-mode.test.cjs`, `browser-hard-feedback.test.cjs`, `browser-hard-motion.test.cjs`: preservation of wall motifs, source-measured travel speed, speech cues, morphing, death effects, and Chromium rendering.
- The standard GitHub Pages deployment workflow checks the cache-busted script `hard-segments-v39` and screenshots the live page.

Approximate angular masks cannot prove that every snippet matches the original source frame or that every human input can survive. The game deliberately prioritizes playable combinations over exact replication of an inaccessible hidden generator.
