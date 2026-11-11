/* HEXAGONER 0–60 / 60+ reconstruction from 1557(10).mp4.
 * Strictly level 1 (tasks 3 & 4). Other stages and storage are untouched.
 * 148 video-derived approximate wall crossings grouped as continuous dodge
 * parts. Only whole-part ORDER and a constant whole-part orientation change.
 * Internal mask/width/source offset are immutable. Video-time color and
 * camera matrices have no random inputs. No video/audio redistributed.
 */
(function(root){'use strict';
const E=typeof module!=='undefined'?require('./engine'):root.HexEngine;
const REF=typeof module!=='undefined'?require('./stage-profiles'):root.StageProfiles;
const P=typeof module!=='undefined'?require('./hexagoner-post60'):root.HexHexagonerPost60;
const D=typeof module!=='undefined'?require('./hexagoner-video10-data'):root.HexHexagonerVideo10Data;
const TAU=Math.PI*2,SECTOR=TAU/6,SPEED=355,SPAWN=1100,RECOVERY=.90;
const SECTOR_UNITS=Array.from({length:7},(_,i)=>[Math.cos(i*SECTOR),Math.sin(i*SECTOR)]);
const modulo=(n,m)=>(n%m+m)%m;
const circularDistance=(a,b)=>Math.min(modulo(a-b,6),modulo(b-a,6));
const ANGULAR_SPEED=8*TAU/360*60; // between HEXAGON 7° and HEXAGONEST 9° per 60Hz tick.
function keyAt(keys,t){
 if(t<=keys[0][0])return keys[0][1];
 for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){
  const a=keys[i-1],b=keys[i],u=(t-a[0])/(b[0]-a[0]);
  return a[1]+(b[1]-a[1])*u;
 }
 return keys.at(-1)[1];
}
function palette(t){
 return t<60?[keyAt([[0,150],[5,150],[10,148],[15,135],[20,110],[25,72],[30,48],[35,33],[40,30],[45,36],[50,56],[55,85],[59.5,124]],t),94,[6,16,63]]:
  [keyAt([[60,233],[62,248],[65,270],[69,300],[73,318],[78,330],[84,331],[90,313],[95,289],[100,258],[104,233],[109,226]],t),88,[96,86,47]];
}
function measuredZoom(series,t){
 const frame=Math.max(0,Math.min(series.length-1,t));
 const k=Math.floor(frame),u=frame-k;
 return (series[k]*(1-u)+series[Math.min(k+1,series.length-1)]*u)/100;
}
// The user video has music-bass onsets every ~0.445 video seconds.
// Its center ring peaks +10% at each kick, dips ~9% after 0.2s.
// Avoid letting one-second zoom samples invent a different pulse rhythm.
function baselineZoom(samples,t){
 const avg=i=>{let total=0,weight=0;for(let k=-2;k<=2;k++){
  const j=Math.max(0,Math.min(samples.length-1,i+k)),w=3-Math.abs(k);
  total+=samples[j]*w;weight+=w;
 }return total/weight/100;};
 const x=Math.max(0,Math.min(samples.length-1,t)),i=Math.floor(x),f=x-i,u=f*f*(3-2*f);
 return avg(i)*(1-u)+avg(Math.min(i+1,samples.length-1))*u;
}
function beatScale(age){
 if(!Number.isFinite(age)||age<0||age>.65)return 1;
 const fade=age<=.50?1:Math.max(0,1-(age-.50)/.15);
 return 1+.105*fade*Math.cos(TAU*age/.445);
}
function sourceAngle(t){return D.angleAt(Math.max(0,t))}
function cameraAt(t,beatAge=Infinity){
 const tm=Math.max(0,t),end=D.REFERENCE_GAME_END;
 const measured=Math.min(tm,end),tailRate=D.angleAt(end)-D.angleAt(end-1);
 const angle=D.angleAt(measured)+(tm>end?(tm-end)*tailRate:0);
 const zoom=D.zoomAt(measured)*beatScale(beatAge),c=Math.cos(angle),sn=Math.sin(angle);
 return [c*zoom,sn*zoom,-sn*zoom,c*zoom,0,0];
}
function interpolateSpin(keys,t){
 if(t<=keys[0][0])return keys[0][1];
 for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){
  const a=keys[i-1],b=keys[i],u=(t-a[0])/(b[0]-a[0]);
  return a[1]+(b[1]-a[1])*u;
 }
 return keys.at(-1)[1];
}
function videoMaskToWorld(event){
 const camera=cameraAt(event.time),phase=Math.atan2(camera[1],camera[0]);
 const lanes=[];
 for(let i=0;i<6;i++)if(event.screenMask&(1<<i)){
  // Source visible sector i rotates with the measured game camera.
  const angle=(i+.5)*SECTOR-phase;
  const k=modulo(Math.floor(angle/SECTOR),6);
  if(!lanes.includes(k))lanes.push(k);
 }
 if(lanes.length>=6)lanes.pop();
 return lanes.sort((a,b)=>a-b);
}
const SOURCE_EVENTS=D.EVENTS.map((e,i)=>{
 const sectors=Array.from({length:6},(_,k)=>k).filter(k=>e.worldMask&(1<<k));
 if(!sectors.length||sectors.length>=6)throw Error('Invalid video10 sector mask '+e.id);
 const next=D.EVENTS[i+1],gap=next?.time-e.time;
 // A broad near-orbit color pulse can include several layered frames.
 // If two neighboring masks jointly close all six cells, trim the pulse's
 // inferred radial thickness before the next ring's impact. This repairs
 // occlusion-overestimated widths without rotating or deleting any walls.
 // Near-orbit colored occupancy tends to overestimate broad bands when
 // consecutive rings pass the same region. Reserve player steering time
 // even when the next two masks happen to share one narrow opening.
 const maxGapWidth=next&&gap>0?
  Math.max(20,Math.floor((gap-.22)*SPEED)):Infinity;
 const width=Math.min(e.width,maxGapWidth);
 return Object.freeze({id:e.id,time:e.time,videoSecond:e.videoSecond,
  width,measuredWidth:e.width,sectors:Object.freeze(sectors),
  sourceMask:e.worldMask,widthPixels:Math.round(e.width/2)});
});
function stabilizePostVideoMasks(raw){
 // The source screenshot gives screen-relative lanes; camera phase after
 // 60s is not reliably recoverable at each crossing. Correct ambiguous
 // adjacent lane jumps ONCE as part of the extracted data, then keep each
 // corrected source clip fixed through all subsequent randomized replays.
 let last=null;
 return raw.map(source=>{
  const e={...source,sectors:source.sectors.slice()};
  if(last){
   const safeChoices=findOpen(e.sectors),previous=last.safe;
   const nearest=safeChoices.reduce((a,b)=>
    circularDistance(b,previous)<circularDistance(a,previous)?b:a,safeChoices[0]);
   const elapsed=e.time-last.time;
   const movementTime=Math.max(.10,elapsed-last.width/SPEED);
   const maxShift=Math.max(1,Math.floor(movementTime*ANGULAR_SPEED/SECTOR+.05));
   if(circularDistance(nearest,previous)>maxShift){
    let best=null;
    for(let shift=1;shift<6;shift++){
     const shifted=e.sectors.map(s=>modulo(s+shift,6)).sort((a,b)=>a-b);
     const opens=findOpen(shifted);
     const distance=Math.min(...opens.map(s=>circularDistance(s,previous)));
     const score=distance*100+Math.min(shift,6-shift)*3+shift*.01;
     if(!best||score<best.score)best={shift,shifted,score};
    }
    if(best&&Math.min(...findOpen(best.shifted).map(s=>
       circularDistance(s,previous)))<=maxShift){
     e.sectors=best.shifted;e.sourceLaneCorrection=best.shift;
    }
   }
  }
  const choices=findOpen(e.sectors);
  const safe=last?choices.reduce((a,b)=>
   circularDistance(b,last.safe)<circularDistance(a,last.safe)?b:a,choices[0]):choices[0];
  last={time:e.time,width:e.width,safe};
  return e;
 });
}
function groupParts(era){
 const candidates=SOURCE_EVENTS.filter(w=>era===0?w.time<60:w.time>=60);
 let chunks=[],buf=[];
 for(const w of candidates){
  if(buf.length&&w.time-buf.at(-1).time>=RECOVERY){chunks.push(buf);buf=[]}
  buf.push(w);
 }
 if(buf.length)chunks.push(buf);
 return chunks.map((rawChunk,i)=>{const chunk=rawChunk;return Object.freeze({
  id:'HX'+(era?4:3)+'-'+String(i+1).padStart(2,'0'),era,
  sourceStart:chunk[0].time,sourceEnd:chunk.at(-1).time,
  sourceVideoStart:chunk[0].videoSecond,sourceVideoEnd:chunk.at(-1).videoSecond,
  events:Object.freeze(chunk.map(e=>Object.freeze({...e,offset:e.time-chunk[0].time})))
 });});
}
// An uninterrupted source dodge spans HUD 60s: 58.3-65.6.
const PRE_RAW=groupParts(0),POST_RAW=groupParts(1);
const POST_BRIDGE=POST_RAW.filter(p=>p.sourceStart<66);
if(!POST_BRIDGE.length||POST_BRIDGE[0].sourceStart-PRE_RAW.at(-1).sourceEnd>RECOVERY)
 throw Error('Missing video10 boundary passage');
const PARTS_PRE=Object.freeze(PRE_RAW.slice(0,-1));
const PARTS_POST=Object.freeze(POST_RAW.slice(POST_BRIDGE.length));
const BOUNDARY_PART=Object.freeze({
 id:'HX-60-BRIDGE',era:'bridge',
 sourceStart:PRE_RAW.at(-1).sourceStart,sourceEnd:POST_BRIDGE.at(-1).sourceEnd,
 sourceVideoStart:PRE_RAW.at(-1).sourceVideoStart,
 sourceVideoEnd:POST_BRIDGE.at(-1).sourceVideoEnd,
 events:Object.freeze([...PRE_RAW.at(-1).events,...POST_BRIDGE.flatMap(p=>p.events)].map(
  e=>Object.freeze({...e,offset:e.time-PRE_RAW.at(-1).sourceStart})))
});
// Reference video shows nested C-shapes, staggered side flanks and narrow
// parallel rails. Reproduce their radial silhouette within existing source
// bands rather than inventing extra impassable sectors or collision paths.
const SPECIAL_PARTS=Object.freeze({
 'HX3-06':'double-rail','HX3-10':'comb','HX3-11':'comb',
 'HX-60-BRIDGE':'staircase','HX4-03':'staircase','HX4-04':'comb',
 'HX4-08':'double-rail','HX4-09':'comb','HX4-10':'comb',
 'HX4-11':'staircase'
});
function shapeBands(w){
 if(w.special==='double-rail'&&w.thickness>=35)return [[0,.40],[.52,1]];
 if(w.special==='comb'&&w.thickness>=60)return [[0,.23],[.36,.57],[.70,1]];
 return [[0,1]];
}
function randomFrom(seed){let s=(seed^0x7a8c3d91)>>>0;return ()=>{
 s=(s+0x6d2b79f5)>>>0;
 let v=Math.imul(s^s>>>15,1|s);v^=v+Math.imul(v^v>>>7,61|v);
 return ((v^v>>>14)>>>0)/4294967296;
}}
function newSeed(){const a=new Uint32Array(1);
 if(root.crypto?.getRandomValues){root.crypto.getRandomValues(a);return a[0]}
 return (Date.now()^Math.floor(Math.random()*0xffffffff))>>>0;
}
function findOpen(sectors){
 return Array.from({length:6},(_,i)=>i).filter(k=>!sectors.includes(k));
}
// Change complete phrase ORDER only: no rotation, reflection or retiming
// inside any source phrase. Slot recovery gaps are recorded from the video.
function shuffled(parts,random,firstFixed=false){
 const pool=firstFixed?parts.slice(1):parts.slice();
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
 return firstFixed?[parts[0],...pool]:pool;
}
function schedule(parts,order,first){
 const gaps=parts.slice(1).map((p,i)=>p.sourceStart-parts[i].sourceEnd);
 let at=first;return order.map((part,i)=>{const entry={part,at};at+=part.sourceEnd-part.sourceStart+(gaps[i]||0);return entry});
}
function arrange(random,original,duration){
 const pre=schedule(PARTS_PRE,original?PARTS_PRE:shuffled(PARTS_PRE,random,true),PARTS_PRE[0].sourceStart);
 let post=[],first=PARTS_POST[0].sourceStart,cycle=0;
 const span=PARTS_POST.at(-1).sourceEnd-PARTS_POST[0].sourceStart;
 while(duration>60&&first<duration&&cycle<100){
  post.push(...schedule(PARTS_POST,original?PARTS_POST:shuffled(PARTS_POST,random),first)
   .map(v=>({...v,cycle})));
  if(original)break;first+=span+1.2;cycle++;
 }
 return [...pre,{part:BOUNDARY_PART,at:BOUNDARY_PART.sourceStart},...post].filter(p=>p.at<duration);
}
function plausibleJoin(groups){
 // Conservative six-sector temporal reachability screen for rearranged seams.
 let lanes=new Set([4]),previous={impact:0,width:0};
 for(const {part,at} of groups)for(const e of part.events){
  const impact=at+e.offset;if(impact>108.3)break;
  const travel=Math.max(0,impact-previous.impact-previous.width/SPEED*.5);
  const available=findOpen(e.sectors).filter(k=>[...lanes].some(s=>circularDistance(k,s)<=travel*8+.65));
  if(!available.length)return false;
  lanes=new Set(available);previous={impact,width:e.width};
 }
 return true;
}
function create(sourceTimeline=null,seed=newSeed(),duration=900,options={}){
 const orderMode=options?.order==='video'||
  /(?:^|[?&])hexagonerOrder=video(?:&|$)/.test(root.location?.search||'')?'video':'random';
 const random=randomFrom(seed);
 let groups=arrange(random,orderMode==='video',duration);
 if(orderMode==='random'&&!plausibleJoin(groups)){
  let matched=false;
  for(let i=0;i<96;i++){const attempt=arrange(random,false,duration);
   if(plausibleJoin(attempt)){groups=attempt;matched=true;break}}
  if(!matched)groups=arrange(randomFrom(0),true,duration);
 }
 const waves=[],partOrder=[];let waveId=0,previousSafe=null;
 for(const {part,at,cycle=0} of groups){
  if(at>=duration)continue;
  const group=partOrder.length;let lastWave=null;
  for(let j=0;j<part.events.length;j++){
   const e=part.events[j],impact=at+e.offset;if(impact>=duration)break;
   const sectors=e.sectors.slice(),open=findOpen(sectors);
   if(!sectors.length||!open.length)continue;
   const safe=open.reduce((best,s)=>previousSafe===null||
    circularDistance(s,previousSafe)<circularDistance(best,previousSafe)?s:best,open[0]);
   // A bridge wall arriving just after 60 must be born before 60; don't
   // truncate its lifespan or clip its outer cap at the screen boundary.
   const radius=Math.min(SPAWN,66+SPEED*impact),birth=impact-(radius-66)/SPEED;
   const special=j%3!==2&&e.width>=35?SPECIAL_PARTS[part.id]||null:null;
   const w={id:waveId++,group,partId:part.id,special,partEvent:j,
    sourceEventId:e.id,sourceVideo:'1557(10).mp4',sourceVideoSecond:e.videoSecond,
    sourceGameSecond:e.time,sourceOffset:e.offset,partRotation:0,
    sourceSectors:e.sectors.slice(),sourceWidthPx:e.widthPixels,sides:6,sectors,
    safeSector:safe,safeAngle:(safe+.5)*SECTOR,impact,r:radius,speed:SPEED,
    thickness:e.width,start:birth,end:birth+(radius+e.width-24)/SPEED};
   waves.push(w);lastWave=w;previousSafe=safe;
  }
  if(!lastWave)continue;
  partOrder.push({id:part.id,era:part.era,special:SPECIAL_PARTS[part.id]||null,
   at,end:lastWave.impact,sourceStart:part.sourceStart,sourceEnd:part.sourceEnd,
   sourceVideoStart:part.sourceVideoStart,sourceVideoEnd:part.sourceVideoEnd,
   played:lastWave.partEvent+1,rotation:0,exitSector:previousSafe,
   anchored:part===BOUNDARY_PART,cycle});
 }
 return {mode:'hexagoner-video8',kind:'hexagoner-video8',seed:seed>>>0,
  duration,orderMode,source:'1557(10).mp4',sourceVideoSegment:[119.25,223.3],
  sourceTimeline,shapeSchedule:[[0,6]],waves,partOrder,
  sourceEventCount:SOURCE_EVENTS.length,preSourcePartCount:PARTS_PRE.length,
  boundarySourcePartCount:1,post60PartCount:PARTS_POST.length,
  playerSpeedReference:ANGULAR_SPEED};
}
class HexagonerGame extends E.Game{
 constructor(data=create()){
  super(1,data);this.hexagonerMode=true;this.hexagonerSource8=true;
  this.profile=null;this.fromSides=6;this.sides=6;this.morph=1;
  // Allocate every wall panel and its four collision vertices only once.
  // During physics ticks mutate positions in place, with zero new polygons.
  this._spawns=data.waves.map(w=>({...w,actors:shapeBands(w).flatMap(([start,end],band)=>
   w.sectors.map(sector=>({
    id:w.id+':'+sector+':'+band,waveId:w.id,sector,sides:6,band,
    special:w.special,r:w.r,
    radialOffset:w.thickness*start+(w.special==='staircase'?((sector+w.sourceEventId)%3-1)*5:0),
    thickness:w.thickness*(end-start),
    points:[[0,0],[0,0],[0,0],[0,0]]
   }))
  )})).sort((a,b)=>a.start-b.start);
  this._active=[];this._cursor=0;this._sampleTime=-Infinity;
  this._lastCameraFrame=-1;
  this.recordedCamera=null;this.referenceCamera=null;this.sampleWalls();
 }
 get playerSpeed(){return ANGULAR_SPEED}
 get targetSides(){return 6}
 // Same center-point collision and lateral-wall hugging as task 1/5.
 // The triangle's visible steering lean must not change the hit point.
 hit(angle=this.angle){
  const pt=E.playerHitPoint(angle);
  return this.walls.find(w=>!w.collapsed&&E.pointInPolygon(pt,w.points));
 }
 freezeDeathCamera(){
  if(this.deathCamera)return;
  this.deathCamera={rotation:this.rotation,zoom:this.zoom,tilt:this.tilt,
   time:this.time,affine:this.lastDrawCamera?.slice()||this.recordedCamera?.slice()||null};
 }
 die(w){
  if(!w||this.dead)return;
  this.dead=true;
  const pt=E.playerHitPoint(this.angle);
  this.death={time:this.time,angle:this.angle,wallId:w.id,
   player:E.playerPoly(this.angle),wall:w.points.map(p=>p.slice()),
   holes:[],contact:pt.slice()};
  this.freezeDeathCamera();
 }
 stepSector(direction){
  const moved=super.stepSector(direction);
  if(moved)this.die(this.hit());
  return moved;
 }
 selectSector(sector){
  const moved=super.selectSector(sector);
  // Base selectSector detects an instantaneous hit; freeze it immediately.
  if(moved&&this.dead)this.freezeDeathCamera();
  return moved;
 }
 sampleWalls(){
  if(!this._spawns)return;
  const t=this.time;
  if(t<this._sampleTime){this._cursor=0;this._active.length=0;this._lastCameraFrame=-1}
  this._sampleTime=t;
  const videoFrame=Math.floor(t*60+1e-8);
  this.wallFrame=videoFrame;
  // Camera is visual-only; physics collision continues at its 240Hz rate.
  if(videoFrame!==this._lastCameraFrame){
   this.recordedCamera=cameraAt(t);
   this.referenceCamera=this.recordedCamera;
   this._lastCameraFrame=videoFrame;
  }
  while(this._cursor<this._spawns.length&&this._spawns[this._cursor].start<=t)
   this._active.push(this._spawns[this._cursor++]);
  for(let i=this._active.length-1;i>=0;i--)
   if(this._active[i].end<=t)this._active.splice(i,1);
  this.walls.length=0;
  for(const wave of this._active){
   const radius=wave.r-wave.speed*(t-wave.start);
   for(const w of wave.actors){
    w.r=radius+w.radialOffset;
    const inner=Math.max(0,w.r),outer=Math.max(inner,w.r+w.thickness);
    const a=SECTOR_UNITS[w.sector],b=SECTOR_UNITS[w.sector+1],pts=w.points;
    pts[0][0]=a[0]*inner;pts[0][1]=a[1]*inner;
    pts[1][0]=b[0]*inner;pts[1][1]=b[1]*inner;
    pts[2][0]=b[0]*outer;pts[2][1]=b[1]*outer;
    pts[3][0]=a[0]*outer;pts[3][1]=a[1]*outer;
    this.walls.push(w);
   }
  }
  this.fromSides=6;this.sides=6;this.morph=1;
 }
 update(dt,input=0){
  if(this.dead||this.timelineEnded||!(dt>0))return;
  // Replicate task-1/5 wall-contact semantics at 240Hz:
  // rotating into a stationary wall stops against its side rather than
  // instantly killing the player; advancing wall impact is still lethal.
  const steps=Math.max(1,Math.ceil(dt*240)),h=dt/steps;
  for(let i=0;i<steps;i++){
   if(this.controlMode===1&&input){
    const from=this.angle,to=E.wrap(from+input*this.playerSpeed*h);
    if(!this.hit(to))this.angle=to;
    else if(!this.hit(from)){
     let lo=0,hi=1;
     for(let j=0;j<12;j++){
      const u=(lo+hi)*.5;
      if(this.hit(E.wrap(from+input*this.playerSpeed*h*u)))hi=u;else lo=u;
     }
     this.angle=E.wrap(from+input*this.playerSpeed*h*lo);
    }
   }
   // Base mechanics advance walls and perform center-point hit detection.
   // Neutral input prevents double movement after our clipped turn.
   super.update(h,0);
   if(this.dead){this.freezeDeathCamera();break}
   if(this.timelineEnded)break;
  }
 }
}
function audioShakeAt(audioSeconds,pulse,enabled=true){
 // Actual music-only bass onsets, not periodic wall timers or random jitter.
 if(!enabled||!Number.isFinite(pulse)||pulse<=.005)return [0,0];
 const kick=Math.min(1,Math.max(0,pulse));
 const beat=Math.floor(Math.max(0,audioSeconds)*140/60);
 const dir=beat%2?1:-1;
 return [dir*3.8*kick,(beat%3===0?1:-1)*2.6*kick];
}
const API={HexagonerGame,create,palette,cameraAt,beatScale,sourceAngle,audioShakeAt,SPEED,ANGULAR_SPEED,
 PARTS_PRE,PARTS_POST,BOUNDARY_PART,SOURCE_EVENTS,SPECIAL_PARTS,shapeBands,RECOVERY,VIDEO_START:D.VIDEO_START};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexHexagonerVideo8=API;
})(typeof window!=='undefined'?window:globalThis);
