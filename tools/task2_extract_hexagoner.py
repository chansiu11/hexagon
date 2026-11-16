#!/usr/bin/env python3
"""Task 2-1 source sampler: screen-space color occupancy, NOT exact wall extraction.

Usage (requires ffmpeg, numpy):
  python tools/task2_extract_hexagoner.py --video 1595.mp4 --start 177.96 --duration 97.05 --id 1595 --output task2-data.json
  python tools/task2_extract_hexagoner.py --video 1596.mp4 --start 119.30 --duration 104.50 --id 1596 --output task2-data.json
Do not mistake sampled color pixels for individually tracked wall objects.
"""
import argparse, subprocess, json, zlib, base64, hashlib, math
import numpy as np

W,H,FPS=576,360,10
RADII=(40,65,100,142)
ANGLES=np.arange(96)*math.tau/96
X=np.stack([np.clip(np.round(W/2+r*np.cos(ANGLES)).astype(int),0,W-1) for r in RADII])
Y=np.stack([np.clip(np.round(H/2+r*np.sin(ANGLES)).astype(int),0,H-1) for r in RADII])
BINS=np.floor(ANGLES/math.tau*6).astype(int)

def sample(video,start,duration):
    command=['ffmpeg','-v','error','-threads','2','-ss',str(start),'-i',video,
             '-t',str(duration),'-vf',f'fps={FPS},scale={W}:{H}',
             '-f','rawvideo','-pix_fmt','rgb24','pipe:1']
    proc=subprocess.Popen(command,stdout=subprocess.PIPE,stderr=subprocess.PIPE,bufsize=W*H*3)
    chunks=[]
    while True:
        frame_bytes=proc.stdout.read(W*H*3)
        if len(frame_bytes)!=W*H*3:
            break
        frame=np.frombuffer(frame_bytes,'u1').reshape(H,W,3).astype('f')
        hi=np.maximum(np.maximum(frame[:,:,0],frame[:,:,1]),frame[:,:,2])
        lo=np.minimum(np.minimum(frame[:,:,0],frame[:,:,1]),frame[:,:,2])
        sat=(hi-lo)*255/np.maximum(hi,1)
        bright=(hi>78)&(sat>65)
        packed=0
        for band in range(4):
            ring=bright[Y[band],X[band]]
            mask=0
            for sector in range(6):
                if np.mean(ring[BINS==sector])>=.29:
                    mask|=(1<<sector)
            packed|=mask<<(6*band)
        chunks.append(np.base_repr(packed,36).lower().zfill(5))
    proc.stdout.close()
    stderr=proc.stderr.read().decode('utf8','replace')
    if proc.wait():
        raise RuntimeError(stderr)
    return ''.join(chunks)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--video',required=True)
    parser.add_argument('--start',type=float,required=True)
    parser.add_argument('--duration',type=float,required=True)
    parser.add_argument('--id',required=True)
    parser.add_argument('--output',required=True)
    a=parser.parse_args()
    packed=sample(a.video,a.start,a.duration)
    record={'video':a.id,'start':a.start,'duration':a.duration,'fps':FPS,
            'radii':RADII,'frames':len(packed)//5,
            'sha256':hashlib.sha256(packed.encode('ascii')).hexdigest(),
            'zlibBase64':base64.b64encode(zlib.compress(packed.encode('ascii'),9)).decode('ascii'),
            'warning':'Screen-space color threshold approximation only; not polygon walls'}
    with open(a.output,'w',encoding='utf8') as f:
        json.dump(record,f,ensure_ascii=False,indent=2)
    print(a.id,'frames',record['frames'],'sha256',record['sha256'])

if __name__=='__main__':
    main()
