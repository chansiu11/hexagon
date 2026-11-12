'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const native=Module._load;
const fixture=JSON.parse(fs.readFileSync(__dirname+'/pre_fixture.json','utf8'));
const parts=fixture.map(([a,b,n,ev],i)=>({id:'H7-'+String(i+1).padStart(2,'0'),sourceStart:a,
 sourceEnd:b,sourceVideoStart:303.49+a,sourceVideoEnd:303.49+b,
 sides:n,events:ev.map(([at,sides,mask,width])=>({at,sides,mask,width}))}));
class Game{
 constructor(level,data){this.level=level;this.timeline=data;this.time=0;this.angle=-Math.PI/2;this.fromSides=6;this.sides=6;this.morph=1;this.walls=[];this.rotation=0;this.zoom=1;this.tilt=0;this.controlMode=1;this.dead=false;this.timelineEnded=false;}
 update(dt,input){this.time+=dt;this.morph=Math.min(1,this.morph+dt/.45);this.sampleWalls();this.dead=!!this.hit();}
 setControlMode(n){this.controlMode=n;}
 stepSector(dir){this.angle=((this.angle+dir*2*Math.PI/this.sides)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);return true;}
 selectSector(k){this.angle=(k+.5)*2*Math.PI/this.sides;return true;}
}
const E={Game,ORIGINAL_ARROW_DEGREES_PER_TICK:[7,7,9,7,7,9],
 wrap:x=>((x%(2*Math.PI))+2*Math.PI)%(2*Math.PI),
 playerHitPoint:a=>[66*Math.cos(a),66*Math.sin(a)],
 playerPoly:a=>[[66*Math.cos(a),66*Math.sin(a)],[64*Math.cos(a+.1),64*Math.sin(a+.1)],[64*Math.cos(a-.1),64*Math.sin(a-.1)]],
 pointInPolygon(p,poly){const [x,y]=p;let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
 const a=poly[j],b=poly[i];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside;},
 wallVisualPoly(w){const a=2*Math.PI*w.sector/w.sides,b=2*Math.PI*(w.sector+1)/w.sides;
 const r=Math.max(0,w.r),r2=Math.max(r,w.r+w.thickness);
 return [[r*Math.cos(a),r*Math.sin(a)],[r*Math.cos(b),r*Math.sin(b)],
 [r2*Math.cos(b),r2*Math.sin(b)],[r2*Math.cos(a),r2*Math.sin(a)]];}
};
Module._load=function(request,parent,isMain){
 if(parent?.filename?.endsWith('/hyper-hexagon-78.js')){
  if(request==='./engine')return E;
  if(request==='./hyper-hexagon-stage7')return {PARTS:parts,SPEED:452.480684906848,
   cameraAt:t=>[Math.cos(t)*.98,Math.sin(t)*.98,-Math.sin(t)*.98,Math.cos(t)*.98,0,0],
   palette:t=>[210,92,[8,18,59]]};
 }
 return native.apply(this,arguments);
};
const H=require('./hyper-hexagon-78.js');
assert.equal(H.PRE_PARTS.length,18);assert.equal(H.POST_PARTS.length,11);
assert.equal(H.ALL_PARTS.length,30);assert.equal(H.SOURCE_WALLS,112);
assert.equal(H.BRIDGE.sourceStart,59.6);assert.equal(H.BRIDGE.sourceEnd,63.75);
assert.equal(H.BRIDGE.events.length,6);
assert.equal(H.PLAYER_SPEED,540*Math.PI/180);
assert.equal(H.PLAYER_DEGREES_PER_TICK,9);
assert.equal(H.DEATH_TIMING.zoomStart,.83);
assert.equal(H.DEATH_TIMING.resultStart,1.20);
assert.equal(H.deathScale(.5),1);
const video=H.create(null,311,200,{order:'video'});
assert.equal(video.orderMode,'video');assert.equal(video.waves.length,112);
assert.equal(video.partOrder.filter(p=>p.anchored).length>=1,true);
assert(video.partOrder.some(p=>p.id==='H78-BRIDGE'&&p.at===59.6));
assert(video.waves.filter(w=>w.sourceTime>=60&&w.sourceTime<63).every(w=>w.start<60));
for(let i=1;i<video.waves.length;i++)assert(video.waves[i].sourceTime>=video.waves[i-1].sourceTime);
const sourceHashes=new Map(video.waves.map(w=>[w.sourceEventId+':'+w.partId,JSON.stringify([w.sourceMask,w.estimatedWidth,w.speed])]));
const variants=[];const fallback=[];
let shuffledSlots=0;
for(const seed of [1,2,3,5,7,11,2026,77777,12345,81201]){
 const d=H.create(null,seed,200),g=new H.HyperGame(d);
 variants.push(d.partOrder.map(p=>p.id).join(','));fallback.push(d.routeFallback||null);
 shuffledSlots+=d.partOrder.filter((p,i)=>p.id!==video.partOrder[i].id).length;
 for(let i=0;i<d.partOrder.length;i++){
  const slot=d.partOrder[i],sourceSlot=video.partOrder[i],next=d.partOrder[i+1];
  assert.equal(slot.at,sourceSlot.at,'random phrase must use video-slot impact clock');
  if(next&&!slot.anchored)assert(slot.end<=next.at-.27,'phrase must fit without crossing the next phrase');
  if(!slot.anchored)assert.equal(slot.sides,sourceSlot.sides,'match source shape at every slot');
 }
 assert.equal(d.partOrder.filter(p=>p.id==='H78-BRIDGE').length,1);
 // Random mode uses compatible whole phrases from the bank; reuse and
 // differing event counts are expected. The original VIDEO bank has 112.
 assert.equal(d.partOrder.length,30);
 assert(d.waves.length>=75&&d.waves.length<=160);
 assert(d.waves.every(w=>w.partRotation===0&&w.sectors.every(k=>w.sourceMask&(1<<k))));
 for(const w of d.waves){
  assert.equal(sourceHashes.get(w.sourceEventId+':'+w.partId),JSON.stringify([w.sourceMask,w.estimatedWidth,w.speed]));
  assert(w.start>=0&&w.end>w.impact);
 }
 // The original video had no 100s+ source events. Don't invent them.
 assert(!d.waves.some(w=>w.sourceTime>H.REF_END));
 for(let t of [0,5,20,35,59.95,60.1,62,70,75.3,82.9,90,99]){
  g.time=t;g.sampleWalls();assert(g.walls.every(w=>w.points.every(p=>p.every(Number.isFinite))));
 }
}
assert(new Set(variants).size>=8,'diverse whole-phrase permutations should occur');
assert(shuffledSlots>=65,'on average more than 6 of the 30 part positions should change');
assert(!fallback.some(Boolean),'10 deterministic seeds should not need source-order fallback');
for(const [t,n] of [[59,5],[63.5,6],[70,5],[76,4],[83,5],[89,4],[95,5]])assert.equal(H.sidesAt(t),n);
for(let t=0;t<99;t+=.16){
 const m=H.cameraAt(t);assert(m.every(Number.isFinite));
 if(t>=60.25){assert(Math.abs(Math.hypot(m[0],m[1])-Math.hypot(m[2],m[3]))<1e-7);}
}
const near=H.cameraAt(60),after=H.cameraAt(60.01);
assert(Math.hypot(...near.map((x,i)=>x-after[i]))<.15,'camera 60s handoff is continuous');
assert.equal(H.deathScale(0),1);assert(H.deathScale(1.15)>4);
{
 const g=new H.HyperGame(H.create(null,12,115,{order:'video'}));
 g.time=20;g.sampleWalls();const source=g.recordedCamera.slice();
 g.freezeDeathCamera();
 assert(g.death&&g.death.sides===g.sides&&g.death.contact.length===2);
 assert.deepEqual(g.deathCamera.affine,source,'capture the impact physics frame, not a stale rendered frame');
 g.time=20.2;g.sampleWalls();assert.deepEqual(g.deathCamera.affine,source);
}
assert.deepEqual(H.shakeAt(2,1,false),[0,0]);
fs.writeFileSync(__dirname+'/parts-derived.json',JSON.stringify(H.ALL_PARTS.map(p=>({id:p.id,era:p.era,anchored:!!p.anchored,sourceStart:p.sourceStart,sourceEnd:p.sourceEnd,sourceVideoStart:p.sourceVideoStart,sourceVideoEnd:p.sourceVideoEnd,sides:p.sides,count:p.events.length})),null,2));
console.log('RANDOM distinct:',new Set(variants).size,'fallbacks:',fallback.filter(Boolean).length,'of',fallback.length);
console.log('PASS hyper task7/8: VIDEO order 112 source cues, 18+bridge+11 source parts, 60s bridge fixed, 540deg/s, 10 well-shuffled phrase bags; random event count varies by part choice');