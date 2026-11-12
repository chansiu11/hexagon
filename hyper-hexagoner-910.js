/* HYPER HEXAGONER — task 9 (<60 HUD seconds) and task 10 (>=60).
 * Source 1557(10).mp4 video 06:44.40–08:09.0, observed result ~88.04.
 * 64 optical orbit-crossing cues; grouped into intact dodge phrases.
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
const PLAYER_SPEED=E.PLAYER_SPEED_BY_LEVEL?.[LEVEL]||7*TAU/360*60; // stage 1/5 7° per 60Hz tick
const mod=(a,n)=>(a%n+n)%n,clamp=(a,b,c)=>Math.max(b,Math.min(c,a));
function rng(seed){let x=(seed^0x7af927d3)>>>0;return ()=>{x=(x+0x6d2b79f5)>>>0;
 let y=Math.imul(x^(x>>>15),1|x);y^=y+Math.imul(y^(y>>>7),61|y);
 return ((y^(y>>>14))>>>0)/4294967296;};}
function seedNow(){let a=new Uint32Array(1);if(root.crypto?.getRandomValues){root.crypto.getRandomValues(a);return a[0]}
 return (Date.now()^(Math.random()*0xffffffff))>>>0;}
const SOURCE_EVENTS=Object.freeze(D.EVENTS.map(e=>Object.freeze({...e,
 sectors:Object.freeze(Array.from({length:SIDES},(_,i)=>i).filter(i=>e.mask&(1<<i)))})));
function groupParts(list,era,prefix,gap=1.46){let chunks=[],buffer=[];
 for(const e of list){if(buffer.length&&e.time-buffer.at(-1).time>=gap){chunks.push(buffer);buffer=[]}buffer.push(e)}
 if(buffer.length)chunks.push(buffer);
 return Object.freeze(chunks.map((es,i)=>Object.freeze({
  id:prefix+String(i+1).padStart(2,'0'),era,anchored:false,
  sourceStart:es[0].time,sourceEnd:es.at(-1).time,
  sourceVideoStart:es[0].videoSecond,sourceVideoEnd:es.at(-1).videoSecond,
  events:Object.freeze(es.map(e=>Object.freeze({...e,offset:e.time-es[0].time})))
 })));
}
const BRIDGE_FROM=57.55,BRIDGE_UNTIL=62.33;
const PRE_PARTS=groupParts(SOURCE_EVENTS.filter(e=>e.time<BRIDGE_FROM),9,'H9-');
const POST_PARTS=groupParts(SOURCE_EVENTS.filter(e=>e.time>BRIDGE_UNTIL),10,'H10-');
const bridgeEvents=SOURCE_EVENTS.filter(e=>e.time>=BRIDGE_FROM&&e.time<=BRIDGE_UNTIL);
const BRIDGE=Object.freeze({id:'H9-10-BRIDGE',era:'bridge',anchored:true,
 sourceStart:bridgeEvents[0].time,sourceEnd:bridgeEvents.at(-1).time,
 sourceVideoStart:bridgeEvents[0].videoSecond,sourceVideoEnd:bridgeEvents.at(-1).videoSecond,
 events:Object.freeze(bridgeEvents.map(e=>Object.freeze({...e,offset:e.time-bridgeEvents[0].time})))});
const ALL_PARTS=Object.freeze([...PRE_PARTS,BRIDGE,...POST_PARTS]);
const SOURCE_COUNT=ALL_PARTS.reduce((n,p)=>n+p.events.length,0);
if(SOURCE_COUNT!==64||BRIDGE.events.length!==5)throw Error('Unexpected task9/10 video event inventory');
function shuffle(items,random,lockFirst=false){const first=lockFirst?items.slice(0,1):[],pool=items.slice(first.length);
 for(let k=pool.length-1;k>0;k--){const j=Math.floor(random()*(k+1));[pool[j],pool[k]]=[pool[k],pool[j]]}
 return [...first,...pool];
}
function arrangeEra(parts,random,video,keepFirst){const picked=video?parts:shuffle(parts,random,keepFirst),result=[];
 let current=parts[0]?.sourceStart||0;
 for(let i=0;i<picked.length;i++){
  const part=picked[i],slot=parts[i];result.push({part,at:current});
  const gap=i+1<parts.length?Math.max(.12,parts[i+1].sourceStart-slot.sourceEnd):0;
  current+=part.sourceEnd-part.sourceStart+gap;
 }
 return result;
}
function arrangement(seed,video){const random=rng(seed);
 return [...arrangeEra(PRE_PARTS,random,video,true),{part:BRIDGE,at:BRIDGE.sourceStart},
 ...arrangeEra(POST_PARTS,random,video,false)];
}
const SPECIAL=Object.freeze({
 'H9-05':'double-rail','H9-08':'staircase','H9-12':'comb',
 'H10-02':'double-rail','H10-05':'comb','H10-07':'staircase'
});
function bands(w){if(w.special==='double-rail'&&w.thickness>=50)return [[0,.40],[.57,1]];
 if(w.special==='comb'&&w.thickness>=68)return [[0,.25],[.37,.61],[.75,1]];
 return [[0,1]];
}
function wallFrom(e,at,id,group,part){const impact=at+e.offset;
 const radius=Math.min(MAX_RADIUS,ORBIT+SPEED*Math.max(0,impact-.14)),start=impact-(radius-ORBIT)/SPEED;
 return {id,group,partId:part.id,partEvent:part.events.indexOf(e),
  sourceGameSecond:e.time,sourceVideoSecond:e.videoSecond,sourceEventId:e.id,
  sourceMask:e.mask,sourceWidth:e.width,partRotation:0,mirrored:false,
  sides:SIDES,sectors:e.sectors.slice(),safeSector:e.sectors.length<SIDES?
   Array.from({length:SIDES},(_,i)=>i).find(i=>!e.sectors.includes(i)):null,
  impact,r:radius,start,speed:SPEED,thickness:e.width,
  special:SPECIAL[part.id]||null,end:impact+(e.width+ORBIT-25)/SPEED};
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
 if(extended&&!video){let at=POST_PARTS.at(-1).sourceEnd+1.4,random=rng(seed^0x124ef8),loops=0;
  while(at<duration&&loops++<48&&POST_PARTS.length){
   for(const part of shuffle(POST_PARTS,random)){if(at>=duration)break;
    const group=partOrder.length;let count=0;
    for(const e of part.events){if(at+e.offset>=duration)break;
     waves.push(wallFrom(e,at,waves.length,group,part));count++;
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
function beforeCamera(t){const p=P[LEVEL].camera;
 const ix=clamp(Math.floor((Math.max(0,t)-p.start)*p.sampleRate+1e-8),0,p.frames.length-1);
 return p.frames[ix].slice();
}
function cameraAt(t,pulse=0){const time=Math.max(0,t),beat=clamp(pulse,0,1);
 if(time<60)return beforeCamera(time);
 const before=beforeCamera(59.93),a=Math.atan2(before[1],before[0]),
  offset=a-D.cameraPost(60),end=Math.min(time,REF_END),
  tailRate=clamp((D.cameraPost(REF_END)-D.cameraPost(REF_END-.25))/.25,-4.5,4.5),
  angle=D.cameraPost(end)+offset+(time>REF_END?(time-REF_END)*tailRate:0);
 const z=D.zoomPost(end)*(1+.036*beat),c=Math.cos(angle),s=Math.sin(angle),
  m=[c*z,s*z,-s*z,c*z,0,0];
 if(time<60.25){const f=(time-60)/.25;return before.map((x,i)=>x*(1-f)+m[i]*f)}
 return m;
}
function palette(t){const hue=D.hueAt(Math.max(0,Math.min(REF_END,t)));
 return [hue,90,[15,29,98]];
}
function shakeAt(audioTime,pulse,enabled){if(!enabled||!Number.isFinite(audioTime))return [0,0];
 const strength=clamp(pulse,0,1);if(strength<.02)return [0,0];
 const cycle=Math.floor(audioTime*160/60);return [((cycle&1)?1:-1)*3.1*strength,((cycle%3)?1:-1)*2.1*strength];
}
function deathScale(age){if(age<.933333)return 1;if(age<1.1)return 1+4.1*(age-.933333)/(.166667);
 return 5.1-.2*clamp((age-1.1)/.1,0,1);}
class HyperHexagonerGame extends E.Game{
 constructor(data=create()){
  super(LEVEL,data);this.hyperHexagonerSource910=true;
  this._spawns=data.waves.map(w=>({...w,actors:bands(w).flatMap(([lo,hi],band)=>w.sectors.map(sector=>({
   id:w.id+':'+sector+':'+band,waveId:w.id,sector,band,sides:SIDES,
   r:w.r,thickness:(hi-lo)*w.thickness,offset:lo*w.thickness,
   points:[[0,0],[0,0],[0,0],[0,0]]
  })))})).sort((a,b)=>a.start-b.start);
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
    this.walls.push(a);
   }
  }
 }
 hit(angle=this.angle){const center=E.playerHitPoint(angle);
  return this.walls.find(w=>E.pointInPolygon(center,w.points))||false;
 }
 freezeDeath(){if(this.deathCamera)return;
  this.deathCamera={rotation:this.rotation,zoom:this.zoom,tilt:this.tilt,time:this.time,
   affine:this.lastDrawCamera?.slice()||this.recordedCamera?.slice()};
  this.rotationSpeed=0;
 }
 stepSector(direction){const moved=super.stepSector(direction);if(moved&&this.hit()){this.dead=true;this.freezeDeath()}return moved;}
 selectSector(sector){const moved=super.selectSector(sector);if(moved){this.dead=!!this.hit();if(this.dead)this.freezeDeath()}return moved;}
 update(dt,input=0){if(this.dead||this.timelineEnded||dt<=0)return;
  const count=Math.max(1,Math.ceil(dt*240)),h=dt/count;
  for(let i=0;i<count;i++){
   if(this.stepEffect){this.stepEffect.age+=h;if(this.stepEffect.age>=this.stepEffect.duration)this.stepEffect=null}
   this.teleportCooldown=Math.max(0,this.teleportCooldown-h);
   this.time+=h;this.completed=this.time>=60;
   if(this.time>=this.timeline.duration){this.time=this.timeline.duration;this.timelineEnded=true;break}
   if(this.controlMode===1&&input){const from=this.angle,to=E.wrap(from+input*this.playerSpeed*h);
    if(!this.hit(to))this.angle=to;
    else if(!this.hit(from)){let lo=0,hi=1;for(let k=0;k<12;k++){
     const u=(lo+hi)/2;if(this.hit(E.wrap(from+input*this.playerSpeed*h*u)))hi=u;else lo=u;
    }this.angle=E.wrap(from+input*this.playerSpeed*h*lo)}
   }
   this.playerLean+=(input*.6-this.playerLean)*(1-Math.exp(-h/(input?.055:.085)));
   this.rotation=Math.atan2(this.recordedCamera?.[1]||0,this.recordedCamera?.[0]||1);
   this.sides=SIDES;this.fromSides=SIDES;this.morph=1;this.pendingSides=SIDES;
   this.sampleWalls();if(this.hit()){this.dead=true;this.freezeDeath();break}
  }
 }
}
const API=Object.freeze({HyperHexagonerGame,create,PRE_PARTS,BRIDGE,POST_PARTS,ALL_PARTS,
 SOURCE_EVENTS,PLAYER_SPEED,SPEED,REF_END,SPECIAL,cameraAt,palette,shakeAt,deathScale,
 hasCoarseRoute});
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexHyper910=API;
})(typeof window!=='undefined'?window:globalThis);