/* Task 7 — HYPER HEXAGON, 0..60 seconds.
 * User-supplied 1557(7).mp4, 05:03.49–06:03.49, processed at 480x300/10Hz.
 * A bright-color radial occupancy crossing (35–38px orbit) supplied 71
 * candidate wall events. 0.95-second recovery gaps split 19 dodge parts.
 * Near-center occlusions and world widths are estimates, NOT original assets.
 *
 * The existing stage-3 camera/shape profile (same source clip; 15Hz)
 * is read but not edited. Only whole video part order is shuffled within
 * a polygon-side family; internal event timings/masks/widths never shuffle.
 */
(function(root){'use strict';
const E=typeof module!=='undefined'?require('./engine'):root.HexEngine;
const PROFILES=typeof module!=='undefined'?require('./stage-profiles'):root.StageProfiles;
const TAU=Math.PI*2,SPEED=452.480684906848,VIDEO_START=303.49,PART_END=60;
const RAW=[
 [1.6,4.3,[[0,6,45,25],[.9,6,31,41],[1.5,6,62,51],[2.1,6,55,49],[2.7,6,54,29]]],
 [5.7,7.3,[[0,6,45,70],[.4,6,27,76],[.8,6,45,74],[1.2,6,27,70],[1.6,6,45,48]]],
 [8.9,8.9,[[0,5,27,47]]],
 [10.6,12.2,[[0,5,19,57],[.5,5,30,61],[1.1,5,24,25],[1.6,5,30,39]]],
 [13.7,13.7,[[0,4,13,30]]],
 [15.3,18.4,[[0,4,13,34],[.6,4,7,38],[1.2,4,14,43],[1.7,4,11,38],[2.2,4,14,35],[2.7,4,11,33],[3.1,4,14,39]]],
 [20,20,[[0,5,27,61]]],
 [21.6,22.6,[[0,5,22,39],[.4,5,5,36],[1,5,27,40]]],
 [24.1,27.1,[[0,6,59,70],[.4,6,61,47],[1.1,6,51,25],[1.8,6,42,34],[2.2,6,55,58],[3,6,9,25]]],
 [28.1,28.7,[[0,6,61,48],[.6,6,31,49]]],
 [30.3,30.3,[[0,5,27,43]]],
 [31.6,34,[[0,5,8,25],[.4,5,14,57],[.9,5,27,61],[1.5,5,10,28],[2.4,5,18,25]]],
 [35.5,35.5,[[0,6,31,63]]],
 [36.9,39.9,[[0,6,31,51],[.6,6,54,73],[1,6,45,69],[1.4,6,54,75],[1.8,6,45,66],[2.2,6,54,37],[3,6,47,38]]],
 [43,45.8,[[0,5,14,55],[.5,5,27,60],[1.1,5,28,56],[1.7,5,22,43],[2.3,5,7,50],[2.8,5,29,57]]],
 [47.3,47.3,[[0,6,57,56]]],
 [48.9,53.6,[[0,6,18,25],[.6,6,47,49],[1.2,6,61,47],[1.8,6,47,53],[2.6,6,21,44],[3.1,6,45,65],[3.6,6,27,70],[3.9,6,45,70],[4.3,6,27,76],[4.7,6,45,51]]],
 [56.9,58.5,[[0,5,19,52],[.5,5,18,38],[1.1,5,29,50],[1.6,5,15,38]]],
 [59.6,59.6,[[0,5,25,58]]]
];
const PARTS=RAW.map((v,i)=>Object.freeze({
 id:'H7-'+String(i+1).padStart(2,'0'),sourceStart:v[0],sourceEnd:v[1],
 sourceVideoStart:VIDEO_START+v[0],sourceVideoEnd:VIDEO_START+v[1],
 sides:v[2][0][1],events:v[2].map(e=>Object.freeze({
  at:e[0],sides:e[1],mask:e[2],width:e[3]
 }))
}));
const PROFILE=PROFILES[3];
const SHAPES=PROFILE.shapeSchedule.map(v=>v.slice());
const HUES=[[0,190],[2,210],[4,212],[6,216],[8,222],[10,224],
 [12,226],[16,236],[18,236],[20,234],[22,230],[24,226],
 [26,220],[28,218],[30,214],[32,210],[34,208],[38,202],
 [40,198],[44,192],[50,186],[52,188],[58,191],[60,191]];
function palette(t){
 t=Math.max(0,Math.min(60,t));let k=0;
 while(k+1<HUES.length&&HUES[k+1][0]<t)k++;
 const a=HUES[k],b=HUES[Math.min(k+1,HUES.length-1)];
 const f=b[0]===a[0]?0:(t-a[0])/(b[0]-a[0]);
 return [a[1]+(b[1]-a[1])*Math.max(0,Math.min(1,f)),92,[8,18,59]];
}
function cameraAt(t){
 const cam=PROFILE.camera;
 // Source has abrupt reversals and impact pulses. Never ease the measured
 // 15-fps affine sample or couple it to random part order.
 const index=Math.max(0,Math.min(cam.frames.length-1,
  Math.floor(Math.max(0,t-cam.start)*cam.sampleRate+1e-8)));
 return cam.frames[index].slice();
}
function sidesAt(t){
 let sides=SHAPES[0][1];
 for(const [at,n] of SHAPES){if(at>t)break;sides=n}
 return sides;
}
function nextShapeAt(t){
 for(const [at] of SHAPES){if(at>t+1e-8)return at}
 return PART_END;
}
function seeded(seed){let s=(seed^0x679b4c21)>>>0;return ()=>{
 s=(s+0x6d2b79f5)>>>0;let v=Math.imul(s^s>>>15,1|s);
 v^=v+Math.imul(v^v>>>7,61|v);return ((v^v>>>14)>>>0)/4294967296;
}}
function newSeed(){
 const arr=new Uint32Array(1);
 if(root.crypto?.getRandomValues){root.crypto.getRandomValues(arr);return arr[0]}
 return (Date.now()^(Math.random()*0xffffffff))>>>0;
}
const wrap=(n,m)=>(n%m+m)%m;
const angularDistance=(a,b,n)=>Math.min(wrap(a-b,n),wrap(b-a,n));
function openings(mask,n){const r=[];for(let i=0;i<n;i++)if(!(mask&(1<<i)))r.push(i);return r}
function sectors(mask,n,rotation){
 const result=[];for(let i=0;i<n;i++)if(mask&(1<<i))result.push(wrap(i+rotation,n));
 return result.sort((a,b)=>a-b);
}
function chooseRotation(part,prevSafe){
 // Align one ENTIRE source part. No per-event rotations.
 const n=part.sides,first=part.events[0],open=openings(first.mask,n);
 let selected=0,lowest=Infinity;
 for(let shift=0;shift<n;shift++){
  const cost=Math.min(...open.map(o=>angularDistance(wrap(o+shift,n),prevSafe,n)));
  if(cost<lowest){selected=shift;lowest=cost}
 }
 return selected;
}
function create(sourceTimeline=null,seed=newSeed(),duration=3600){
 const random=seeded(seed),waves=[],partOrder=[];
 const bags={4:[],5:[],6:[]},lastBySide={4:-1,5:-1,6:-1};
 const sortBag=n=>{
  const out=PARTS.map((p,i)=>({p,i})).filter(x=>x.p.sides===n).map(x=>x.i);
  for(let k=out.length-1;k>0;k--){const j=Math.floor(random()*(k+1));[out[j],out[k]]=[out[k],out[j]]}
  return out;
 };
 let at=1.6,id=0,previousSafe=4,lastImpact=0,lastWidth=45;
 while(at<PART_END-.15&&partOrder.length<160){
  const n=sidesAt(at),change=nextShapeAt(at),available=change-at-.16;
  if(available<0){at=change+.04;continue}
  if(!bags[n].length)bags[n]=sortBag(n);
  // The first recorded dodge is intentionally always the original intro.
  let options=bags[n].filter(i=>PARTS[i].sourceEnd-PARTS[i].sourceStart<=available+1e-8);
  if(partOrder.length===0){options=[0];at=1.6}
  if(!options.length){at=change+.04;continue}
  if(options.length>1)options=options.filter(i=>i!==lastBySide[n]);
  if(!options.length)options=bags[n].filter(i=>PARTS[i].sourceEnd-PARTS[i].sourceStart<=available+1e-8);
  const ix=options.length?options[0]:bags[n][0];
  bags[n].splice(bags[n].indexOf(ix),1);
  const part=PARTS[ix],rotation=chooseRotation(part,previousSafe),startAt=at;
  let safe=previousSafe,count=0;
  for(let j=0;j<part.events.length;j++){
   const e=part.events[j],impact=startAt+e.at;
   if(impact>=PART_END-.01)break;
   const blocked=sectors(e.mask,n,rotation);
   const opens=openings(e.mask,n).map(k=>wrap(k+rotation,n));
   safe=opens.reduce((best,s)=>angularDistance(s,safe,n)<angularDistance(best,safe,n)?s:best,opens[0]);
   const r=Math.min(1260,66+SPEED*Math.max(.06,impact-.09));
   const spawnAt=Math.max(0,impact-(r-66)/SPEED),thickness=e.width;
   const wave={id:id++,group:partOrder.length,partId:part.id,partEvent:j,
    sourceVideoSeconds:part.sourceVideoStart+e.at,
    sourceGameSeconds:part.sourceStart+e.at,sourceSides:e.sides,
    sourceMask:e.mask,sourceWidth:e.width,partRotation:rotation,
    sides:n,sectors:blocked,safeSector:safe,safeAngle:(safe+.5)*TAU/n,
    impact,r,speed:SPEED,thickness,start:spawnAt,
    end:spawnAt+(r+thickness-26)/SPEED};
   waves.push(wave);lastImpact=impact;lastWidth=thickness;count++;
  }
  if(!count)break;
  partOrder.push({partId:part.id,sourceStart:part.sourceStart,
   sourceEnd:part.sourceEnd,sourceVideoStart:part.sourceVideoStart,
   sourceVideoEnd:part.sourceVideoEnd,at:startAt,end:lastImpact,
   sourceEvents:part.events.length,played:count,rotation,
   entrySafe:previousSafe,exitSafe:safe});
  previousSafe=safe;lastBySide[n]=ix;
  // Clearance and player steering apply at a seam only. Never alter the
  // relative times, widths or ordering WITHIN a recorded dodge part.
  const join=Math.max(.47,Math.min(.84,(lastWidth+80)/SPEED+.18));
  at=lastImpact+join;
  if(nextShapeAt(lastImpact)<at&&sidesAt(at)!==n)at=nextShapeAt(lastImpact)+.04;
 }
 return {mode:'hyper-hexagon-video-parts',kind:'hyper-hexagon-stage7',
  seed:seed>>>0,duration,source:'1557(7).mp4',sourceVideoSegment:[303.49,363.49],
  sourceTimeline:sourceTimeline||null,shapeSchedule:SHAPES,
  sourcePartCount:PARTS.length,sourceEventCount:PARTS.reduce((s,p)=>s+p.events.length,0),
  partOrder,waves};
}
class HyperGame extends E.Game{
 constructor(data=create()){
  super(3,data);this.hyperHexagonSource=true;
  this._waves=data.waves.slice().sort((a,b)=>a.start-b.start);
  this._cursor=0;this._active=[];this._lastSample=-Infinity;
  this.recordedCamera=null;this.sampleWalls();
 }
 get targetSides(){return sidesAt(this.time)}
 sampleWalls(){
  if(!this._waves)return;
  const time=this.time;
  if(time<this._lastSample){this._cursor=0;this._active=[]}
  this._lastSample=time;this.wallFrame=Math.floor(time*60);
  this.recordedCamera=cameraAt(time);
  while(this._cursor<this._waves.length&&this._waves[this._cursor].start<=time)
   this._active.push(this._waves[this._cursor++]);
  for(let k=this._active.length-1;k>=0;k--)if(time>=this._active[k].end)this._active.splice(k,1);
  this.walls.length=0;
  // Rebuild only active sectors. Rendering and hit testing share the same
  // morph polygon so no actor blinks or changes radius across a shape cut.
  for(const wave of this._active){
   const radius=wave.r-wave.speed*(time-wave.start);
   for(const sector of wave.sectors){
    const w={id:wave.id+':'+sector,waveId:wave.id,sector,sides:wave.sides,
     r:radius,thickness:wave.thickness};
    w.points=E.wallVisualPoly(w,this.fromSides,this.sides,this.morph);
    this.walls.push(w);
   }
  }
 }
 update(dt,input=0){
  if(this.dead||this.timelineEnded)return;
  super.update(dt,input);
  if(this.dead){
   this.deathCamera={time:this.time,rotation:this.rotation,
    affine:this.recordedCamera?.slice(),zoom:this.zoom,tilt:this.tilt};
  }
 }
}
const API={PARTS,SHAPES,HUES,VIDEO_START,PART_END,SPEED,
 create,HyperGame,cameraAt,palette,sidesAt};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexHyperStage7=API;
})(typeof window!=='undefined'?window:globalThis);
