#!/usr/bin/env python3
"""Compare recorded HEXAGONEST wall foreground with independently extracted HXRF geometry.

This tests extracted silhouette pixels, not the browser renderer or the original
Super Hexagon engine. Supply legally accessible reference video files yourself.
Run from repository root:
  python tools/check_hexagonest_video.py --id 1595 --video '1595(2).mp4'
  python tools/check_hexagonest_video.py --id 1596 --video '1596(2).mp4'
"""
import argparse
import base64
import json
import statistics
import struct
import sys
import zlib
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from extract_hexagonest import color_mask  # noqa: E402


def frames_from_file(path):
    data = zlib.decompress(base64.b64decode(path.read_text().strip()))
    if data[:5] != b'HXRF\x01':
        raise ValueError('not an HXRF v1 trace')
    fps = data[5]
    count, width, height = struct.unpack_from('<IHH', data, 6)
    if (width, height) != (480, 300):
        raise ValueError('unexpected pixel dimensions')
    pos = 14
    for _ in range(count):
        angle, sides, zoom, n = struct.unpack_from('<iBHB', data, pos)
        pos += 8
        walls = []
        for __ in range(n):
            def ring():
                nonlocal pos
                vertices = data[pos]
                pos += 1
                points = np.frombuffer(data, dtype='<u2', count=vertices*2, offset=pos).reshape(-1, 2).astype(np.int32)
                pos += 4*vertices
                return points
            poly = ring()
            hole_count = data[pos]
            pos += 1
            walls.append((poly, [ring() for _ in range(hole_count)]))
        yield fps, walls
    if pos != len(data):
        raise ValueError('trailing HXRF bytes')


def compare(source, video, spacing):
    manifest = json.loads((ROOT / 'data/hexagonest-sources.json').read_text())
    meta = manifest['recordings'][source]
    capture = cv2.VideoCapture(str(video))
    if not capture.isOpened():
        raise FileNotFoundError(video)
    fps_video = capture.get(cv2.CAP_PROP_FPS)
    scores = []
    checked = 0
    boundary = int(round(60 / meta['gameRate'] * meta['sampleFps']))
    indices = set(range(60, int((meta['videoEnd']-meta['videoStart'])*meta['sampleFps'])-30, int(spacing*meta['sampleFps'])))
    indices.update(i for i in (boundary-8, boundary-2, boundary, boundary+2, boundary+8) if i >= 0)
    for i, (sample_fps, polys) in enumerate(frames_from_file(ROOT/meta['path'])):
        if i not in indices:
            continue
        capture.set(cv2.CAP_PROP_POS_FRAMES, round((meta['videoStart']+i/sample_fps)*fps_video))
        ok, image = capture.read()
        if not ok:
            continue
        height, width = image.shape[:2]
        crop_width = round(height*8/5)
        x = (width-crop_width)//2
        image = cv2.resize(image[:, x:x+crop_width], (480,300), interpolation=cv2.INTER_AREA)
        original, _ = color_mask(image)
        copy = np.zeros((300,480), dtype=np.uint8)
        for outer, holes in polys:
            cv2.fillPoly(copy, [outer], 255)
            for hole in holes:
                cv2.fillPoly(copy, [hole], 0)
        # HUD and player's/core's original geometry is intentionally not
        # represented by the wall replay; exclude that center area.
        valid = np.ones_like(copy, dtype=bool)
        valid[:28] = False
        yy, xx = np.ogrid[:300,:480]
        valid &= (xx-240)**2 + (yy-150)**2 >= 45**2
        a = (original>0)&valid
        b = (copy>0)&valid
        union = np.count_nonzero(a|b)
        if union < 100:
            continue
        iou = np.count_nonzero(a&b)/union
        scores.append((i, iou))
        checked += 1
    capture.release()
    if not scores:
        raise ValueError('no comparable wall frames')
    before = [v for i,v in scores if i<boundary]
    after = [v for i,v in scores if i>=boundary]
    return {'source':source,'framesCompared':checked,
            'medianIoU':round(statistics.median(v for _,v in scores),4),
            'minIoU':round(min(v for _,v in scores),4),
            'medianBefore60':round(statistics.median(before),4) if before else None,
            'medianAfter60':round(statistics.median(after),4) if after else None,
            'worstFrames':[{'index':i,'IoU':round(v,4)} for i,v in sorted(scores,key=lambda p:p[1])[:4]]}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--id', required=True, choices=('1595','1596'))
    parser.add_argument('--video', type=Path, required=True)
    parser.add_argument('--spacing', type=float, default=3.)
    args = parser.parse_args()
    print(json.dumps(compare(args.id,args.video,args.spacing),indent=2))