/* HYPER HEXAGON task 4-1: a fresh, video-order-only replay adapter.
 * Optical data are source-relative; random connections / camera calibration
 * are explicitly reserved for 4-2. No older HYPER wall generator is imported.
 */
(function(root){'use strict';
const E=typeof module!=='undefined'?require('./engine.js'):root.HexEngine;
const O=typeof module!=='undefined'?require('./hyper4-filmed-observations.js'):root.HexHyper4Observations;
if(!E||!O)throw Error('Hyper 4 observation/engine dependency missing');
const LEVEL=3,ORBIT=66,SPEED=420,THICKNESS=42,MAX_RADIUS=760,INNER_HIDE=24;
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function sourceChoice(explicit){
 if(explicit&&O.RUNS[String(explicit)])return String(explicit);
 if(typeof location!=='undefined'){
  const query=new URLSearchParams(location.search).get('hyper4Source');
  if(O.RUNS[String(query)])return String(query);
 }
 return '1596';
}
function create(which){
 const key=sourceChoice(which),record=O.RUNS[key];
 const events=O.events(key).map(e=>({...e,
  // Optical sampling detects the bright stripe at screen radius 35px.
  // Its passage across the 66-unit player orbit happens slightly later.
  impact:e.time+.10,sourceVideoSecond:record.videoStart+e.time/record.clockRate
 }));
 return {mode:'hyper4-4-1-sequential-optical',source:key,file:record.file,
  duration:record.duration,events,sourceVideoStart:record.videoStart,
  sampleRate:10,sourceLimitations:'screen-space sector masks, 10Hz optical peaks'};
}
function panelMask(mask,side,sides){
 // Side counts are read from the visible core independently for each video.
 // Resampling a six-direction SCREEN observation is only provisional:
 // precise world-space unrotation is a remaining 4-1 calibration task.
 const observed=Math.floor((side+.5)*6/sides)%6;
 return (mask&(1<<observed))!==0;
}
function cameraAt(){return [1,0,0,1,0,0]}
function palette(t){
 return t<60?[207,94,[9,17,59]]:[338,86,[9,18,55]];
}
function shakeAt(){return [0,0]}
const DEATH_TIMING=Object.freeze({flashEnd:.08,zoomStart:.85,zoomEnd:1.1,resultStart:1.2,peakScale:4});
function deathScale(age){
 if(age<=DEATH_TIMING.zoomStart)return 1;
 const u=clamp((age-DEATH_TIMING.zoomStart)/(.25),0,1);return 1+3*u;
}
class HyperGame extends E.Game{
 constructor(timeline=create()){
  super(LEVEL,timeline);
  this.hyperHexagonSource78=true; // the existing HUD/render route
  this.videoOrderSource=timeline.source;
  this._observations=timeline.events;
  this.fromSides=6;this.sides=6;this.morph=1;this.morphEventAt=0;
  this.rotation=0;this.rotationSpeed=0;
  this.recordedCamera=cameraAt();this.referenceCamera=this.recordedCamera;
  this.sampleWalls();
 }
 get targetSides(){return O.observedSides(this.timeline.source,this.time)}
 // Actor geometry and the engine's point collision use these SAME polygons.
 sampleWalls(){
  if(!this._observations)return;
  const t=this.time,side=O.observedSides(this.timeline.source,t);
  const prev=this.sides;
  if(side!==prev){this.fromSides=prev;this.sides=side;this.morph=1;
   const keys=O.RUNS[this.timeline.source].shapes;
   for(const [at,n] of keys)if(at<=t&&n===side)this.morphEventAt=at;
  }
  this.recordedCamera=cameraAt(t);this.referenceCamera=this.recordedCamera;
  this.wallFrame=Math.floor(t*10);
  const out=[];
  for(const row of this._observations){
   const radius=ORBIT+SPEED*(row.impact-t);
   if(radius>MAX_RADIUS||radius+THICKNESS<INNER_HIDE)continue;
   for(let s=0;s<side;s++){
    if(!panelMask(row.screenMask,s,side))continue;
    const points=E.wallPoly(Math.max(0,radius),s,THICKNESS,side);
    out.push({id:row.id+':'+s,waveId:row.id,
      r:radius,thickness:THICKNESS,sector:s,sides:side,
      sourceTime:row.time,sourceVideoSecond:row.sourceVideoSecond,
      points});
   }
  }
  this.walls=out;
 }
 update(dt,input=0){
  super.update(dt,input);
  // The old engine owns UI/controls only; recorded source wall geometry
  // and screen orientation remain local to this stage.
  this.rotation=0;this.rotationSpeed=0;
  if(this.dead&&!this.deathCamera)this.deathCamera={
   affine:cameraAt(this.time),angle:this.angle,sides:this.sides,time:this.time
  };
 }
}
const API={create,HyperGame,cameraAt,palette,shakeAt,deathScale,DEATH_TIMING,
 SPEED,THICKNESS,ORBIT,sourceChoice,panelMask};
if(typeof module!=='undefined')module.exports=API;else root.HexHyper78=API;
})(typeof window!=='undefined'?window:globalThis);
