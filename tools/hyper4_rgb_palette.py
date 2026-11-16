#!/usr/bin/env python3
"""Re-extract BGR-safe RGB colors from the actual HYPER HEXAGON videos.
The original task4-1 palette was derived from BGR pixels without channel
conversion and sometimes confused HUD black with a game wedge.
This remains an approximate video quantization, not original engine color code.
"""
import subprocess,sys,argparse,numpy as np,json,math
from pathlib import Path
SOURCES={'1595':dict(file='1594.mp4',start=382.99,end=472.62333333333333,crop='1728:1080:96:0'),
         '1596':dict(file='1557(20261116-003454).mp4',start=303.32,end=398.60333333333335,crop='1152:720:0:0')}
W,H=160,100

def candidates(img):
 a=img[10:97:2,2:158:2,:].reshape(-1,3).astype(np.int16)
 # Bin RGB colours at eight-unit resolution and ignore near-neutral black HUD.
 bins=a//8;idx=(bins[:,0]<<10)+(bins[:,1]<<5)+bins[:,2]
 hist=np.bincount(idx,minlength=32768)
 top=np.argpartition(hist,-85)[-85:]
 top=sorted(top,key=lambda i:hist[i],reverse=True)
 out=[]
 for pos in top:
  count=int(hist[pos]); rgb=np.array([(pos>>10)&31,(pos>>5)&31,pos&31])*8+4
  if count<3:break
  # Neutral black is HUD/black border, not an actual alternating sector.
  if rgb.max()<15:continue
  if any(np.linalg.norm(rgb - x['rgb'])<27 for x in out):continue
  out.append({'rgb':rgb,'count':count,'sum':sum(rgb)})
  if len(out)>=12:break
 return out

def choose(cand,previous):
 main=[c for c in cand if c['count']>=10]
 if len(main)<3:main=cand[:]
 # Dense wedge colours dominate the histogram. Choose distinct flat colours,
 # then order from dark wedge to light wedge to bright wall/ship accent.
 weighted=sorted(main,key=lambda c:c['count'],reverse=True)
 chosen=[]
 for c in weighted:
  if any(np.linalg.norm(c['rgb']-v['rgb'])<32 for v in chosen):continue
  chosen.append(c)
  if len(chosen)==3:break
 if len(chosen)<3:
  for c in cand:
   if any(np.linalg.norm(c['rgb']-v['rgb'])<27 for v in chosen):continue
   chosen.append(c)
   if len(chosen)==3:break
 if not chosen:
  return previous or [[0,24,64],[0,40,104],[24,88,168]]
 chosen.sort(key=lambda c:float(c['sum']))
 colors=[c['rgb'].tolist() for c in chosen]
 if len(colors)<3:
  if previous is not None:
   while len(colors)<3:colors.append(previous[len(colors)])
  else:
   while len(colors)<3:colors.append(colors[-1])
 # At a wall-free intro frame the ship is tiny, and a stray shade can be
 # misclassified as the bright wall. Borrow a nearby colour later if needed.
 return colors

def run(src,outdir):
 info=SOURCES[src];fps=20
 cmd=['ffmpeg','-hide_banner','-loglevel','error','-ss',str(info['start']),'-i',info['file'],
      '-t',str(info['end']-info['start']),'-vf',f'crop={info["crop"]},scale={W}:{H}:flags=neighbor,fps={fps}',
      '-pix_fmt','rgb24','-f','rawvideo','pipe:1']
 p=subprocess.Popen(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,bufsize=4*10**6)
 length=W*H*3;out=[]
 while True:
  buf=p.stdout.read(length)
  if not buf:break
  if len(buf)!=length:raise RuntimeError('truncated palette frame')
  img=np.frombuffer(buf,np.uint8).reshape(H,W,3)
  out.append(choose(candidates(img),out[-1] if out else None))
 p.wait()
 if p.returncode!=0:raise RuntimeError('FFmpeg '+p.stderr.read().decode()[-500:])
 expected={'1595':1793,'1596':1906}[src]
 if len(out)!=expected:raise RuntimeError(f'palette frame count mismatch {len(out)} vs {expected}')
 # Stabilize missing accent in the first few wall-free launch frames using
 # the first genuine visible wall colour (without changing two backgrounds).
 for i in range(min(len(out),20)):
  if max(out[i][2])<max(out[i][1])+10:
   j=next((k for k in range(i+1,min(80,len(out))) if max(out[k][2])>max(out[k][1])+30),None)
   if j:out[i][2]=out[j][2]
 result={'source':src,'fps':fps,'colors':[sum(x,[]) for x in out]}
 dst=Path(outdir)/f'hyper-hexagon-{src}-palette.json';dst.parent.mkdir(parents=True,exist_ok=True);dst.write_text(json.dumps(result,separators=(',',':'))+'\n')
 print(src,'palette frames',len(out),'file',dst,'bytes',dst.stat().st_size,flush=True)
 for sec in (0,10,30,55,59.9,60.1,70,80):
  ix=min(len(out)-1,round(sec*20/(25/24)));print(sec,'colors',out[ix],flush=True)
if __name__=='__main__':
 parser=argparse.ArgumentParser()
 parser.add_argument('--video1595',default='1594.mp4')
 parser.add_argument('--video1596',default='1557(20261116-003454).mp4')
 parser.add_argument('--outdir',default='data')
 args=parser.parse_args()
 SOURCES['1595']['file']=args.video1595
 SOURCES['1596']['file']=args.video1596
 for s in SOURCES:run(s,args.outdir)
