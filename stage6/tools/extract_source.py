#!/usr/bin/env python3
"""Extract ordered 15fps SOURCE-SCREEN wall candidates from stage-6 videos.
The output is a visual reference; do not use as world-space collision data.
Dependencies: ffmpeg command, numpy, opencv-python.
"""
import argparse, base64, gzip, json, subprocess
from pathlib import Path
import numpy as np
import cv2

FPS, WIDTH, HEIGHT, ANGLES, RADII, RMAX = 15,320,180,96,128,186

def mask_for_frame(image, clock):
    polar = cv2.warpPolar(image,(RADII,ANGLES),(WIDTH/2,HEIGHT/2),
                          RMAX,cv2.WARP_POLAR_LINEAR|cv2.INTER_NEAREST).astype(float)
    brightness=polar.max(axis=2)
    if clock<60:
        result=(brightness>=205)&((polar.max(axis=2)-polar.min(axis=2))<=28)
    else:
        background=np.median(polar[:,25:125:3,:],axis=1)
        distance=np.linalg.norm(polar-background[:,None,:],axis=2)
        bg_brightness=background.mean(axis=1)[:,None]
        light=polar.mean(axis=2)
        saturation=(polar.max(axis=2)-polar.min(axis=2))/np.maximum(1,polar.max(axis=2))
        positive=light>=bg_brightness+22
        negative=(bg_brightness>175)&(light<bg_brightness-24)&(saturation>.58)
        result=(distance>=72)&(positive|negative)
    result[:,:16]=False # never interpret source core outline as wall
    a=(np.arange(ANGLES)+.5)*2*np.pi/ANGLES
    r=(np.arange(RADII)+.5)*RMAX/RADII
    y=HEIGHT/2+np.sin(a)[:,None]*r[None,:]
    result &= y>=13  # remove top HUD
    return result

def generate(video,start,end,out):
    command=['ffmpeg','-nostdin','-v','error','-ss',str(start),'-i',str(video),
             '-t',str(end-start),'-an','-vf','fps=15,scale=320:180:flags=area',
             '-f','rawvideo','-pix_fmt','bgr24','-']
    process=subprocess.Popen(command,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    frames,observed,colors=[],[],[]
    try:
        while True:
            data=process.stdout.read(WIDTH*HEIGHT*3)
            if len(data)!=WIDTH*HEIGHT*3:break
            image=np.frombuffer(data,dtype=np.uint8).reshape((HEIGHT,WIDTH,3))
            frame=mask_for_frame(image,len(frames)/FPS)
            frames.append(base64.b64encode(np.packbits(frame.ravel(),bitorder='little')).decode())
            observed.append(int(frame.sum()))
            rgb=cv2.cvtColor(image,cv2.COLOR_BGR2RGB).reshape(-1,3)
            bright=rgb[rgb.max(axis=1)>170]
            colors.append(np.median(bright,axis=0).astype(int).tolist() if len(bright) else [240,240,240])
    finally:
        if process.stdout:process.stdout.close()
        process.wait()
    if not frames:raise RuntimeError('No video frames read')
    payload=dict(format='stage6-source-polar-v1',source=Path(video).name,
        original_file=Path(video).name,media_start_s=start,media_end_s=end,
        game_zero_at_media_s=start,fps=FPS,angle_bins=ANGLES,radius_bins=RADII,
        screen_width=WIDTH,screen_height=HEIGHT,max_radius=RMAX,
        game_second_60_frame=60*FPS,count=len(frames),duration_s=len(frames)/FPS,
        geometry='source screen-space only; camera rotation and zoom not removed',
        caveat='wall candidate segmentation must be manually checked against video',
        observed_counts=observed,representative_rgb=colors,frames=frames)
    Path(out).parent.mkdir(parents=True,exist_ok=True)
    with gzip.open(out,'wt',encoding='utf8',compresslevel=9) as fd:json.dump(payload,fd,separators=(',',':'))
    print(Path(out),len(frames),'frames',len(frames)/FPS,'seconds')

if __name__=='__main__':
    p=argparse.ArgumentParser()
    for option in ('video','source','out'):
        p.add_argument('--'+option,required=(option!='source'))
    for option in ('start','end'):p.add_argument('--'+option,required=True,type=float)
    a=p.parse_args()
    generate(a.video,a.start,a.end,a.out)
