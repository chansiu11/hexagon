#!/usr/bin/env python3
"""Extract measured HEXAGONEST video-color foreground polygons into HXRF v1.

This is a first-pass *visual source transcription*, not certified original
engine geometry. Source video frame pixels are not reused from earlier maps.
The frame actor identity is estimated by the existing replay.js tracker.
Bright, low-saturation HUD text is excluded from chromatic wall-color selection.

Run: python tools/extract_hexagonest.py --source 1595 --video /path/video.mp4 --fps 60
     python tools/extract_hexagonest.py --source 1596 --video /path/video.mp4 --fps 60
"""
import argparse
import base64
import json
import subprocess
import struct
import zlib
from pathlib import Path
import cv2
import numpy as np

SOURCES = {
    '1595': dict(start=277.0, end=371.40, width=1728, height=1080, crop_x=96,
                 source_file='1595(2).mp4', game_start_offset=0.10),
    '1596': dict(start=227.5166666667, end=296.15, width=1152, height=720,
                 crop_x=0, source_file='1596(2).mp4', game_start_offset=0.00)
}
FPS = 60
SIZE = (480, 300)
TARGET = np.array([240, 150], dtype=float)


def color_mask(frame):
    # Video's flat wall colour is normally the brightest of the three large
    # (two background + accent) colour regions, even through colour changes.
    pix = (frame[24::3, ::3] // 8).astype(np.int32)
    packed = (pix[:, :, 0] << 10) + (pix[:, :, 1] << 5) + pix[:, :, 2]
    histogram = np.bincount(packed.ravel(), minlength=32768)
    top = np.argpartition(histogram, -32)[-32:]
    top = sorted(top, key=lambda n: histogram[n], reverse=True)
    distinct = []
    for b in top:
        if histogram[b] < 20:
            continue
        col = (np.array([(b >> 10) & 31, (b >> 5) & 31, b & 31]) * 8 + 4).astype(float)
        if all(np.linalg.norm(col - prev) > 25 for prev in distinct):
            distinct.append(col)
        if len(distinct) >= 5:
            break
    if len(distinct) < 3:
        # A true empty start can have only two backgrounds and tiny core.
        return np.zeros(frame.shape[:2], np.uint8), (0, 0, 0)
    # Highly saturated stage colours must not be mistaken for the white HUD.
    # For genuine grey/white phases no saturated major region exists, so
    # revert to brightest visible neutral foreground as before.
    saturated = [col for col in distinct[:5] if col.max()-col.min() >= 42]
    accent = max(saturated or distinct[:5], key=lambda col: float(col.max()))
    # Bright foreground colour, allowing codec noise and anti-aliasing.
    difference = np.abs(frame.astype(np.int16) - accent.astype(np.int16))
    mask = (np.max(difference, axis=2) <= 22).astype(np.uint8) * 255
    mask[:22] = 0  # original game HUD overlays this region
    # Take the outer color shapes, but not the HUD's outlined text.
    return mask, tuple(int(n) for n in accent)


def simplify_contour(contour):
    circumference = cv2.arcLength(contour, True)
    if circumference <= 0:
        return []
    eps = max(.85, circumference * .002)
    approx = cv2.approxPolyDP(contour, eps, True)
    while len(approx) > 100:
        eps *= 1.30
        approx = cv2.approxPolyDP(contour, eps, True)
    if len(approx) < 3:
        return []
    return [[max(0, min(480, int(x))), max(0, min(300, int(y)))] for x, y in approx[:, 0]]


def extract_shapes(mask):
    contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    if hierarchy is None:
        return [], None
    hierarchy = hierarchy[0]
    polygons = []
    core_info = None
    for i, c in enumerate(contours):
        if hierarchy[i][3] >= 0:
            continue
        area = cv2.contourArea(c)
        if area < 42:
            continue
        points = simplify_contour(c)
        if len(points) < 3:
            continue
        # The source player and the central shape are not incoming walls.
        maxrad = max(np.hypot(x-240, y-150) for x, y in points)
        center_inside = cv2.pointPolygonTest(c, (240, 150), False) >= 0
        if center_inside and maxrad < 42:
            outer = cv2.approxPolyDP(c, max(1.15, cv2.arcLength(c, True)*.023), True)
            if 3 <= len(outer) <= 12:
                core_info = dict(sides=len(outer), radius=float(maxrad),
                    angles=[float(np.arctan2(int(p[1])-150, int(p[0])-240)) for p in outer[:,0]])
            continue
        if area < 90 and maxrad < 47:
            continue
        holes = []
        child = hierarchy[i][2]
        while child >= 0:
            if cv2.contourArea(contours[child]) >= 45:
                hp = simplify_contour(contours[child])
                if len(hp) >= 3:
                    holes.append(hp)
            child = hierarchy[child][0]
        polygons.append((points, holes, float(area)))
    # Keep up to the container's polygon count budget. Tiny artifacts last.
    polygons.sort(key=lambda x:x[2], reverse=True)
    return [(points, holes) for points,holes,_ in polygons[:100]],core_info


def choose_angle(core, previous, sides=6):
    if not core or not core.get('angles') or core['sides'] != sides:
        return previous
    sector = 2 * np.pi / sides
    phase = float(core['angles'][0] % sector)
    offset = round((previous - phase)/sector)
    candidate = phase + offset*sector
    return float(candidate)


def pack_polygon(buf, points):
    if len(points) > 255 or len(points) < 3:
        raise ValueError('Bad contour vertex count: '+str(len(points)))
    buf.append(len(points))
    for x,y in points:
        buf.extend(struct.pack('<HH', int(x), int(y)))


def pack_frame(buf, side, angle, zoom, polygons):
    if len(polygons)>255:
        raise ValueError('Too many polygons')
    buf.extend(struct.pack('<iBHB', round(angle * 10000), int(side),
                           round(zoom * 1000), len(polygons)))
    for polygon,holes in polygons:
        pack_polygon(buf,polygon)
        buf.append(len(holes))
        for hole in holes:
            pack_polygon(buf,hole)


def process(video, source, output, fps=FPS, preview=0):
    meta = SOURCES[source]
    length = meta['end'] - meta['start']
    vf = f"crop={meta['width']}:{meta['height']}:{meta['crop_x']}:0,scale=480:300:flags=area,fps={fps}"
    cmd=['ffmpeg','-hide_banner','-loglevel','error','-ss',f"{meta['start']:.7f}",
         '-i',str(video),'-t',f'{length:.7f}', '-vf',vf,
         '-pix_fmt','bgr24','-f','rawvideo','pipe:1']
    proc=subprocess.Popen(cmd, stdout=subprocess.PIPE,stderr=subprocess.PIPE,bufsize=10**7)
    buf=bytearray(b'HXRF'+bytes([1,fps])+struct.pack('<IHH',0,480,300))
    prev_angle=0.0
    prev_side=6
    consecutive_side=0
    last_core_radius=25.
    processed=0
    birth_summaries=[]
    wall_samples=[]
    while True:
        raw=proc.stdout.read(480*300*3)
        if len(raw)==0:
            break
        if len(raw)!=480*300*3:
            raise ValueError('Unexpected incomplete image at frame '+str(processed))
        img=np.frombuffer(raw,np.uint8).reshape(300,480,3)
        mask,accent=color_mask(img)
        walls,core=extract_shapes(mask)
        if source == '1596' and processed < int(round(.60*fps)):
            # Original 1596 starts with an oversized animated central core,
            # not an incoming wall. The first approaching wall is later.
            walls=[]
        if core:
            measured=core['sides']
            if measured==prev_side:
                consecutive_side=0
            elif 3<=measured<=8:
                consecutive_side += 1
                if consecutive_side >= 6:  # 0.2s persistence against noise
                    prev_side=measured
                    consecutive_side=0
            if 18 <= core['radius'] <= 40:
                last_core_radius=float(core['radius'])
        prev_angle=choose_angle(core,prev_angle,prev_side)
        zoom = float(np.clip(last_core_radius/25.,.55,1.55))
        pack_frame(buf,prev_side,prev_angle,zoom,walls)
        if processed % fps == 0:
            wall_samples.append(dict(second=round(processed/fps*25/24,3),
                         wallPolygons=len(walls),accent=accent,
                         sides=prev_side,coreRadius=round(last_core_radius,2)))
        processed+=1
        if preview and processed >= preview:
            proc.terminate()
            break
        if processed%600==0:
            print(source,'frames',processed,'wall polygons',len(walls),flush=True)
    try:proc.wait(timeout=15)
    except subprocess.TimeoutExpired:proc.kill()
    if not preview and proc.returncode != 0:
        print('ffmpeg error:',proc.stderr.read().decode('utf-8','replace')[:1500])
        raise RuntimeError('Video decode failed')
    struct.pack_into('<I',buf,6,processed)
    packed=zlib.compress(bytes(buf),9)
    output=Path(output);output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(base64.b64encode(packed).decode('ascii')+'\n')
    report={'source':source,'sourceFile':meta['source_file'],'videoStart':meta['start'],
      'videoEnd':meta['start']+(processed-1)/fps,'sampleFps':fps,
      'gameStartOffset':meta['game_start_offset'],'gameRate':25/24,
      'frameCount':processed,'gameLength':(processed-1)/fps*25/24,
      'binaryBytes':len(buf),'compressedBytes':len(packed),
      'out':str(output),'wallSamples':wall_samples}
    output.with_suffix('.report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print('FINISHED',source,'frames',processed,'compressed',len(packed),'bytes',flush=True)
    return report

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--source',choices=['1595','1596'],required=True)
    parser.add_argument('--video',required=True)
    parser.add_argument('--output')
    parser.add_argument('--fps',type=int,default=FPS)
    parser.add_argument('--preview',type=int,default=0)
    args=parser.parse_args()
    out=args.output or f'/mnt/data/hexagonest-{args.source}.b64'
    process(args.video,args.source,out,args.fps,args.preview)