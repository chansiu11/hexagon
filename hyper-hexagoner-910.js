/* HYPER HEXAGONER — task 9 (<60 HUD seconds) and task 10 (>=60).
 * Source 1557(10).mp4 video ~06:43.47–08:08.10; recorded game-over timer 88.04.
 * 63 pre-death optical crossing cues, HUD-time calibrated, then grouped into intact dodge phrases.
 * Only phrase ORDER can shuffle; never rotate, mirror, change event mask,
 * reorder events within a phrase, or split the 60s boundary phrase.
 * This module is independent of tasks 1–8, 11–12 and RANDOM.
 */
(function(root){'use strict';
const E=typeof module!=='undefined'?require('./engine'):root.HexEngine;
const P=typeof module!=='undefined'?require('./stage-profiles'):root.StageProfiles;
const D=typeof module!=='undefined'?require('./hyper-hexagoner-910-data'):root.HexHyper910Data;
if(!E?.Game||!D?.EVENTS)throw Error('HYPER HEXAGONER dependencies missing');
const LEVEL=4,TAU=2*Math.PI,SIDES=6,ORBIT=66,SPEED=382,MAX_RADIUS=1290,
 REF_END=D.REFERENCE_GAME_END,SEC=TAU/6;
// Equal to the user-visible 9-degree/60Hz input speed of HEXAGONEST.
const PLAYER_DEGREES_PER_TICK=9;
const PLAYER_SPEED=PLAYER_DEGREES_PER_TICK*TAU/360*60;
const mod=(a,n)=>(a%n+n)%n,clamp=(a,b,c)=>Math.max(b,Math.min(c,a));
function rng(seed){let x=(seed^0x7af927d3)>>>0;return ()=>{x=(x+0x6d2b79f5)>>>0;
 let y=Math.imul(x^(x>>>15),1|x);y^=y+Math.imul(y^(y>>>7),61|y);
 return ((y^(y>>>14))>>>0)/4294967296;};}
function seedNow(){let a=new Uint32Array(1);if(root.crypto?.getRandomValues){root.crypto.getRandomValues(a);return a[0]}
 return (Date.now()^(Math.random()*0xffffffff))>>>0;}
const SOURCE_EVENTS=Object.freeze(D.EVENTS.map(e=>Object.freeze({...e,
 sectors:Object.freeze(Array.from({length:SIDES},(_,i)=>i).filter(i=>e.mask&(1<<i)))})));

/* The VIDEO order is authoritative: group its measured wall cues only
 * AFTER preserving all 64 original (time, mask, width) triples.
 * These contiguous source indices were cut at separate dodge phrases.
 * No wall, direction or timing is edited within a phrase. */
const PRE_RANGES=[[0,0],[1,3],[4,6],[7,7],[8,10],[11,14],[15,16],
 [17,18],[19,21],[22,22],[23,26],[27,30],[31,31],[32,35],[36,38]];
const BRIDGE_RANGE=[39,43];
const POST_RANGES=[[44,47],[48,51],[52,52],[53,56],[57,57],[58,60],[61,62]];
function partsFromRanges(ranges,era,prefix){
 return Object.freeze(ranges.map(([a,b],i)=>{
  const events=SOURCE_EVENTS.slice(a,b+1);
  if(events.length!==b-a+1)throw Error('Incomplete video segment');
  return Object.freeze({
   id:prefix+String(i+1).padStart(2,'0'),era,anchored:false,
   sourceStart:events[0].time,sourceEnd:events.at(-1).time,
   sourceVideoStart:events[0].videoSecond,sourceVideoEnd:events.at(-1).videoSecond,
   sourceIndices:[a,b],
   events:Object.freeze(events.map(e=>Object.freeze({...e,offset:e.time-events[0].time})))
  });
 }));
}
const PRE_PARTS=partsFromRanges(PRE_RANGES,9,'H9-');
const POST_PARTS=partsFromRanges(POST_RANGES,10,'H10-');
const bridgeEvents=SOURCE_EVENTS.slice(BRIDGE_RANGE[0],BRIDGE_RANGE[1]+1);
const BRIDGE=Object.freeze({
 id:'H9-10-BRIDGE',era:'bridge',anchored:true,
 sourceStart:bridgeEvents[0].time,sourceEnd:bridgeEvents.at(-1).time,
 sourceVideoStart:bridgeEvents[0].videoSecond,sourceVideoEnd:bridgeEvents.at(-1).videoSecond,
 sourceIndices:BRIDGE_RANGE,
 events:Object.freeze(bridgeEvents.map(e=>Object.freeze({...e,offset:e.time-bridgeEvents[0].time})))
});
const ALL_PARTS=Object.freeze([...PRE_PARTS,BRIDGE,...POST_PARTS]);
const SOURCE_COUNT=ALL_PARTS.reduce((total,p)=>total+p.events.length,0);
if(SOURCE_COUNT!==63||BRIDGE.events.length!==5||
 ALL_PARTS.flatMap(p=>p.events).some((e,i)=>e.id!==i))
 throw Error('Task 9/10 recorded source must contain each cue once in order');
function shuffle(parts,random){
 const arr=parts.slice();
 for(let k=arr.length-1;k>0;k--){const j=Math.floor(random()*(k+1));[arr[j],arr[k]]=[arr[k],arr[j]];}
 return arr;
}
// Assign every source phrase exactly once into a video-timed slot.
// Randomized matching respects length constraints; the 60-second
// phrase never moves or changes. No rotation, reflection or wall edits.
const PHRASE_GAP=.27;
function arrangeEra(parts,random,video,endTime,keepFirst){
 if(video)return parts.map(part=>({part,at:part.sourceStart}));
 const N=parts.length,capacity=parts.map((p,i)=>
  (i+1<N?parts[i+1].sourceStart:endTime)-p.sourceStart-PHRASE_GAP);
 const owner=new Int16Array(N).fill(-1),assigned=new Int16Array(N).fill(-1);
 if(keepFirst){owner[0]=0;assigned[0]=0;}
 const slots=shuffle(Array.from({length:N},(_,i)=>i).filter(i=>!keepFirst||i!==0),random)
  .sort((a,b)=>capacity[a]-capacity[b]);
 function dfs(slot,seen){
  const candidates=shuffle(Array.from({length:N},(_,i)=>i).filter(i=>
   (!keepFirst||i!==0)&&parts[i].sourceEnd-parts[i].sourceStart<=capacity[slot]+1e-8),random)
   .sort((a,b)=>(owner[a]===-1?0:1)-(owner[b]===-1?0:1));
  for(const part of candidates){
   if(seen.has(part))continue;seen.add(part);
   if(owner[part]===-1||dfs(owner[part],seen)){
    owner[part]=slot;assigned[slot]=part;return true;
   }
  }
  return false;
 }
 for(const slot of slots)if(!dfs(slot,new Set()))throw Error('No legal whole-phrase assignment');
 return Array.from(assigned,(ix,i)=>({part:parts[ix],at:parts[i].sourceStart}));
}
function arrangement(seed,video){const random=rng(seed);
 return [...arrangeEra(PRE_PARTS,random,video,BRIDGE.sourceStart,true),
  {part:BRIDGE,at:BRIDGE.sourceStart},
  ...arrangeEra(POST_PARTS,random,video,REF_END+.01,false)];
}
// Never fabricate comb / triple-strip geometry from a part label.
// Recorded simultaneous or consecutive source events create visible
// multi-rail patterns; the original-order comparison uses raw wall quads.
const SPECIAL=Object.freeze({});
function wallFrom(e,at,id,group,part){const impact=at+e.offset;
 const radius=Math.min(MAX_RADIUS,ORBIT+SPEED*Math.max(0,impact-.14)),start=impact-(radius-ORBIT)/SPEED;
 return {id,group,partId:part.id,partEvent:part.events.indexOf(e),
  sourceGameSecond:e.time,sourceVideoSecond:e.videoSecond,sourceEventId:e.id,
  sourceMask:e.mask,sourceWidth:e.width,partRotation:0,mirrored:false,
  sides:SIDES,sectors:e.sectors.slice(),safeSector:e.sectors.length<SIDES?
   Array.from({length:SIDES},(_,i)=>i).find(i=>!e.sectors.includes(i)):null,
  impact,r:radius,start,speed:SPEED,thickness:e.width,
  special:null,end:impact+(e.width+ORBIT-25)/SPEED};
}
function assemble(entries,seed,video,duration,extended=false){const waves=[],partOrder=[];
 for(const {part,at} of entries){if(at>=duration)break;
  let count=0;const group=partOrder.length;
  for(const e of part.events){if(at+e.offset>=duration)break;
   waves.push(wallFrom(e,at,waves.length,group,part));count++;
  }
  if(count)partOrder.push({id:part.id,era:part.era,at,
   sourceStart:part.sourceStart,sourceEnd:part.sourceEnd,
   sourceVideoStart:part.sourceVideoStart,sourceVideoEnd:part.sourceVideoEnd,
   count,rotation:0,mirrored:false,anchored:!!part.anchored});
 }
 if(extended&&!video){
  // Repeat only measured late phrases AFTER the actual source footage
  // ends. A repeated outer wall must not become visible in the video
  // reference window before its terminal 88.04s HUD freeze.
  let at=REF_END+(MAX_RADIUS-ORBIT)/SPEED+.12,random=rng(seed^0x124ef8),loops=0;
  while(at<duration&&loops++<48&&POST_PARTS.length){
   for(const part of shuffle(POST_PARTS,random)){if(at>=duration)break;
    const group=partOrder.length;let count=0;
    for(const e of part.events){if(at+e.offset>=duration)break;
     const copy=wallFrom(e,at,waves.length,group,part);copy.repeatedAfterReference=true;
     waves.push(copy);count++;
    }
    partOrder.push({id:part.id,era:10,at,sourceStart:part.sourceStart,sourceEnd:part.sourceEnd,
     sourceVideoStart:part.sourceVideoStart,sourceVideoEnd:part.sourceVideoEnd,count,
     repeatedAfterReference:true,rotation:0,mirrored:false,anchored:false});
    at+=part.sourceEnd-part.sourceStart+.8;
   }
  }
 }
 waves.sort((a,b)=>a.start-b.start);
 return {kind:'hyper-hexagoner-910',mode:'hyper-hexagoner-910',source:D.SOURCE,
  sourceRange:[D.VIDEO_START,D.VIDEO_END],videoEnd:REF_END,seed:seed>>>0,
  orderMode:video?'video':'random',duration,waves,partOrder,sourcePartCount:ALL_PARTS.length,
  sourceEventCount:SOURCE_COUNT,level:LEVEL,shapeSchedule:[[0,SIDES]]};
}
function hasCoarseRoute(waves){const n=144,dt=.05,step=Math.max(1,Math.floor(PLAYER_SPEED*dt/TAU*n));
 let reach=new Uint8Array(n),next=new Uint8Array(n);reach[108]=1;
 const sorted=waves.slice().sort((a,b)=>a.impact-b.impact),active=[];let cursor=0;
 for(let t=0;t<Math.min(REF_END,88);t+=dt){
  while(cursor<sorted.length&&sorted[cursor].impact<=t+.000001)active.push(sorted[cursor++]);
  for(let i=active.length-1;i>=0;i--)if(t>active[i].impact+active[i].thickness/SPEED)active.splice(i,1);
  const blocked=new Set(active.flatMap(w=>w.sectors));if(blocked.size===SIDES)return false;
  next.fill(0);let has=false;
  for(let i=0;i<n;i++){
   if(blocked.has(Math.floor(i/(n/SIDES))))continue;
   for(let k=-step;k<=step;k++)if(reach[mod(i+k,n)]){next[i]=1;has=true;break}
  }
  if(!has)return false;[reach,next]=[next,reach];
 }
 return true;
}
function create(sourceTimeline=null,seed=seedNow(),duration=3600,options={}){
 const video=options.order==='video'||/(?:^|[?&])hyperHexagonerOrder=video(?:&|$)/.test(root.location?.search||'');
 let d=assemble(arrangement(seed,video),seed,video,duration,!video);
 if(!video&&!hasCoarseRoute(d.waves)){
  let found=false;
  for(let i=1;i<=64;i++){
   const v=assemble(arrangement(seed+i*1664525,false),seed,false,duration,true);
   if(hasCoarseRoute(v.waves)){d=v;found=true;break}
  }
  if(!found){d=assemble(arrangement(seed,true),seed,false,duration,true);d.routeFallback='source-order'}
 }
 return d;
}
function smoothSlope(before,value,after){
 const a=value-before,b=after-value;
 return a*b<=0?0:Math.sign(b)*Math.min(Math.abs((a+b)/2),3*Math.min(Math.abs(a),Math.abs(b)));
}
function smoothTrack(array,x){
 const p=clamp(x,0,array.length-1),i=Math.floor(p),u=p-i;
 const y0=array[i],y1=array[Math.min(i+1,array.length-1)];
 if(i>=array.length-1||y0===y1)return y0;
 const v0=smoothSlope(array[Math.max(0,i-1)],y0,y1);
 const v1=smoothSlope(y0,y1,array[Math.min(i+2,array.length-1)]);
 const u2=u*u,u3=u2*u;
 return (2*u3-3*u2+1)*y0+(u3-2*u2+u)*v0+
  (-2*u3+3*u2)*y1+(u3-u2)*v1;
}
const PHASE_INTERVAL=D.GAME_RATE/12;
function sourcePhase(time){
 // Video phase tracking starts at footage ~462s (HUD 60.59), NOT
 // the former 60.00 used by the uncalibrated source events.
 const x=(time-D.CAMERA_START)/PHASE_INTERVAL;
 if(x<0)return (D.PHASE[0]+(D.PHASE[1]-D.PHASE[0])*x)/100;
 return smoothTrack(D.PHASE,x)/100;
}
function sourceZoom(time){
 const x=(time-D.CAMERA_START)*2;
 if(x<0)return (D.ZOOM[0]+(D.ZOOM[1]-D.ZOOM[0])*x)/100;
 return smoothTrack(D.ZOOM,x)/100;
}
function beforeCamera(t){
 const p=P[LEVEL].camera,phase=(Math.max(0,t)-p.start)*p.sampleRate;
 const frame=clamp(phase,0,p.frames.length-1),i=Math.floor(frame),u=frame-i;
 const f=p.frames[i],g=p.frames[Math.min(i+1,p.frames.length-1)];
 // The old Math.floor() froze both walls and backdrop for four 60fps
 // draws, then jumped the entire world in one draw.
 return f.map((v,k)=>v+(g[k]-v)*u);
}
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
function joinCamera(previous,angle,zoom,progress){
 const u=clamp(progress,0,1),v=u*u*(3-2*u);
 const a=Math.atan2(previous[1],previous[0]),radius=Math.hypot(previous[0],previous[1])||1;
 const rot=a+angleDelta(a,angle)*v,mag=radius+(zoom-radius)*v;
 const c=Math.cos(rot),sn=Math.sin(rot),base=[Math.cos(a)*radius,Math.sin(a)*radius,
  -Math.sin(a)*radius,Math.cos(a)*radius,0,0];
 const result=[c*mag,sn*mag,-sn*mag,c*mag,0,0];
 return result.map((x,i)=>x+(previous[i]-base[i])*(1-v));
}
function cameraAt(t,pulse=0){
 const time=Math.max(0,t),beat=clamp(pulse,0,1);
 if(time<60)return beforeCamera(time);
 const before=beforeCamera(60),a=Math.atan2(before[1],before[0]);
 const end=Math.min(time,REF_END),offset=a-sourcePhase(60);
 const tailRate=clamp((sourcePhase(REF_END)-sourcePhase(REF_END-.25))/.25,-4.5,4.5);
 const angle=sourcePhase(end)+offset+(time>REF_END?(time-REF_END)*tailRate:0);
 const z=sourceZoom(end)*(1+.036*beat),c=Math.cos(angle),sn=Math.sin(angle);
 const m=[c*z,sn*z,-sn*z,c*z,0,0];
 if(time<60.25)return joinCamera(before,angle,z,(time-60)/.25);
 return m;
}
function palette(t){const hue=D.hueAt(Math.max(0,Math.min(REF_END,t)));
 return [hue,90,[15,29,98]];
}
function shakeAt(audioTime,pulse,enabled){if(!enabled||!Number.isFinite(audioTime))return [0,0];
 const strength=clamp(pulse,0,1);if(strength<.02)return [0,0];
 const phase=((audioTime*160/60)%1+1)%1,env=strength*Math.sin(Math.PI*phase)**2;
 return [3.1*env*Math.sin(TAU*phase),2.1*env*Math.sin(2*TAU*phase)];
}
// Video ~488.950–489.217: unlike HYPER HEXAGON's slow game-over,
// the HEXAGONER ring expands IMMEDIATELY and the score panel appears
// about 0.27s after impact. Avoid the generic 1.20s delayed zoom.
const DEATH_TIMING=Object.freeze({flashEnd:.018,zoomStart:.018,zoomEnd:.178,resultStart:.267,peakScale:5.1});
function deathScale(age){const t=Math.max(0,age),d=DEATH_TIMING;
 if(t<=d.zoomStart)return 1;
 if(t<d.zoomEnd)return 1+(d.peakScale-1)*(t-d.zoomStart)/(d.zoomEnd-d.zoomStart);
 return d.peakScale-.2*clamp((t-d.zoomEnd)/(d.resultStart-d.zoomEnd),0,1);
}
class HyperHexagonerGame extends E.Game{
 constructor(data=create()){
  super(LEVEL,data);this.hyperHexagonerSource910=true;
  this._spawns=data.waves.map(w=>({...w,actors:w.sectors.map(sector=>({
   id:w.id+':'+sector,waveId:w.id,sector,band:0,sides:SIDES,
   r:w.r,thickness:w.thickness,offset:0,collapsed:false,
   points:[[0,0],[0,0],[0,0],[0,0]]
  }))})).sort((a,b)=>a.start-b.start);
  this._active=[];this._cursor=0;this._last=-Infinity;
  this.sides=SIDES;this.fromSides=SIDES;this.morph=1;
  this.recordedCamera=null;this.referenceCamera=null;this.sampleWalls();
 }
 get targetSides(){return SIDES}
 get playerSpeed(){return PLAYER_SPEED}
 sampleWalls(){if(!this._spawns)return;const t=this.time;
  if(t<this._last){this._active=[];this._cursor=0}
  this._last=t;this.wallFrame=Math.floor(t*60);
  this.recordedCamera=cameraAt(t);this.referenceCamera=this.recordedCamera;
  while(this._cursor<this._spawns.length&&this._spawns[this._cursor].start<=t)
   this._active.push(this._spawns[this._cursor++]);
  for(let i=this._active.length-1;i>=0;i--)if(t>=this._active[i].end)this._active.splice(i,1);
  this.walls.length=0;
  for(const w of this._active){const rad=w.r-w.speed*(t-w.start);
   for(const a of w.actors){a.r=rad+a.offset;
    const poly=E.wallVisualPoly(a);
    for(let j=0;j<4;j++){a.points[j][0]=poly[j][0];a.points[j][1]=poly[j][1]}
    const p=a.points;
    a.collapsed=Math.abs((p[1][0]-p[0][0])*(p[2][1]-p[0][1])-
      (p[1][1]-p[0][1])*(p[2][0]-p[0][0]))<1e-8;
    // As in task 1, a vanished or zero-area panel never blocks the orbit.
    if(!a.collapsed)this.walls.push(a);
   }
  }
 }
 hit(angle=this.angle){
  // Identical visible quadrilaterals and physical collision shapes:
  // point in polygon at the small central avatar hitbox, not its outline.
  const center=E.playerHitPoint(angle);
  return this.walls.find(w=>!w.collapsed&&E.pointInPolygon(center,w.points))||null;
 }
 die(w){
  if(!w||this.dead)return false;
  this.dead=true;
  const contact=E.playerHitPoint(this.angle);
  this.death={time:this.time,angle:this.angle,sides:this.sides,
   wallId:w.id,player:E.playerPoly(this.angle).map(p=>p.slice()),
   wall:w.points.map(p=>p.slice()),holes:[],contact:contact.slice()};
  // Capture exact source frame before camera or walls can advance.
  this.freezeDeath();
  return true;
 }
 freezeDeath(){if(this.deathCamera)return;
  const camera=this.recordedCamera?.slice()||this.lastDrawCamera?.slice()||cameraAt(this.time);
  if(!this.death){
   const w=this.hit();
   this.death={time:this.time,angle:this.angle,sides:this.sides,
    wallId:w?.id||null,player:E.playerPoly(this.angle).map(p=>p.slice()),
    wall:w?.points?.map(p=>p.slice())||[],holes:[],
    contact:E.playerHitPoint(this.angle).slice()};
  }
  this.deathCamera={rotation:Math.atan2(camera[1],camera[0]),zoom:this.zoom,
   tilt:this.tilt,time:this.time,sides:this.sides,angle:this.angle,affine:camera};
  this.rotationSpeed=0;
 }
 // Mode 2 inherits the sector-step effect, but ONLY this class' center
 // point test determines a death, matching task 1's side-contact rules.
 stepSector(direction){
  const moved=super.stepSector(direction);
  if(moved)this.die(this.hit());
  return moved;
 }
 // Do not call the base selectSector(): it can set dead before this
 // source-specific renderer captures an accurate collision frame.
 selectSector(sector){
  if(this.controlMode!==3||this.dead||this.timelineEnded||
   !Number.isInteger(sector)||sector<0||sector>=this.sides)return false;
  const from=this.angle,to=this.sectorAngle(sector);
  this.angle=to;this.playerLean=0;
  const turn=Math.atan2(Math.sin(to-from),Math.cos(to-from));
  if(Math.abs(turn)>1e-9)this.stepEffect={from,to,
   direction:Math.sign(turn),count:Math.abs(turn)/SEC,age:0,duration:.23};
  this.die(this.hit());
  return true;
 }
 update(dt,input=0){
  if(this.dead||this.timelineEnded||!(dt>0))return;
  const count=Math.max(1,Math.ceil(dt*240)),h=dt/count;
  for(let i=0;i<count;i++){
   // Advance a held direction before the walls advance, as in HardGame.
   // Lateral contact clips the movement to the last safe angle and is not
   // a death by itself. A descending wall covering the hit point is fatal.
   if(this.controlMode===1&&input){
    const from=this.angle,to=E.wrap(from+input*this.playerSpeed*h);
    if(!this.hit(to))this.angle=to;
    else if(!this.hit(from)){
     let lo=0,hi=1;
     for(let j=0;j<12;j++){
      const m=(lo+hi)*.5;
      if(this.hit(E.wrap(from+input*this.playerSpeed*h*m)))hi=m;else lo=m;
     }
     this.angle=E.wrap(from+input*this.playerSpeed*h*lo);
    }
   }
   this.teleportCooldown=Math.max(0,this.teleportCooldown-h);
   if(this.stepEffect){
    this.stepEffect.age+=h;
    if(this.stepEffect.age>=this.stepEffect.duration)this.stepEffect=null;
   }
   this.time+=h;
   if(this.time>=this.timeline.duration){
    this.time=this.timeline.duration;this.timelineEnded=true;break;
   }
   this.playerLean+=(input*.6-this.playerLean)*(1-Math.exp(-h/(input?.055:.085)));
   this.completed=this.time>=60;
   this.sides=SIDES;this.fromSides=SIDES;this.morph=1;this.pendingSides=SIDES;
   this.sampleWalls();
   this.rotation=Math.atan2(this.recordedCamera?.[1]||0,this.recordedCamera?.[0]||1);
   if(this.die(this.hit()))break;
  }
 }
}
const API=Object.freeze({HyperHexagonerGame,create,PRE_PARTS,BRIDGE,POST_PARTS,ALL_PARTS,
 SOURCE_EVENTS,PLAYER_SPEED,PLAYER_DEGREES_PER_TICK,SPEED,REF_END,SPECIAL,cameraAt,palette,shakeAt,deathScale,DEATH_TIMING,
 hasCoarseRoute});
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexHyper910=API;
})(typeof window!=='undefined'?window:globalThis);