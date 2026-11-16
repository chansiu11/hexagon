#!/usr/bin/env python3
"""Sample RGB colors directly from HEXAGONEST 1595/1596 film, every 30fps frame."""
import json,subprocess,sys
from pathlib import Path
import cv2
import numpy as np
sys.path.insert(0,'/mnt/data')
from extract_hexagonest import SOURCES
FPS=60

def three_colors(frame):
 pix=(frame[24::3,::3]//8).astype(np.int32)
 packed=(pix[:,:,0]<<10)+(pix[:,:,1]<<5)+pix[:,:,2]
 histogram=np.bincount(packed.ravel(),minlength=32768)
 top=np.argpartition(histogram,-60)[-60:]
 top=sorted(top,key=lambda k:histogram[k],reverse=True)
 distinct=[]
 for b in top:
  if histogram[b]<18:continue
  col=(np.array([(b>>10)&31,(b>>5)&31,b&31])*8+4).astype(float)
  if all(np.linalg.norm(col-old)>11 for old in distinct):
   distinct.append(col)
  if len(distinct)>=8:break
 if len(distinct)<3:return None
 # Select among the three major flat colours, preserving dark/light sectors.
 # Other colours are source codecs' anti-aliased outlines, HUD, or moving cursor.
 groups=distinct[:3]
 accent=max(groups,key=lambda c:float(c.max()))
 bg=[c for c in groups if c is not accent]
 bg.sort(key=lambda c:float(np.dot(c,[.114,.587,.299])))
 return [int(x) for x in list(bg[0][::-1])+list(bg[1][::-1])+list(accent[::-1])]

def main(id,video):
 meta=SOURCES[id];dur=meta['end']-meta['start'];vf=f"crop={meta['width']}:{meta['height']}:{meta['crop_x']}:0,scale=480:300:flags=area,fps={FPS}"
 p=subprocess.Popen(['ffmpeg','-hide_banner','-loglevel','error','-ss',f"{meta['start']:.7f}",'-i',str(video),'-t',f'{dur:.7f}', '-vf',vf,'-pix_fmt','bgr24','-f','rawvideo','pipe:1'],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 colors=[]
 while True:
  raw=p.stdout.read(480*300*3)
  if not raw:break
  if len(raw)<480*300*3:raise ValueError('partial frame')
  frame=np.frombuffer(raw,np.uint8).reshape(300,480,3)
  colors.append(three_colors(frame))
 p.wait()
 if p.returncode:raise RuntimeError(p.stderr.read()[:1000])
 # A few palette samples at the video intro are all sector background.
 # Fill their missing foreground palette with the nearest observed sample.
 valid=[i for i,c in enumerate(colors) if c is not None]
 if not valid:raise ValueError('no palette detected')
 for i,c in enumerate(colors):
  if c is None:
   nearest=min(valid,key=lambda j:abs(i-j))
   colors[i]=colors[nearest]
 name=f'data/hexagonest-{id}-palette.json'
 Path(name).write_text(json.dumps({'source':id,'fps':FPS,'colors':colors},separators=(',',':'))+'\n')
 print(id,'palette frames',len(colors),'sample start',colors[0], 'sample 60',colors[min(len(colors)-1,1728)], 'file',Path(name).stat().st_size)
if __name__=='__main__':main(sys.argv[1],sys.argv[2])
