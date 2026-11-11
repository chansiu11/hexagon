/* HEXAGONER 0–60 / 60+ reconstruction from 1557(8).mp4.
 * Strictly level 1 (tasks 3 & 4). Other stages and storage are untouched.
 * 134 video-derived approximate wall crossings grouped as continuous dodge
 * parts. Only whole-part ORDER and a constant whole-part orientation change.
 * Internal mask/width/source offset are immutable. Video-time color and
 * camera matrices have no random inputs. No video/audio redistributed.
 */
(function(root){'use strict';
const E=typeof module!=='undefined'?require('./engine'):root.HexEngine;
const REF=typeof module!=='undefined'?require('./stage-profiles'):root.StageProfiles;
const P=typeof module!=='undefined'?require('./hexagoner-post60'):root.HexHexagonerPost60;
const D=typeof module!=='undefined'?require('./hexagoner-video8-data'):root.HexHexagonerVideo8Data;
const TAU=Math.PI*2,SECTOR=TAU/6,SPEED=355,SPAWN=1100,RECOVERY=1.0;
const SECTOR_UNITS=Array.from({length:7},(_,i)=>[Math.cos(i*SECTOR),Math.sin(i*SECTOR)]);
const modulo=(n,m)=>(n%m+m)%m;
const circularDistance=(a,b)=>Math.min(modulo(a-b,6),modulo(b-a,6));
const ANGULAR_SPEED=7*TAU/360*60; // documented 7° per 60Hz tick for this mode.
function keyAt(keys,t){
 if(t<=keys[0][0])return keys[0][1];
 for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){
  const a=keys[i-1],b=keys[i],u=(t-a[0])/(b[0]-a[0]);
  return a[1]+(b[1]-a[1])*u;
 }
 return keys.at(-1)[1];
}
function palette(t){
 return t<60?[keyAt(D.PRE_HUES,t),94,[6,16,63]]:
  [keyAt(D.POST_HUES,t),88,[96,86,47]];
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
function sourceAngle(t){
 const c=REF[1].camera,p=Math.max(0,Math.min(c.frames.length-1,(t-c.start)*c.sampleRate));
 const i=Math.floor(p),u=p-i,a=c.frames[i],b=c.frames[Math.min(i+1,c.frames.length-1)];
 const theta0=Math.atan2(a[1],a[0]),theta1=Math.atan2(b[1],b[0]);
 const delta=modulo(theta1-theta0+Math.PI,TAU)-Math.PI;
 return theta0+delta*u;
}
function cameraAt(t,beatAge=Infinity){
 const tm=Math.max(0,t);
 const angle=tm<60?sourceAngle(tm):
  sourceAngle(59.9333)+interpolateSpin(P.CAMERA,tm)-interpolateSpin(P.CAMERA,60);
 const preEnd=baselineZoom(D.PRE_ZOOM_100,59.999);
 const u=Math.max(0,Math.min(1,(tm-60)/.7)),e=u*u*(3-2*u);
 const zoom0=tm<60?baselineZoom(D.PRE_ZOOM_100,tm):
  preEnd*(1-e)+baselineZoom(D.POST_ZOOM_100,tm-60)*e;
 const z=zoom0*beatScale(beatAge),c=Math.cos(angle),sn=Math.sin(angle);
 // Remove shear, squeeze and tilted perspective; keep camera spin only.
 return [c*z,sn*z,-sn*z,c*z,0,0];
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
const SOURCE_EVENTS=D.EVENTS.map(e=>{
 const camera=cameraAt(e.time),magnification=Math.hypot(camera[0],camera[1])||1;
 const width=Math.max(22,Math.min(116,Math.round(2*e.widthPx/magnification)));
 return Object.freeze({time:e.time,videoSecond:e.videoSecond,width,
  sectors:Object.freeze(videoMaskToWorld(e)),sourceMask:e.screenMask,
  widthPixels:e.widthPx});
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
 return chunks.map((rawChunk,i)=>{const chunk=era===1?stabilizePostVideoMasks(rawChunk):rawChunk;return Object.freeze({
  id:'HX'+(era?4:3)+'-'+String(i+1).padStart(2,'0'),era,
  sourceStart:chunk[0].time,sourceEnd:chunk.at(-1).time,
  sourceVideoStart:chunk[0].videoSecond,sourceVideoEnd:chunk.at(-1).videoSecond,
  events:Object.freeze(chunk.map(e=>Object.freeze({...e,offset:e.time-chunk[0].time})))
 });});
}
const PARTS_PRE=groupParts(0),PARTS_POST=groupParts(1);
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
function chooseShift(part,previousSafe){
 if(previousSafe===null)return 0;
 let best=0,cost=Infinity;
 for(let shift=0;shift<6;shift++){
  const sectors=part.events[0].sectors.map(s=>modulo(s+shift,6));
  const openness=findOpen(sectors);
  if(!openness.length)continue;
  const value=Math.min(...openness.map(k=>circularDistance(k,previousSafe)));
  if(value<cost){cost=value;best=shift}
 }
 return best;
}
function create(sourceTimeline=null,seed=newSeed(),duration=900){
 const random=randomFrom(seed),waves=[],partOrder=[];
 let waveId=0,previousSafe=null,previousImpact=0,previousWidth=50;
 function append(era,parts,limit){
  let bag=[],lastPart='',at=era===0?PARTS_PRE[0].sourceStart:
   Math.max(62.75,previousImpact+(previousWidth+105)/SPEED+.37);
  function refill(){
   bag=parts.slice();
   for(let i=bag.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];
   }
  }
  let counter=0;
  while(at<limit-.15&&waveId<9000&&counter++<5000){
   if(!bag.length)refill();
   let part;
   if(era===0&&partOrder.length===0){
    part=parts[0];bag=bag.filter(p=>p!==part);
   }else{
    let candidates=bag.filter(p=>p.sourceEnd-p.sourceStart<=limit-at-.07);
    if(!candidates.length){at+=.20;continue}
    part=candidates.find(p=>p.id!==lastPart)||candidates[0];
    bag.splice(bag.indexOf(part),1);
   }
   const shift=chooseShift(part,previousSafe),firstImpact=at;
   let lastWave=null;
   for(let j=0;j<part.events.length;j++){
    const event=part.events[j],impact=firstImpact+event.offset;
    if(impact>=limit-.005)break;
    const sectorList=event.sectors.map(s=>modulo(s+shift,6)).sort((a,b)=>a-b);
    const open=findOpen(sectorList);
    if(!open.length||!sectorList.length)continue;
    const safe=open.reduce((best,s)=>previousSafe===null||
     circularDistance(s,previousSafe)<circularDistance(best,previousSafe)?s:best,open[0]);
    // Outer rings enter from beyond the field where possible. At the 60s
    // boundary no newly selected post60 wall is already inside the screen.
    const radius=Math.min(SPAWN,66+SPEED*Math.max(.09,impact-(era?60.06:.03)));
    const birth=impact-(radius-66)/SPEED;
    if(era===1&&birth<60-1e-6)continue;
    const w={id:waveId++,group:partOrder.length,partId:part.id,
     partEvent:j,sourceVideo:'1557(8).mp4',sourceVideoSecond:event.videoSecond,
     sourceGameSecond:event.time,sourceOffset:event.offset,partRotation:shift,
     sourceSectors:event.sectors.slice(),sourceWidthPx:event.widthPixels,
     sides:6,sectors:sectorList,safeSector:safe,safeAngle:(safe+.5)*SECTOR,
     impact,r:radius,speed:SPEED,thickness:event.width,start:birth,
     end:birth+(radius+event.width-24)/SPEED};
    waves.push(w);lastWave=w;previousSafe=safe;
   }
   if(!lastWave){at+=.20;continue}
   partOrder.push({id:part.id,era,at:firstImpact,end:lastWave.impact,
    sourceStart:part.sourceStart,sourceEnd:part.sourceEnd,
    sourceVideoStart:part.sourceVideoStart,sourceVideoEnd:part.sourceVideoEnd,
    played:part.events.length,rotation:shift,exitSector:previousSafe});
   previousImpact=lastWave.impact;previousWidth=lastWave.thickness;
   lastPart=part.id;
   at=lastWave.impact+Math.max(.48,(previousWidth+82)/SPEED+.19);
  }
 }
 append(0,PARTS_PRE,Math.min(duration,60));
 if(duration>60)append(1,PARTS_POST,duration);
 return {mode:'hexagoner-video8',kind:'hexagoner-video8',seed:seed>>>0,
  duration,source:'1557(8).mp4',sourceVideoSegment:[119.5,223.5],
  sourceTimeline,shapeSchedule:[[0,6]],waves,partOrder,
  sourceEventCount:SOURCE_EVENTS.length,preSourcePartCount:PARTS_PRE.length,
  post60PartCount:PARTS_POST.length,playerSpeedReference:ANGULAR_SPEED};
}
class HexagonerGame extends E.Game{
 constructor(data=create()){
  super(1,data);this.hexagonerMode=true;this.hexagonerSource8=true;
  this.profile=null;this.fromSides=6;this.sides=6;this.morph=1;
  // Allocate every wall panel and its four collision vertices only once.
  // During physics ticks mutate positions in place, with zero new polygons.
  this._spawns=data.waves.map(w=>({...w,actors:w.sectors.map(sector=>({
   id:w.id+':'+sector,waveId:w.id,sector,sides:6,r:w.r,
   thickness:w.thickness,points:[[0,0],[0,0],[0,0],[0,0]]
  }))})).sort((a,b)=>a.start-b.start);
  this._active=[];this._cursor=0;this._sampleTime=-Infinity;
  this._lastCameraFrame=-1;
  this.recordedCamera=null;this.referenceCamera=null;this.sampleWalls();
 }
 get playerSpeed(){return ANGULAR_SPEED}
 get targetSides(){return 6}
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
   const inner=Math.max(0,radius),outer=Math.max(inner,radius+wave.thickness);
   for(const w of wave.actors){
    w.r=radius;
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
  const wasDead=this.dead;super.update(dt,input);
  if(!wasDead&&this.dead){
   this.deathCamera={rotation:this.rotation,zoom:this.zoom,tilt:this.tilt,
    time:this.time,affine:this.recordedCamera?.slice()||null};
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
 PARTS_PRE,PARTS_POST,SOURCE_EVENTS,RECOVERY,VIDEO_START:D.VIDEO_START};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexHexagonerVideo8=API;
})(typeof window!=='undefined'?window:globalThis);
