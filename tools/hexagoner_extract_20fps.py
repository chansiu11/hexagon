#!/usr/bin/env python3
"""Extract source-visible HEXAGONER silhouettes from user-supplied films.

This transcribes observed contours at 20fps into rebuilt engine's HXRF v1
screen-coordinate geometry. No original game wave code or video bytes are
included. It does not imply physical independent wall actor reconstruction.
"""
import argparse,subprocess,cv2,math,struct,zlib,base64,json,time,collections
import numpy as np
from pathlib import Path

W,H=480,300;FPS=20;TAU=math.tau
YY,XX=np.ogrid[:H,:W]
CORE_CIRCLE=(XX-240)**2+(YY-150)**2<25**2
ANGLES=np.arange(180)*TAU/180
BG_RADII=(68,102,120)
BG_POINTS=[]
for radius in BG_RADII:
 x=np.clip(np.rint(240+np.cos(ANGLES)*radius).astype('int32'),0,479)
 y=np.clip(np.rint(150+np.sin(ANGLES)*radius).astype('int32'),0,299)
 BG_POINTS.append((x,y))

def color_mask(img):
 hi=img.max(axis=2).astype('int16');lo=img.min(axis=2).astype('int16')
 return np.uint8(((hi-lo)>55)&(hi>65))*255

def core_polygon(full):
 mask=full.copy()
 mask[(XX-240)**2+(YY-150)**2>34**2]=0
 contours,_=cv2.findContours(mask,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
 opts=[]
 for c in contours:
  x,y,w,h=cv2.boundingRect(c);area=cv2.contourArea(c)
  if not (200<area<2300 and 22<=w<=61 and 22<=h<=61):continue
  if math.hypot(x+w/2-240,y+h/2-150)>7:continue
  p=cv2.approxPolyDP(c,max(1.8,.045*cv2.arcLength(c,True)),True)
  sides=len(p)
  if sides<3 or sides>8:continue
  pts=p[:,0,:].astype(float)
  angles=np.arctan2(pts[:,1]-150,pts[:,0]-240)
  phase=np.angle(np.mean(np.exp(1j*sides*angles)))/sides
  size=(w+h)/4
  opts.append((area,sides,float(phase),float(size)))
 return max(opts) if opts else None

def bg_angle(image,wall_mask,previous):
 samples=[]
 for x,y in BG_POINTS:
  valid=(wall_mask[y,x]==0)&(y>20)
  if np.count_nonzero(valid)<85:continue
  colors=image[y,x].astype('float32')
  lum=(.299*colors[:,0]+.587*colors[:,1]+.114*colors[:,2])
  coeff=np.mean((lum[valid]-np.median(lum[valid]))*np.exp(-3j*ANGLES[valid]))
  if abs(coeff)>2:samples.append((float(np.angle(coeff)/3),float(abs(coeff))))
 if not samples:return previous if previous is not None else 0.0
 phase=max(samples,key=lambda v:v[1])[0]
 if previous is None:return phase
 step=math.pi/3
 mid=round((previous-phase)/step)
 return min((phase+(mid+d)*step for d in (-1,0,1)),key=lambda t:abs(t-previous))

def contour_points(c):
 eps=1.0
 p=cv2.approxPolyDP(c,eps,True)
 while len(p)>100:
  eps*=1.24;p=cv2.approxPolyDP(c,eps,True)
 return [[max(0,min(W-1,int(x))),max(0,min(H-1,int(y)))] for x,y in p[:,0,:]]

def contours_from_mask(raw):
 mask=raw.copy()
 mask[:21,:]=0
 mask[CORE_CIRCLE]=0
 mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((2,2),'uint8'))
 components,hierarchy=cv2.findContours(mask,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
 if hierarchy is None:return []
 hier=hierarchy[0]
 records=[]
 for i,c in enumerate(components):
  if hier[i,3]!=-1:continue
  area=cv2.contourArea(c)
  if area<47:continue
  pts=contour_points(c)
  if len(pts)<3:continue
  # Recorded ship is a tiny triangular accent next to core, not lethal.
  if area<80 and np.mean([math.hypot(x-240,y-150) for x,y in pts])<55:continue
  holes=[];kid=hier[i,2]
  while kid!=-1:
   inner=components[kid]
   if cv2.contourArea(inner)>=26:
    hp=contour_points(inner)
    if len(hp)>=3:holes.append(hp)
   kid=hier[kid,0]
  records.append((pts,holes,float(area)))
 # The biggest contours are most meaningful. Some flashes create many tiny
 # fragments; avoid taking more than 64 while preserving all major walls.
 records.sort(key=lambda q:-q[2]);return records[:64]

def bg_palette(img,raw):
 body=img[21:].reshape(-1,3)
 colors=body[(raw[21:]==0).reshape(-1)]
 codes=(colors//8).astype('int32')@np.array([1024,32,1],dtype='int32')
 hist=np.bincount(codes,minlength=32768)
 picks=[]
 for index in np.argsort(hist)[-30:][::-1]:
  rgb=[int(index//1024*8+4),int((index//32)%32*8+4),int(index%32*8+4)]
  if all(np.linalg.norm(np.array(rgb)-np.array(prev))>22 for prev in picks):picks.append(rgb)
  if len(picks)==2:break
 if len(picks)==1:picks.append(picks[0])
 picks.sort(key=lambda c:sum(c))
 colored=img[21:][(raw[21:]>0)]
 if len(colored)>12:
  code=(colored//8).astype('int32')@np.array([1024,32,1],dtype='int32')
  idx=np.bincount(code,minlength=32768).argmax()
  wall=[int(idx//1024*8+4),int((idx//32)%32*8+4),int(idx%32*8+4)]
 else:wall=[210,60,125]
 return [*picks[0],*picks[1],*wall]

def build(video,start,duration,output,source):
 cmd=['ffmpeg','-v','error','-threads','2','-ss',str(start),'-i',video,'-t',str(duration),
 '-vf',f'fps={FPS},crop=min(iw\\,ih*1.6):ih,scale={W}:{H}',
 '-f','rawvideo','-pix_fmt','rgb24','pipe:1']
 proc=subprocess.Popen(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,bufsize=W*H*3)
 packet=bytearray(b'HXRF'+struct.pack('<BBIHH',1,FPS,0,W,H))
 n=0;last_angle=None;last_zoom=1;histogram=collections.Counter();pal=[];raw_frames=[]
 st=time.monotonic()
 while True:
  raw=proc.stdout.read(W*H*3)
  if len(raw)!=W*H*3:break
  im=np.frombuffer(raw,'uint8').reshape(H,W,3)
  cm=color_mask(im)
  core=core_polygon(cm)
  estimate=bg_angle(im,cm,last_angle)
  if core and core[0]>500:
   # Core orientation tracks actual central polygon and the background
   # phase may reverse across color changes. Only trust phases coherent
   # with the last continuous camera orientation.
   phases=[core[2]+k*TAU/core[1] for k in range(-12,13)]
   core_angle=min(phases,key=lambda v:abs(v-estimate))
   if abs(core_angle-estimate)<.22:estimate=.72*core_angle+.28*estimate
   inferred=int(core[1]);zoom=core[3]/21
   if .7<=zoom<=1.3:last_zoom=.8*last_zoom+.2*zoom
  else:inferred=6
  last_angle=estimate
  # In this first pass shape 6 remains the stable default. Isolated
  # apparent 3/4/5 core masks are flagged for refinement after wall trace.
  sides=6
  histogram[inferred]+=1
  polys=contours_from_mask(cm)
  packet.extend(struct.pack('<iBHB',round(float(last_angle)*10000),sides,int(max(500,min(1600,round(last_zoom*1000)))),len(polys)))
  for points,holes,area in polys:
   packet.append(len(points))
   for x,y in points:packet.extend(struct.pack('<HH',x,y))
   packet.append(len(holes))
   for h in holes:
    packet.append(len(h))
    for x,y in h:packet.extend(struct.pack('<HH',x,y))
  if n%5==0:pal.append(bg_palette(im,cm))
  if n%20==0:
   raw_frames.append(dict(frame=n,contours=len(polys),area=int(sum(q[2] for q in polys)),angle=round(float(last_angle),3)))
  n+=1
 proc.wait()
 if proc.returncode!=0:raise RuntimeError(proc.stderr.read().decode(errors='replace'))
 struct.pack_into('<I',packet,6,n)
 packed=base64.b64encode(zlib.compress(bytes(packet),9)).decode('ascii')
 Path(output).write_text('\n'.join(packed[i:i+140] for i in range(0,len(packed),140))+'\n')
 Path(output.replace('.b64','-palette.json')).write_text(json.dumps({'fps':4,'source':source,'colors':pal},separators=(',',':')))
 Path(output.replace('.b64','-qa.json')).write_text(json.dumps({'source':source,'start':start,'duration':duration,'fps':FPS,'frames':n,'sidesCandidateCounts':histogram,'checkpoints':raw_frames},indent=2))
 print('built',source,'frames',n,'rawBytes',len(packet),'base64Bytes',len(packed),'palette',len(pal),'shapes',dict(histogram),'time',round(time.monotonic()-st,2),flush=True)

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('video');a.add_argument('start',type=float);a.add_argument('duration',type=float);a.add_argument('output');a.add_argument('id');p=a.parse_args()
 build(p.video,p.start,p.duration,p.output,p.id)