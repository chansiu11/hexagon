/* HEXAGONER source-video parts (the 119-222s segment of 5mDjFdetU28).
   Only measured waves-stage-1.json geometry is reused; all internal wave
   order, thickness, orbit radii and relative timestamps remain intact.
 */
(function(root){'use strict';
const E=typeof module!=='undefined'?require('./engine'):root.HexEngine;
const REF=typeof module!=='undefined'?require('./hexagoner-reference-60'):root.HexHexagonerReference;
const TAU=Math.PI*2,RECOVERY_BREAK=.45,mod6=n=>(n%6+6)%6;
const distance=(a,b)=>Math.min(mod6(a-b),mod6(b-a));
function rng(seed){let s=seed>>>0;return ()=>{s=(s+0x6d2b79f5)>>>0;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296}}
function newSeed(){const a=new Uint32Array(1);if(root.crypto?.getRandomValues){root.crypto.getRandomValues(a);return a[0]}return (Date.now()^Math.random()*4294967296)>>>0}
function openings(waves,at){
 const nearby=waves.filter(w=>Math.abs(w.sourceImpact-at)<.16);let mask=0;
 for(const w of nearby)for(const k of w.sectors)mask|=1<<k;
 if(mask===63){mask=0;for(const k of waves[0].sectors)mask|=1<<k}
 const open=Array.from({length:6},(_,i)=>i).filter(k=>!(mask&(1<<k)));
 return open.length?open:[0,1,2,3,4,5];
}
function deriveParts(source){
 if(source?.mode!=='batched-wall-waves'||!Array.isArray(source.waves))
  throw Error('HEXAGONER requires the stage-2 measured wave timeline');
 const observed=source.waves.map(w=>({...w,sourceImpact:w.start+(w.r-66)/w.speed}))
  .sort((a,b)=>a.sourceImpact-b.sourceImpact||a.id-b.id);
 const parts=[];let first=0;
 for(let i=1;i<=observed.length;i++){
  if(i<observed.length&&observed[i].sourceImpact-observed[i-1].sourceImpact<RECOVERY_BREAK)continue;
  const waves=observed.slice(first,i),entry=waves[0].sourceImpact,exit=waves.at(-1).sourceImpact;
  parts.push({id:parts.length,sourceStart:entry,sourceEnd:exit,
   gapAfter:i<observed.length?observed[i].sourceImpact-exit:.65,
   entryOpenings:openings(waves,entry),exitOpenings:openings(waves,exit),waves});
  first=i;
 }
 return parts;
}
function create(source,seed=newSeed(),duration=900){
 const parts=deriveParts(source),random=rng(seed),waves=[],partOrder=[];
 if(!parts.length)throw Error('HEXAGONER video contains no measured waves');
 let bag=[],previous=null,lastId=-1,id=0;
 function choose(){
  if(!previous)return parts[0];
  if(!bag.length){bag=parts.slice(1);for(let i=bag.length-1;i>0;i--){
   const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];
  }}
  let options=[],bestCost=Infinity;
  for(let i=0;i<bag.length;i++){
   const p=bag[i],cost=Math.min(...p.entryOpenings.map(s=>distance(s,previous.safe)))+
    (p.id===lastId?4:0);
   if(cost<bestCost){bestCost=cost;options=[i]}
   else if(cost===bestCost)options.push(i);
  }
  return bag.splice(options[Math.floor(random()*options.length)],1)[0];
 }
 while(true){
  const part=choose(),first=!previous;
  const joinGap=first?0:Math.max(.48,Math.min(previous.part.gapAfter,.88));
  const target=first?part.sourceStart:previous.impact+joinGap,shift=target-part.sourceStart;
  if(target+part.sourceEnd-part.sourceStart>duration-.25)break;
  let rotation=0,costBest=Infinity;
  if(!first)for(let shift=0;shift<6;shift++){
   const dist=Math.min(...part.entryOpenings.map(s=>distance(mod6(s+shift),previous.safe)));
   const cost=dist*10+random()*.12;
   if(cost<costBest){costBest=cost;rotation=shift}
  }
  const group=partOrder.length;let lastImpact=target;
  for(const original of part.waves){
   const impact=original.sourceImpact+shift;
   waves.push({...original,id:id++,group,partId:part.id,
    sourceWaveId:original.id,sourceImpact:original.sourceImpact,
    sourceOffset:original.sourceImpact-part.sourceStart,partRotation:rotation,
    sectors:original.sectors.map(s=>mod6(s+rotation)),impact,
    start:original.start+shift,end:original.end+shift});
   lastImpact=impact;
  }
  const exitOpenings=part.exitOpenings.map(s=>mod6(s+rotation));
  const safe=previous?exitOpenings.reduce((a,b)=>distance(b,previous.safe)<distance(a,previous.safe)?b:a,exitOpenings[0]):exitOpenings[0];
  partOrder.push({partId:part.id,at:target,end:lastImpact,
   sourceStart:part.sourceStart,sourceEnd:part.sourceEnd,played:part.waves.length,
   rotation,joinGap,entryOpenings:part.entryOpenings.map(s=>mod6(s+rotation)),
   exitOpenings,exitSector:safe});
  previous={impact:lastImpact,safe,part};lastId=part.id;
 }
 return {mode:'hexagoner-part-waves',kind:'hexagoner-video-parts',seed:seed>>>0,
  duration,source:source.source,sourceVideoSegment:[119,222],
  sourceTimeline:source,sourcePartCount:parts.length,
  sampleRate:source.sampleRate,camera:source.camera,shapeSchedule:[[0,6]],waves,partOrder};
}
class HexagonerGame extends E.Game{
 constructor(data){
  super(1,data);this.hexagonerMode=true;this.profile=null;
  this._spawns=data.waves.slice().sort((a,b)=>a.start-b.start);
  this._cursor=0;this._active=[];this._sampleTime=-Infinity;this.sampleWalls();
 }
 get targetSides(){return 6}
 sampleWalls(){
  if(!this._spawns)return;
  const t=this.time,data=this.timeline;
  if(t<this._sampleTime){this._cursor=0;this._active.length=0}
  this._sampleTime=t;this.wallFrame=Math.floor(t*60);
  if(t<60&&REF){this.recordedCamera=REF.cameraAt(t)}else if(t<60&&data.camera?.length){
   const position=Math.max(0,Math.min(data.camera.length-1,t*data.sampleRate));
   const i=Math.floor(position),u=position-i,a=data.camera[i],b=data.camera[Math.min(i+1,data.camera.length-1)];
   this.recordedCamera=a.map((v,k)=>v+(b[k]-v)*u);
  }else this.recordedCamera=null;
  while(this._cursor<this._spawns.length&&this._spawns[this._cursor].start<=t)
   this._active.push(this._spawns[this._cursor++]);
  for(let i=this._active.length-1;i>=0;i--)if(this._active[i].end<=t)this._active.splice(i,1);
  this.walls.length=0;
  for(const w of this._active){
   const r=w.r-w.speed*(t-w.start);
   for(const sector of w.sectors)
    this.walls.push({id:w.id+':'+sector,waveId:w.id,sector,sides:6,r,thickness:w.thickness});
  }
  this.fromSides=6;this.sides=6;this.morph=1;
 }
 update(dt,input=0){
  const wasDead=this.dead;super.update(dt,input);
  if(!wasDead&&this.dead)this.deathCamera={rotation:this.rotation,zoom:this.zoom,
   tilt:this.tilt,time:this.time,affine:this.referenceCamera?.slice()||this.recordedCamera?.slice()||null};
 }
}
const API={RECOVERY_BREAK,deriveParts,create,HexagonerGame};
if(typeof module!=='undefined')module.exports=API;else root.HexHexagonerParts=API;
})(typeof window!=='undefined'?window:globalThis);
