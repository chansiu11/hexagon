/* Task 2 — 60+ HEXAGON source-video complete-phrase replay.
 * Reference user upload 1557(7).mp4. First cycle reproduces measured
 * clip order; repeats randomize only whole, shape-compatible phrases.
 * Timings/directions are measurements from compressed video, not the
 * original game source. Stage 1 & stage 5 files remain unchanged.
 */
(function(root){'use strict';
const H=typeof module!=='undefined'?require('./hard-mode'):root.HexHardMode;
const V=typeof module!=='undefined'?require('./hard-motion'):root.HexHardMotion;
const RUN=typeof module!=='undefined'?require('./hard-post60-video-run'):root.HexHardPost60VideoRun;
const TAU=Math.PI*2,START=60,PARTS=RUN.PARTS;
const SHAPES=[[60.45,6],[67.2,5],[72.0,4],[76.8,5],[80.7,4],[85.1,5],[91.2,6],[98.8,5],[104.8,4],[111.4,5]];
const CAMERA=[[60,1,.02],[64.9,-1,-.38],[69.6,1,.41],[73.1,-1,-.35],[77.6,1,.46],[81.5,-1,-.43],[85.8,1,.31],[90.5,-1,-.36],[94.7,1,.42],[98.8,-1,-.30],[103.7,1,.39],[108.8,-1,-.41],[112.3,1,.28]];

function createContinuation(game){return RUN.build(game,CAMERA);}
function motionAt(t,base){
 const quant=Math.max(60,Math.floor(t*60)/60),span=quant-60;
 let rotate=base;
 function integrate(length){
  for(let i=0;i<CAMERA.length;i++){
   const begin=CAMERA[i][0]-60,end=i+1<CAMERA.length?CAMERA[i+1][0]-60:54;
   const dt=Math.max(0,Math.min(length,end)-begin);
   if(dt)rotate+=CAMERA[i][1]*Math.PI*V.CLOCK_RATE*dt;
  }
 }
 const full=Math.floor(span/54);
 for(let k=0;k<full;k++)integrate(54);
 integrate(span-full*54);
 const phase=60+span%54;let event=CAMERA[0];
 for(const e of CAMERA){if(e[0]>phase)break;event=e}
 return {rotation:rotate,rate:event[1]*Math.PI*V.CLOCK_RATE};
}
function cameraAt(g,rotation,zoom){
 const m=V.cameraAt(g.time,rotation,zoom,g.timeline.groups);
 if(!g._post60Active||g.dead)return m;
 const beat=g.time/V.CLOCK_RATE*130/60,phase=((beat%1)+1)%1;
 const pulse=Math.exp(-phase*12),frame=Math.floor(g.time*60);
 m[4]=Math.round(((frame%2)*2-1)*7*pulse)/2;
 m[5]=Math.round(((frame*3)%5-2)*2.6*pulse)/2;
 return m;
}
class HardGame extends H.HardGame{
 update(dt,input=0){
  if(this.dead||this.timelineEnded)return;
  super.update(dt,input);
  if(!this._post60Active&&this.time>=60&&!this.dead)createContinuation(this);
  if(this._post60Active&&!this.dead){
   const scene=motionAt(this.time,this._post60RotationStart);
   this.rotation=scene.rotation;this.rotationSpeed=scene.rate;
   this.tilt=Math.acos(V.viewState(this.time,this.timeline.groups.filter(x=>x.post60)).compression);
  }
 }
}
const API={HardGame,PARTS,SHAPES,CAMERA,createContinuation,motionAt,cameraAt};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexHardPost60=API;
})(typeof window!=='undefined'?window:globalThis);
