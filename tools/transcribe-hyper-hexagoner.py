#!/usr/bin/env python3
"""Prepare HYPER HEXAGONER chronological wall observations from a user's MP4.

This is a measurement aid, NOT automatic evidence of pixel-perfect accuracy.
Supply the actual stage-5 start/end timestamps from visual inspection. Every
output has independentlyVerified=false until checked against its source video.

Dependencies: pip install opencv-python-headless numpy
Usage:
  python tools/transcribe-hyper-hexagoner.py --probe "1595(4).mp4"
  python tools/transcribe-hyper-hexagoner.py --video "1595(4).mp4" \
    --id 1595 --start 480.0 --end 565.0 \
    --game-rate 1.041666667 --accent-rgb "#e64d9e" \
    --out data/hyper-hexagoner-1595.json
The timestamps/colors above are examples, NOT measured HYPER HEXAGONER data.
"""
import argparse
import json
import math
import pathlib
import sys
import cv2
import numpy as np

OUTPUT_FPS=60
WIDTH=960
HEIGHT=600
CENTER=np.array([WIDTH/2,HEIGHT/2],dtype=np.float32)


def parse_color(text):
    text=text.strip().removeprefix('#')
    if len(text)!=6:
        raise ValueError('Expected six-digit RGB hex, for example #dd55aa')
    return np.array([int(text[i:i+2],16) for i in (4,2,0)],dtype=np.uint8)


def stage_view(bgr):
    """Remove pillarboxing to preserve the original 16:10 playfield."""
    height,width=bgr.shape[:2]
    wanted=1.6
    if width/height>wanted:
        size=int(round(height*wanted))
        left=(width-size)//2
        bgr=bgr[:,left:left+size]
    else:
        size=int(round(width/wanted))
        top=(height-size)//2
        bgr=bgr[top:top+size,:]
    return cv2.resize(bgr,(WIDTH,HEIGHT),interpolation=cv2.INTER_AREA)


def accent_from_core(bgr):
    """Estimate a bright core-edge ink color; never counts as verification."""
    a=np.linspace(0,2*math.pi,512,endpoint=False)
    xs=np.clip(np.rint(CENTER[0]+52*np.cos(a)).astype(int),0,WIDTH-1)
    ys=np.clip(np.rint(CENTER[1]+52*np.sin(a)).astype(int),0,HEIGHT-1)
    sample=bgr[ys,xs]
    hsv=cv2.cvtColor(sample.reshape(1,-1,3),cv2.COLOR_BGR2HSV).reshape(-1,3)
    keep=(hsv[:,1]>75)&(hsv[:,2]>110)
    if np.count_nonzero(keep)<16:
        raise ValueError('No reliable bright core border; pass --accent-rgb and inspect masks')
    color=sample[keep]
    bins=(color//24).astype(np.int32)
    keys=np.unique(bins,axis=0,return_inverse=True)[1]
    dominant=np.bincount(keys).argmax()
    result=np.median(color[keys==dominant],axis=0)
    return np.clip(np.rint(result),0,255).astype(np.uint8)


def accent_mask(bgr,accent,tolerance=50):
    """Color-aware mask. Anti-aliased edge pixels are tolerated by LAB distance."""
    lab=cv2.cvtColor(bgr,cv2.COLOR_BGR2LAB).astype(np.int16)
    ink=cv2.cvtColor(accent.reshape(1,1,3),cv2.COLOR_BGR2LAB).astype(np.int16)[0,0]
    diff=lab-ink
    distance=np.sqrt(np.sum(diff.astype(np.float32)**2,axis=2))
    mask=(distance<tolerance).astype(np.uint8)*255
    mask=cv2.morphologyEx(mask,cv2.MORPH_OPEN,np.ones((2,2),np.uint8))
    # HUD stays outside play geometry: clip top 75 px. The original game
    # always draws opaque fixed status banners in this band.
    mask[:68,:]=0
    return mask


def polygonize(mask,min_area=45.0):
    """Return source SCREEN-space polygons, including correctly nested holes."""
    contours,hierarchy=cv2.findContours(mask,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
    if hierarchy is None:
        return []
    links=hierarchy[0]
    walls=[]
    for i,contour in enumerate(contours):
        if links[i][3]!=-1 or cv2.contourArea(contour)<min_area:
            continue
        x,y,w,h=cv2.boundingRect(contour)
        # Ship / core outline is not a lethal wall. This filter is limited
        # to wholly central contours and does not remove approaching walls.
        if max(math.hypot(float(p[0][0]-CENTER[0]),float(p[0][1]-CENTER[1]))
               for p in contour)<82:
            continue
        if y<68 and y+h<87:
            continue
        def points(c):
            approx=cv2.approxPolyDP(c,1.25,True)
            return [[round(float(p[0][0]-CENTER[0]),2),
                     round(float(p[0][1]-CENTER[1]),2)]
                    for p in approx]
        exterior=points(contour)
        if len(exterior)<3 or len(exterior)>256:
            continue
        holes=[]
        child=links[i][2]
        while child!=-1:
            hole=contours[child]
            if cv2.contourArea(hole)>min_area:
                pts=points(hole)
                if 3<=len(pts)<=256:
                    holes.append(pts)
            child=links[child][0]
        walls.append({'id':'','points':exterior,'holes':holes})
    return walls


def sector_phase_from_background(bgr, wall_mask, sides, previous=None):
    """Estimate the ACTUAL camera orientation from alternating sector rays.

    The previous extractor set rotation to zero, causing screenshot-derived
    wall contours to be rotated differently from the background separators.
    Search rays that maximize the color jump at BOTH sides of each boundary,
    excluding pixels that are part of candidate walls.
    The estimate is modulo one sector; unwrap to the prior frame to avoid
    60-degree jumps. This is a *candidate* measurement to be reviewed.
    """
    if not 3 <= sides <= 12:
        raise ValueError('Expected 3..12 sectors')
    period=2*math.pi/sides
    candidates=np.linspace(0.,period,240,endpoint=False,dtype=np.float64)
    rays=candidates[:,None]+np.arange(sides)[None,:]*period
    lab=cv2.cvtColor(bgr,cv2.COLOR_BGR2LAB)
    total=np.zeros(candidates.size,dtype=np.float64)
    counts=np.zeros(candidates.size,dtype=np.float64)
    for radius in (113,145,187,225,263):
        # Compare background a few degrees either side of radial separator.
        delta=.045
        positions=[]
        for shift in (-delta,delta):
            theta=rays+shift
            xs=np.clip(np.rint(CENTER[0]+radius*np.cos(theta)).astype(int),
                       0,WIDTH-1)
            ys=np.clip(np.rint(CENTER[1]+radius*np.sin(theta)).astype(int),
                       0,HEIGHT-1)
            positions.append((xs,ys))
        (lx,ly),(rx,ry)=positions
        left=lab[ly,lx].astype(np.float64)
        right=lab[ry,rx].astype(np.float64)
        valid=((wall_mask[ly,lx]<128)&(wall_mask[ry,rx]<128)&
               (ly>=68)&(ry>=68))
        difference=np.sqrt(np.sum((left-right)**2,axis=2))
        total+=np.sum(difference*valid,axis=1)
        counts+=np.sum(valid,axis=1)
    sufficient=counts>=sides*2
    scores=np.where(sufficient,total/np.maximum(1,counts),-1.)
    index=int(np.argmax(scores))
    if scores[index]<8.:
        raise ValueError('Background sector edges unclear; inspect frame/ink color')
    # An RGB step edge produces a FLAT maximum for any candidate whose
    # +/-delta samples straddle it. Picking argmax returns the first edge of
    # this plateau (about 2 degrees too far clockwise/counterclockwise).
    # Recover the centre of the complete peak using a periodic circular mean.
    best=scores[index]
    peak=sufficient&(scores>=best*.985)
    unit=2*math.pi*candidates[peak]/period
    cs=np.mean(np.cos(unit))
    sn=np.mean(np.sin(unit))
    if math.hypot(cs,sn)<.5:
        raise ValueError('Multiple inconsistent sector-phase candidates')
    phase=float((math.atan2(sn,cs)%(2*math.pi))*period/(2*math.pi))
    if previous is None:
        return phase
    # Phase 0 and phase + 2*pi/sides describe identical sector boundaries.
    return phase+round((previous-phase)/period)*period


def centroid(points):
    return np.asarray(points,dtype=np.float32).mean(axis=0)


class TrackIds:
    """Match screen-space contours in chronological order without reusing old data."""
    def __init__(self):
        self.last=[]
        self.serial=0
    def assign(self,walls):
        candidates=[]
        for p,old in enumerate(self.last):
            for q,new in enumerate(walls):
                a=centroid(old['points'])
                b=centroid(new['points'])
                separation=float(np.linalg.norm(a-b))
                limit=max(25.0,.13*max(float(np.linalg.norm(a)),
                                       float(np.linalg.norm(b))))
                if separation<limit:
                    candidates.append((separation/limit,p,q))
        chosen_old=set()
        chosen_new=set()
        for score,p,q in sorted(candidates):
            if p in chosen_old or q in chosen_new:
                continue
            walls[q]['id']=self.last[p]['id']
            chosen_old.add(p)
            chosen_new.add(q)
        for wall in walls:
            if not wall['id']:
                self.serial+=1
                wall['id']='wall-'+str(self.serial)
        self.last=walls
        return walls


def annotate(bgr,mask,walls):
    out=bgr.copy()
    tint=np.zeros_like(out)
    tint[:,:,1]=mask
    out=cv2.addWeighted(out,.82,tint,.18,0)
    for wall in walls:
        pts=np.asarray(wall['points'],np.int32)+CENTER.astype(np.int32)
        cv2.polylines(out,[pts],True,(255,255,255),2)
    return out


def source_frames(video_path,start,end,output_fps=OUTPUT_FPS):
    cap=cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError('Cannot open source MP4: '+str(video_path))
    fps=cap.get(cv2.CAP_PROP_FPS)
    count=int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if not fps or fps<=0 or not count:
        raise RuntimeError('Source video has no decodable FPS/frame count')
    total=count/fps
    if start<0 or end>total+.05 or end<=start:
        raise ValueError(f'Time range must fit the source ({total:.3f} s)')
    last=-1
    for i in range(int(math.floor((end-start)*output_fps)) + 1):
        idx=min(count-1, int(round((start+i/output_fps)*fps)))
        if idx==last:
            yield i,frame.copy()
            continue
        if idx!=last+1:
            cap.set(cv2.CAP_PROP_POS_FRAMES,idx)
        ok,frame=cap.read()
        if not ok:
            raise RuntimeError(f'Could not decode MP4 frame {idx} / {count}')
        last=idx
        yield i,frame.copy()
    cap.release()


def probe(video):
    cap=cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise RuntimeError('Could not open '+str(video))
    fps=cap.get(cv2.CAP_PROP_FPS)
    n=int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    w=int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h=int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    return {'video':str(video),'fps':fps,'frames':n,'duration':n/fps if fps else None,
            'resolution':[w,h]}


def main():
    ap=argparse.ArgumentParser(description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--probe',type=pathlib.Path)
    ap.add_argument('--video',type=pathlib.Path)
    ap.add_argument('--id',choices=['1595','1596'])
    ap.add_argument('--start',type=float)
    ap.add_argument('--end',type=float)
    ap.add_argument('--out',type=pathlib.Path)
    ap.add_argument('--accent-rgb',help='Optional manually checked core/wall RGB')
    ap.add_argument('--tolerance',type=float,default=50)
    ap.add_argument('--game-rate',type=float,default=1.)
    ap.add_argument('--game-start-offset',type=float,default=0.)
    ap.add_argument('--sides',type=int,default=6)
    ap.add_argument('--camera-mode',choices=['sector','identity'],default='sector',
                    help='Detect background sector rotation, or keep an uncalibrated 0 angle')
    ap.add_argument('--preview',type=pathlib.Path)
    args=ap.parse_args()
    if args.probe:
        print(json.dumps(probe(args.probe),indent=2))
        return
    if not args.video or not args.id or args.start is None or args.end is None or not args.out:
        ap.error('--video, --id, --start, --end and --out are required')
    if args.sides not in range(3,13) or not .5<=args.game_rate<=2:
        ap.error('Unsupported sides or game clock calibration')
    frames=[]
    previous=TrackIds()
    preview=None
    fixed=parse_color(args.accent_rgb) if args.accent_rgb else None
    previous_angle=None
    for i,raw in source_frames(args.video,args.start,args.end):
        view=stage_view(raw)
        try:
            ink=fixed if fixed is not None else accent_from_core(view)
            mask=accent_mask(view,ink,args.tolerance)
        except ValueError as e:
            raise RuntimeError(f'Frame {i} color auto-calibration failed: {e}') from e
        walls=previous.assign(polygonize(mask))
        # Source contours are SCREEN-space. Estimate the background rotation
        # separately so the web renderer can undo it exactly once and keep
        # the polygon sides aligned to the arena's radial separators.
        # Camera zoom and shape transitions still require source verification.
        if args.camera_mode=='sector':
            angle=sector_phase_from_background(view,mask,args.sides,previous_angle)
            previous_angle=angle
        else:
            angle=0.
        frames.append({'angle':round(float(angle),8),
                       'zoom':1.,'sides':args.sides,'walls':walls})
        if i==0:
            preview=annotate(view,mask,walls)
        if (i+1)%1200==0:
            print(f'Extracted {i+1} source samples',file=sys.stderr)
    payload={
        'schemaVersion':1,'stageIndex':4,'id':args.id,'fps':OUTPUT_FPS,
        'videoStart':args.start,'videoEnd':args.end,
        'gameRate':args.game_rate,'gameStartOffset':args.game_start_offset,
        'sourceFile':args.video.name,'independentlyVerified':False,
        'coordinateSpace':'screen',
        'cameraMeasured':False,
        'cameraAngleCandidate':args.camera_mode=='sector',
        'notes':'SCREEN-space candidate contours with unverified sector-phase '
                'estimate. The film parser unrotates screenshots into world '
                'space. Zoom, shapes and the original MP4 still require review.',
        'frames':frames
    }
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(payload,separators=(',',':')),encoding='utf-8')
    if args.preview and preview is not None:
        args.preview.parent.mkdir(parents=True,exist_ok=True)
        cv2.imwrite(str(args.preview),preview)
    print(json.dumps({'output':str(args.out),'source':payload['sourceFile'],
        'samples':len(frames),'trackedActors':previous.serial,
        'wallPolygons':sum(len(f['walls']) for f in frames),
        'independentlyVerified':False},indent=2))


if __name__=='__main__':
    main()
