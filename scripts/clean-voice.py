#!/usr/bin/env python3
"""Reduce residual backing music in the seven user-supplied gameplay voices.

The stored MP3 samples already had the song phase-subtracted once, but each
retains some lossy-compression and instrumental bleed.  This conservative
second pass combines speech-band filtering, frequency-adaptive spectral
gating, and gentle word-envelope expansion.  It is OFFLINE: run only when
creating assets, never in the game's real-time audio callback.

Do not overwrite the historical recordings; generate assets/voice/clean/ so
they can be compared or reverted without changing any original source file.
"""
from __future__ import annotations
import json
import math
import pathlib
import subprocess

import numpy as np
from scipy.ndimage import gaussian_filter, gaussian_filter1d
from scipy.signal import butter, sosfiltfilt, stft, istft

ROOT = pathlib.Path(__file__).resolve().parents[1]
ORIGINAL = ROOT / "assets" / "voice"
CLEAN = ORIGINAL / "clean"
NAMES = ("begin", "line", "triangle", "square", "pentagon", "hexagon", "death")
SAMPLE_RATE = 22050


def pcm(path: pathlib.Path) -> np.ndarray:
    result = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(path),
         "-ac", "1", "-ar", str(SAMPLE_RATE), "-f", "f32le", "-acodec",
         "pcm_f32le", "pipe:1"],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    return np.frombuffer(result.stdout, dtype="<f4").copy().astype(np.float64)


def encode(path: pathlib.Path, y: np.ndarray) -> None:
    pcm32 = np.asarray(np.clip(y, -0.995, 0.995), dtype="<f4")
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f",
         "f32le", "-ar", str(SAMPLE_RATE), "-ac", "1", "-i", "pipe:0",
         "-codec:a", "libmp3lame", "-b:a", "96k", "-ar",
         str(SAMPLE_RATE), "-ac", "1", str(path)],
        input=pcm32.tobytes(), stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, check=True,
    )


def rms(x: np.ndarray) -> float:
    return float(np.sqrt(np.mean(x * x) + 1e-20))


def clean_voice(x: np.ndarray) -> np.ndarray:
    # Human narration has far less useful energy below 125 Hz than the
    # electronic bass track, and little intelligibility above ~5.5 kHz.
    sos = butter(4, [125, 5600], btype="bandpass", fs=SAMPLE_RATE,
                 output="sos")
    band = sosfiltfilt(sos, x)

    # Per-bin noise/music floor estimated from quiet time-frequency cells.
    # A minimum mask of .13 avoids thin metallic/robotic syllables.
    frequencies, times, spectrum = stft(
        band, fs=SAMPLE_RATE, nperseg=1024, noverlap=768,
        boundary="zeros", padded=True,
    )
    magnitude = np.abs(spectrum)
    floor = np.quantile(magnitude, .29, axis=1)
    floor = gaussian_filter1d(floor, 2.8)
    attenuation = 1 - 1.48 * floor[:, None] / (magnitude + 1e-9)
    attenuation = np.clip(attenuation, .13, 1.0)
    attenuation = gaussian_filter(attenuation, sigma=(1.1, 1.1))
    _, filtered = istft(
        spectrum * attenuation, fs=SAMPLE_RATE, nperseg=1024,
        noverlap=768, input_onesided=True, boundary=True,
    )
    filtered = filtered[:len(x)]
    if len(filtered) < len(x):
        filtered = np.pad(filtered, (0, len(x) - len(filtered)))

    # Duck MUSIC between words, not the words themselves. This envelope is
    # calculated only from the voice-band input, with ~30ms smoothing.
    window = max(1, int(SAMPLE_RATE * .018))
    envelope = gaussian_filter1d(band * band, max(1, window / 2))
    envelope = np.sqrt(np.maximum(envelope, 0))
    peak = float(np.quantile(envelope, .94))
    if peak > 1e-7:
        activity = np.clip((envelope / peak - .045) / .13, .09, 1.0)
        activity = gaussian_filter1d(activity, SAMPLE_RATE * .024)
        filtered *= activity

    # Smooth start/stop prevents gating clicks when a clip is triggered.
    edge = max(1, int(SAMPLE_RATE * .012))
    fade = np.sin(np.linspace(0, np.pi/2, edge))**2
    filtered[:edge] *= fade
    filtered[-edge:] *= fade[::-1]
    max_peak = float(np.max(np.abs(filtered)))
    if max_peak > 1e-8:
        filtered *= min(1.6, .86 / max_peak)
    return np.asarray(filtered, dtype=np.float64)


def main() -> None:
    CLEAN.mkdir(parents=True, exist_ok=True)
    reports = []
    for name in NAMES:
        source = ORIGINAL / f"{name}.mp3"
        if not source.exists():
            raise FileNotFoundError(source)
        original = pcm(source)
        improved = clean_voice(original)
        if not np.isfinite(improved).all():
            raise ValueError(f"{name}: invalid processed audio")
        if len(original) != len(improved):
            raise AssertionError(f"{name}: sample duration changed")
        ratio = rms(improved) / rms(original)
        if not (.10 < ratio < 2.2):
            raise AssertionError(f"{name}: speech attenuated unexpectedly {ratio:.3f}")
        destination = CLEAN / source.name
        encode(destination, improved)
        decoded = pcm(destination)
        if abs(len(decoded) - len(original)) > SAMPLE_RATE * .08:
            raise AssertionError(f"{name}: encoded clip length changed")
        tail = max(1, min(int(.08 * SAMPLE_RATE), len(original) // 6))
        # Quantify the low-level music/room-noise reduction in clip edges;
        # this is a proxy, NOT an objective vocal-stem separation score.
        edge_before = rms(np.r_[original[:tail], original[-tail:]])
        edge_after = rms(np.r_[improved[:tail], improved[-tail:]])
        delta_db = 20 * math.log10((edge_after+1e-9)/(edge_before+1e-9))
        report = dict(name=name, duration=round(len(original)/SAMPLE_RATE,3),
                      input_rms=round(rms(original),5),
                      output_rms=round(rms(improved),5),
                      edge_noise_change_db=round(delta_db,1),
                      size_bytes=destination.stat().st_size)
        reports.append(report)
        print(json.dumps(report), flush=True)
    (CLEAN / "report.json").write_text(
        json.dumps(reports, indent=2) + "\n", encoding="utf8")
    print("Clean voice files written: ", len(reports))


if __name__ == "__main__":
    main()
