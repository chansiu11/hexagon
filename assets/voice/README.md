# Gameplay announcement recordings

Source: the user's supplied `VGkmTsx3HIw` HARD recording, not downloaded game asset files. Mono 22.05kHz MP3 excerpts; background music was reduced by aligning the existing Courtesy recording (3.6046712s offset), estimating a frequency-dependent transfer function from instrumental frames, and subtracting it. Compression residue remains; these are not isolated studio stems.

| File | Source video seconds | Playback event |
| --- | --- | --- |
| begin.mp3 | 3.59–4.45 | New attempt |
| line.mp3 | 13.17–13.94 | 10 seconds |
| triangle.mp3 | 22.78–23.78 | 20 seconds |
| square.mp3 | 32.36–33.19 | 30 seconds |
| pentagon.mp3 | 46.76–47.79 | 45 seconds |
| hexagon.mp3 | 61.16–62.16 | 60 seconds |
| death.mp3 | 103.97–105.72 | Collision / game-over sound and voice |

All clips preload before an audible attempt. Explicit retry/pause stops pending clips; a corrective music seek preserves a playing announcement. Sound-off mutes both the song and announcements. No browser speech-synthesis voice is used.

In HARD v36, Square/Pentagon/Hexagon are triggered by the actual polygon morph start instead of the rank milestones above. The fixed rank cues remain for other stages. Begin and Death are unchanged.

## Background-music reduction, all stages (2026-11-08)

The recordings in this folder were captured from the user's HARD gameplay video; the electronic backing track was phase-subtracted once, but some instrumental residue and MP3 compression artifacts remained. **Keep the historical files in this directory unchanged for fallback.** The seven new, speech-focused replacements live under `assets/voice/clean/*.mp3`.

The offline, reproducible processing script is `scripts/clean-voice.py`, which uses FFmpeg, NumPy and SciPy. It preserves source clip duration and spoken timing and applies a conservative voice-band filter (125–5600 Hz), a soft frequency/time-smoothed spectral noise mask, a gentle syllable-aware downward expander and short anti-click fades. `assets/voice/clean/report.json` contains original/processed RMS measurements, length and low-level start/end background attenuation. This test **does not measure perfect voice/music separation**; residual instrumental energy under voiced syllables may remain. The old source files remain available to compare or revert.

To regenerate the seven cleaned MP3s from the originals (with Python/FFmpeg installed):

```sh
python -m pip install numpy scipy
python scripts/clean-voice.py
```

**Also separate the live game track from voice playback.** `BeatAudio` now sends the game BGM through its own `musicBus`, while voices bypass it. When an announcement starts, only the live BGM fades down to 14% volume (about **−17.1 dB**) over 55ms, remains low for the recording, then smoothly recovers in 240ms. The original voice gain remains unchanged. This applies to **every stage**, including HARD, Hexagonest and RANDOM HEXAGON. The game's music/effects are not repackaged and the wall systems are untouched.

`BeatAudio.loadVoices()` prefers cleaned assets with a cache-busted URL; if one cleaned file is inaccessible, it explicitly falls back to the corresponding historical MP3 to avoid breaking game launch. A Chromium regression test verifies all seven clean audio recordings are decoded and used, the measured non-voice edges are quieter, and the BGM ducks and restores correctly across all seven stages.

Note that the spoken level names in non-HARD stages are scheduled via the established milestones; no polygon morphs or gameplay changes were added to trigger speech.
