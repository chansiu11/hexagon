/* Tasks 7–8 only: HYPER HEXAGON (stage index 3), 0–60 and 60+.
 * Reference: user's 1557(10).mp4. This module must be loaded AFTER
 * hyper-hexagon-stage7.js and hyper-hexagon-78-data.js.
 * No non-HYPER level, RANDOM HEXAGON, account records, or audio assets change.
 * First-minute clips are those already measured from the same recording in
 * the existing stage7 module (71 wall candidates / 19 parts). Post-60 clips
 * are measured NEW in the uploaded video (41 estimated crossings).
 * The original video ended at game ~99.2s; never invent source events after.
 */
(function(root){'use strict';
const E=typeof module!=='undefined'?require('./engine'):root.HexEngine;
const OLD=typeof module!=='undefined'?require('./hyper-hexagon-stage7'):root.HexHyperStage7;
const D=typeof module!=='undefined'?require('./hyper-hexagon-78-data'):root.HexHyper78Data;
if(!OLD||!D)throw Error('HYPER HEXAGON task7/8 source modules are missing');
const TAU=Math.PI*2,LEVEL=3,SECTOR_RADIUS=66,MAX_R=1400,
 SPEED=OLD.SPEED,
 // Match the real-world input speed of HexagonestGame: its 9°/60Hz
 // internal rate is multiplied by 25/24 then advanced by dt/(25/24).
 PLAYER_DEGREES_PER_TICK=9,PLAYER_SPEED=PLAYER_DEGREES_PER_TICK*TAU/360*60;
const EPS=1e-7,REF_END=D.videoResultGameSeconds;
const wrap=(x,n)=>(x%n+n)%n;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function randomFrom(seed){let s=(seed^0x38a17d93)>>>0;return ()=>{
 s=(s+0x6d2b79f5)>>>0;let v=Math.imul(s^s>>>15,1|s);
 v^=v+Math.imul(v^v>>>7,61|v);return ((v^v>>>14)>>>0)/4294967296;
}}
function newSeed(){const a=new Uint32Array(1);if(root.crypto?.getRandomValues){root.crypto.getRandomValues(a);return a[0]}
 return (Date.now()^Math.floor(Math.random()*4294967296))>>>0;
}
const videoAt=t=>D.startVideoSeconds+t/D.gameClockRate;
const SHAPES=Object.freeze(D.shapeSchedule.map(v=>Object.freeze(v.slice())));
function sidesAt(t){let sides=6;for(const [at,n] of SHAPES){if(at>t+EPS)break;sides=n}return sides}
function toPrePart(p){return Object.freeze({
 id:p.id,era:7,sourceStart:p.sourceStart,sourceEnd:p.sourceEnd,
 sourceVideoStart:videoAt(p.sourceStart),sourceVideoEnd:videoAt(p.sourceEnd),
 sides:p.sides,events:Object.freeze(p.events.map((e,i)=>Object.freeze({
  id:'old-'+p.id+'-'+i,offset:e.at,sourceTime:p.sourceStart+e.at,
  sourceVideoSeconds:videoAt(p.sourceStart+e.at),sides:e.sides,mask:e.mask,width:e.width,
  measuredWidth:e.width
 })))
});}
const PRE_ALL=OLD.PARTS.map(toPrePart);
if(PRE_ALL.length!==19||PRE_ALL.reduce((s,p)=>s+p.events.length,0)!==71)
 throw Error('Existing task7 measured wall bank changed; review it before applying task7/8');
const firstPost=D.eventsPost60.filter(e=>e.time<=63.75+EPS);
const postRest=D.eventsPost60.filter(e=>e.time>63.75+EPS);
if(firstPost.length!==5||PRE_ALL.at(-1).sourceStart!==59.6)
 throw Error('Expected continuous HYPER source bridge at 59.6–63.75 seconds');
const BRIDGE=Object.freeze({
 id:'H78-BRIDGE',era:'bridge',sides:null,anchored:true,
 sourceStart:59.6,sourceEnd:63.75,
 sourceVideoStart:PRE_ALL.at(-1).sourceVideoStart,
 sourceVideoEnd:firstPost.at(-1).videoSecond,
 events:Object.freeze([
  ...PRE_ALL.at(-1).events,
  ...firstPost.map(e=>Object.freeze({id:'new-'+e.time,
   offset:e.time-59.6,sourceTime:e.time,sourceVideoSeconds:e.videoSecond,
   sides:e.sides,mask:e.mask,width:e.width,measuredWidth:e.measuredWidth||e.width}))
 ])
});
const PRE_PARTS=Object.freeze(PRE_ALL.slice(0,-1));
function derivePostParts(){const chunks=[];let group=[];
 for(const e of postRest){if(group.length&&e.time-group.at(-1).time>=1.18){chunks.push(group);group=[]}group.push(e)}
 if(group.length)chunks.push(group);
 return chunks.map((events,i)=>{
  const sides=[...new Set(events.map(e=>e.sides))];
  return Object.freeze({id:'H8-'+String(i+1).padStart(2,'0'),era:8,
   anchored:sides.length>1,sides:sides.length===1?sides[0]:null,
   sourceStart:events[0].time,sourceEnd:events.at(-1).time,
   sourceVideoStart:events[0].videoSecond,
   sourceVideoEnd:events.at(-1).videoSecond,
   events:Object.freeze(events.map(e=>Object.freeze({id:'new-'+e.time,
    offset:e.time-events[0].time,sourceTime:e.time,sourceVideoSeconds:e.videoSecond,
    sides:e.sides,mask:e.mask,width:e.width,measuredWidth:e.measuredWidth||e.width,
    strength:e.strength})))
  });
 });
}
const POST_PARTS=Object.freeze(derivePostParts());
const ALL_PARTS=Object.freeze([...PRE_PARTS,BRIDGE,...POST_PARTS]);
const SOURCE_WALLS=ALL_PARTS.reduce((n,p)=>n+p.events.length,0);
if(SOURCE_WALLS!==112)throw Error('Source inventory changed: expected 71+41 video wall candidates');
// Keep the original 30 filmed dodge phrases intact. Previously the
// 'random' selector only permuted ADJACENT same-shape phrases, leaving most
// runs nearly fixed. Pick from the whole same-era, same-shape phrase bank
// instead. Each VIDEO impact slot remains anchored in time, so every chosen
// phrase has to fit between adjacent slots and end before the 60s bridge.
// This preserves the transition schedule, never rotates/mirrors a part,
// and leaves the original-order video comparison mode untouched.
const phraseLength=p=>p.sourceEnd-p.sourceStart;
function scheduleEra(parts,random,original,eraEnd){
 const planned=[],uses=new Map();let previous=null;
 for(let i=0;i<parts.length;i++){
  const slot=parts[i],at=slot.sourceStart,next=i+1<parts.length?parts[i+1].sourceStart:eraEnd;
  let chosen=slot;
  if(!original&&!slot.anchored){
   const slotDuration=phraseLength(slot);
   const maxLength=Math.max(0,next-at-.28);
   const minLength=slotDuration>.01?Math.max(.12,slotDuration*.58):0;
   let bank=parts.filter(p=>!p.anchored&&p.sides===slot.sides&&
     phraseLength(p)<=maxLength+EPS&&phraseLength(p)+EPS>=minLength&&
     (slotDuration>.01||phraseLength(p)<=.60));
   if(!bank.length)bank=[slot];
   // A shuffle bag across compatible phrases encourages coverage before
   // repetition; no phrase receives a direction flip or new wall mask.
   const minUses=Math.min(...bank.map(p=>uses.get(p.id)||0));
   bank=bank.filter(p=>(uses.get(p.id)||0)===minUses);
   if(bank.length>1&&previous){const distinct=bank.filter(p=>p.id!==previous);if(distinct.length)bank=distinct;}
   chosen=bank[Math.floor(random()*bank.length)]||slot;
  }
  uses.set(chosen.id,(uses.get(chosen.id)||0)+1);previous=chosen.id;
  planned.push({part:chosen,at});
 }
 return planned;
}
function arrange(seed,original){const random=randomFrom(seed);
 return [...scheduleEra(PRE_PARTS,random,original,BRIDGE.sourceStart),
  {part:BRIDGE,at:BRIDGE.sourceStart},
  ...scheduleEra(POST_PARTS,random,original,REF_END+.75)];
}
function wallFor(e,at,id,group,part){
 const impact=at+e.offset,n=e.sides;
 const sectors=[];for(let k=0;k<n;k++)if(e.mask&(1<<k))sectors.push(k);
 if(!sectors.length||sectors.length>=n)throw Error('Invalid optical wall mask '+e.id);
 // Every event is instantiated OUTSIDE the viewport before its arrival;
 // even 60.42s walls begin to travel BEFORE the 60s transition.
 const r=Math.min(MAX_R,SECTOR_RADIUS+SPEED*Math.max(0,impact-.12));
 const start=impact-(r-SECTOR_RADIUS)/SPEED;
 const physicalEnd=impact+(e.width+SECTOR_RADIUS-26)/SPEED;
 return {id,group,partId:part.id,sourceEventId:e.id,sourceTime:e.sourceTime,
  sourceVideoSeconds:e.sourceVideoSeconds,sourceOffset:e.offset,partRotation:0,
  sourceMask:e.mask,sourceWidth:e.measuredWidth,estimatedWidth:e.width,
  sides:n,sectors,impact,r,speed:SPEED,thickness:e.width,
  start,end:physicalEnd};
}
function assemble(entries,seed,orderMode,duration){const waves=[],partOrder=[];
 for(const {part,at} of entries){if(at>=duration)continue;
  const group=partOrder.length;let count=0;
  for(let j=0;j<part.events.length;j++){
   const e=part.events[j];if(at+e.offset>=duration)break;
   waves.push(wallFor(e,at,waves.length,group,part));count++;
  }
  if(!count)continue;
  partOrder.push({id:part.id,era:part.era,sourceStart:part.sourceStart,
   sourceEnd:part.sourceEnd,sourceVideoStart:part.sourceVideoStart,
   sourceVideoEnd:part.sourceVideoEnd,at,end:at+part.sourceEnd-part.sourceStart,
   count,anchored:!!part.anchored,rotation:0,sides:part.sides});
 }
 return {mode:'hyper-hexagon-78',kind:'hyper-hexagon-78',source:D.source,
  seed:seed>>>0,orderMode,duration,videoEnd:REF_END,
  sourceVideoSegment:[D.startVideoSeconds,D.startVideoSeconds+REF_END/D.gameClockRate],
  sourceEventCount:SOURCE_WALLS,sourcePartCount:ALL_PARTS.length,
  partOrder,shapeSchedule:SHAPES,waves};
}
function hasCoarseRoute(waves){
 // Approximate conservative path check; never changes an individual video
 // event's source-relative geometry or rotates it to cheat at a seam.
 const N=120,STEP=.060,DELTA=Math.ceil(PLAYER_SPEED*STEP/TAU*N);
 let reach=new Uint8Array(N),next=new Uint8Array(N);
 reach[Math.floor(.75*N)]=1;
 for(let t=0;t<=Math.min(REF_END,99.2);t+=STEP){
  const active=waves.filter(w=>t>=w.impact-1e-5&&t<=w.impact+w.thickness/w.speed);
  next.fill(0);let any=false;
  for(let i=0;i<N;i++){
   const ang=(i+.5)/N;
   if(active.some(w=>w.sectors.includes(Math.floor(ang*w.sides))))continue;
   for(let d=-DELTA;d<=DELTA;d++)if(reach[wrap(i+d,N)]){next[i]=1;any=true;break}
  }
  if(!any)return false;
  [reach,next]=[next,reach];
 }
 return true;
}
function create(sourceTimeline=null,seed=newSeed(),duration=3600,options={}){
 const search=root.location?.search||'';
 const original=options.order==='video'||/(?:^|[?&])hyperHexagonOrder=video(?:&|$)/.test(search);
 let result=assemble(arrange(seed,original),seed,original?'video':'random',duration);
 if(!original&&!hasCoarseRoute(result.waves)){
  let found=false;for(let attempt=0;attempt<40;attempt++){
   const candidate=assemble(arrange(seed+(attempt+1)*2654435761,false),seed,'random',duration);
   if(hasCoarseRoute(candidate.waves)){result=candidate;found=true;break}
  }
  if(!found){result=assemble(arrange(seed,true),seed,'random',duration);result.routeFallback='source-order';}
 }
 return result;
}
const cameraKeys=D.cameraPost60;
const BASE_FPS=15,POST_EPS=1e-8;
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
function smoothSlope(before,value,after){
 const d0=value-before,d1=after-value;
 return d0*d1<=0?0:Math.sign(d1)*Math.min(Math.abs((d0+d1)/2),3*Math.min(Math.abs(d0),Math.abs(d1)));
}
function smoothKey(values,i,u){
 const last=values.length-1,a=values[i],b=values[Math.min(last,i+1)];
 const delta=b-a;if(!delta)return a;
 const m0=smoothSlope(values[Math.max(0,i-1)],a,b);
 const m1=smoothSlope(a,b,values[Math.min(last,i+2)]);
 const u2=u*u,u3=u2*u;
 return (2*u3-3*u2+1)*a+(u3-2*u2+u)*m0+
  (-2*u3+3*u2)*b+(u3-u2)*m1;
}
const postAngles=cameraKeys.map(v=>v[1]);
const postZoom=cameraKeys.map((_,i)=>{
 // Single-frame tracking noise looked like a sudden zoom/tilt pop.
 // Bass-hit zoom is supplied separately from live audio, not sample noise.
 let v=0,total=0;
 for(let j=-2;j<=2;j++){const k=clamp(i+j,0,cameraKeys.length-1),w=3-Math.abs(j);
  v+=cameraKeys[k][2]*w;total+=w;
 }
 return v/total;
});
function sampleCamera(t){
 if(t<=cameraKeys[0][0])return [postAngles[0],postZoom[0],cameraKeys[0][3]];
 if(t>=cameraKeys.at(-1)[0])return [postAngles.at(-1),postZoom.at(-1),cameraKeys.at(-1)[3]];
 let lo=0,hi=cameraKeys.length-1;
 while(hi-lo>1){const mid=(lo+hi)>>1;if(cameraKeys[mid][0]<=t)lo=mid;else hi=mid}
 const f=(t-cameraKeys[lo][0])/(cameraKeys[hi][0]-cameraKeys[lo][0]);
 // Interpolate measured angles continuously, without replacing source
 // wall timings or smoothing the avatar's input.
 const angle=smoothKey(postAngles,lo,f);
 const zoom=smoothKey(postZoom,lo,f);
 const hue=cameraKeys[lo][3]+(cameraKeys[hi][3]-cameraKeys[lo][3])*f;
 return [angle,zoom,hue];
}
function preCamera(t){
 // OLD.cameraAt() floors the stage-profile camera at 15Hz. The whole
 // playfield was therefore frozen for 3/4 of the 60Hz draw frames.
 const frame=Math.max(0,t)*BASE_FPS,k=Math.floor(frame),u=frame-k;
 const prev=OLD.cameraAt(k/BASE_FPS),next=OLD.cameraAt((k+1)/BASE_FPS);
 return prev.map((v,i)=>v+(next[i]-v)*u);
}
function joinCamera(previous,angle,zoom,progress){
 // Blend orientation on the shortest angular arc; direct affine lerp can
 // squash the world when 60s camera phases straddle ±PI.
 const u=clamp(progress,0,1),v=u*u*(3-2*u);
 const a=Math.atan2(previous[1],previous[0]),radius=Math.hypot(previous[0],previous[1])||1;
 const alpha=a+angleDelta(a,angle)*v,mag=radius+(zoom-radius)*v;
 const c=Math.cos(alpha),si=Math.sin(alpha),base=[Math.cos(a)*radius,Math.sin(a)*radius,
  -Math.sin(a)*radius,Math.cos(a)*radius,0,0];
 const target=[c*mag,si*mag,-si*mag,c*mag,0,0];
 return target.map((x,i)=>x+(previous[i]-base[i])*(1-v));
}
function cameraAt(t,audioPulse=0){
 const time=Math.max(0,t);
 if(time<60)return preCamera(time);
 const before=preCamera(60),baseAngle=Math.atan2(before[1],before[0]);
 const sourceStart=sampleCamera(60)[0];
 const [raw,zoom]=sampleCamera(time),angle=raw+(baseAngle-sourceStart);
 const z=zoom*(1+.025*clamp(audioPulse,0,1));
 const c=Math.cos(angle),si=Math.sin(angle),target=[c*z,si*z,-si*z,c*z,0,0];
 if(time<60.24)return joinCamera(before,angle,z,(time-60)/.24);
 return target;
}
function palette(t){
 if(t<60)return OLD.palette(t);
 const [, ,hue]=sampleCamera(t);return [wrap(hue,360),94,[11,26,76]];
}
function shakeAt(audioSeconds,pulse,enabled){
 if(!enabled||!(pulse>0)||!Number.isFinite(audioSeconds))return [0,0];
 const phase=((audioSeconds*140/60)%1+1)%1;
 // Continuous oscillation returns to zero at a beat boundary. Do not
 // alternate a signed integer at each kick: that displaced every pixel.
 const envelope=clamp(pulse,0,1)*Math.sin(Math.PI*phase)**2;
 return [2.8*envelope*Math.sin(TAU*phase),1.8*envelope*Math.sin(2*TAU*phase)];
}
// Video 1557(10).mp4 ~398.600–399.800: a one-frame white flash,
// frozen 99.20 timer, delayed core expansion and the score panel at +1.20s.
const DEATH_TIMING=Object.freeze({flashEnd:.075,zoomStart:.83,zoomEnd:1.105,resultStart:1.20,peakScale:5.1});
function deathScale(age){
 const t=Math.max(0,age),d=DEATH_TIMING;
 if(t<=d.zoomStart)return 1;
 if(t<d.zoomEnd)return 1+(d.peakScale-1)*(t-d.zoomStart)/(d.zoomEnd-d.zoomStart);
 return d.peakScale-.2*clamp((t-d.zoomEnd)/(d.resultStart-d.zoomEnd),0,1);
}
class HyperGame extends E.Game{
 constructor(data=create()){
  super(LEVEL,data);this.hyperHexagonSource78=true;this.profile=this.profile||null;
  this._spawns=data.waves.map(w=>({...w,actors:w.sectors.map(sector=>({
   id:w.id+':'+sector,waveId:w.id,sector,sides:w.sides,
   r:w.r,thickness:w.thickness,points:[[0,0],[0,0],[0,0],[0,0]]
  }))})).sort((a,b)=>a.start-b.start);
  this._cursor=0;this._active=[];this._sampleTime=-Infinity;
  this.fromSides=6;this.sides=6;this.morph=1;
  this.morphEventAt=0;this._lastSpokenSides=6;
  this.recordedCamera=null;this.referenceCamera=null;this.sampleWalls();
 }
 get targetSides(){return sidesAt(this.time)}
 get playerSpeed(){return PLAYER_SPEED}
 hit(angle=this.angle){const p=E.playerHitPoint(angle);
  return this.walls.find(w=>!w.collapsed&&E.pointInPolygon(p,w.points));
 }
 freezeDeathCamera(){if(this.deathCamera)return;
  // Use the freshly sampled camera, NOT the prior rendered frame. The
  // impact's source orientation must not jump one frame after death.
  const camera=this.recordedCamera?.slice()||this.lastDrawCamera?.slice()||cameraAt(this.time);
  const struck=this.hit(),contact=E.playerHitPoint(this.angle);
  if(!this.death)this.death={time:this.time,angle:this.angle,sides:this.sides,
   wallId:struck?.id||null,player:E.playerPoly(this.angle).map(p=>p.slice()),
   wall:struck?.points?.map(p=>p.slice())||[],holes:[],contact:contact.slice()};
  this.deathCamera={rotation:Math.atan2(camera[1],camera[0]),zoom:this.zoom,tilt:this.tilt,
   time:this.time,sides:this.sides,angle:this.angle,affine:camera};
  this.rotationSpeed=0;
 }
 sampleWalls(){
  if(!this._spawns)return;
  const t=this.time;
  if(t<this._sampleTime){this._cursor=0;this._active.length=0}
  this._sampleTime=t;
  this.wallFrame=Math.floor(t*60+1e-8);
  // HYPER-specific source shape schedule is active also AFTER 60s.
  // Unlike the generic level, do not postpone shape change until walls vanish.
  if(t>=60){const target=sidesAt(t);
   if(this.sides!==target){this.fromSides=this.sides;this.sides=target;
    this.pendingSides=target;this.shapeWait=false;this.morph=0;}
  }
  if(this.sides!==this._lastSpokenSides){
   const last=SHAPES.filter(([at,n])=>at<=t+EPS&&n===this.sides).at(-1);
   this.morphEventAt=last?.[0]||t;
   this._lastSpokenSides=this.sides;
  }
  this.recordedCamera=cameraAt(t);this.referenceCamera=this.recordedCamera;
  while(this._cursor<this._spawns.length&&this._spawns[this._cursor].start<=t)
   this._active.push(this._spawns[this._cursor++]);
  for(let i=this._active.length-1;i>=0;i--)if(t>=this._active[i].end)this._active.splice(i,1);
  this.walls.length=0;
  for(const w of this._active){const r=w.r-w.speed*(t-w.start);
   for(const a of w.actors){a.r=r;
    const poly=E.wallVisualPoly(a,this.fromSides,this.sides,this.morph);
    for(let j=0;j<a.points.length;j++){
     a.points[j][0]=poly[j][0];a.points[j][1]=poly[j][1];
    }
    this.walls.push(a);
   }
  }
 }
 stepSector(direction){const moved=super.stepSector(direction);if(moved){const w=this.hit();if(w){
  this.dead=true;this.freezeDeathCamera();}}
  return moved;
 }
 selectSector(sector){const moved=super.selectSector(sector);
  if(this.dead)this.freezeDeathCamera();return moved;
 }
 update(dt,input=0){if(this.dead||this.timelineEnded||!(dt>0))return;
  // Task 1/5 center-point side-contact rule: slide to the last safe angle,
  // and die only when a descending panel actually covers the orbit point.
  const steps=Math.ceil(dt*240),h=dt/steps;
  for(let i=0;i<steps;i++){
   if(this.controlMode===1&&input){const from=this.angle,to=E.wrap(from+input*this.playerSpeed*h);
    if(!this.hit(to))this.angle=to;
    else if(!this.hit(from)){
     let low=0,high=1;
     for(let j=0;j<12;j++){const u=(low+high)*.5;
      if(this.hit(E.wrap(from+input*this.playerSpeed*h*u)))high=u;else low=u;
     }
     this.angle=E.wrap(from+input*this.playerSpeed*h*low);
    }
   }
   super.update(h,0);
   if(this.dead){this.freezeDeathCamera();break}
   if(this.timelineEnded)break;
  }
 }
}
const API={HyperGame,create,PRE_PARTS,POST_PARTS,BRIDGE,ALL_PARTS,SHAPES,
 SOURCE_WALLS,PLAYER_SPEED,PLAYER_DEGREES_PER_TICK,SPEED,REF_END,cameraAt,palette,shakeAt,deathScale,DEATH_TIMING,
 hasCoarseRoute,sidesAt};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexHyper78=API;
})(typeof window!=='undefined'?window:globalThis);