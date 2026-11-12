'use strict';
const assert=require('node:assert/strict');
const D=require('./hyper-hexagoner-910-data');
const TAU=2*Math.PI;
const mockEngine={
 PLAYER_SPEED_BY_LEVEL:[7,7,9,7,7,9].map(n=>n*TAU/360*60),
 Game:class {constructor(level,timeline){this.level=level;this.timeline=timeline;this.time=0;this.angle=4.71238898;this.walls=[];this.rotation=0;this.rotationSpeed=0;this.zoom=1;this.tilt=0;this.playerLean=0;this.sides=6;this.fromSides=6;this.morph=1;this.controlMode=1;this.dead=false;this.completed=false;this.timelineEnded=false;this.teleportCooldown=0;}
 stepSector(){return false}selectSector(){return false}},
 wrap:a=>(a%TAU+TAU)%TAU,
 playerHitPoint:a=>[Math.cos(a)*66,Math.sin(a)*66],
 playerPoly:a=>[[66*Math.cos(a),66*Math.sin(a)],[64*Math.cos(a+.1),64*Math.sin(a+.1)],[64*Math.cos(a-.1),64*Math.sin(a-.1)]],
 pointInPolygon:(p,poly)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&(p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]))hit=!hit;}return hit},
 wallVisualPoly:w=>{const a=w.sector*TAU/w.sides,b=(w.sector+1)*TAU/w.sides;return [[Math.cos(a)*w.r,Math.sin(a)*w.r],[Math.cos(b)*w.r,Math.sin(b)*w.r],[Math.cos(b)*(w.r+w.thickness),Math.sin(b)*(w.r+w.thickness)],[Math.cos(a)*(w.r+w.thickness),Math.sin(a)*(w.r+w.thickness)]];}
};
const mockProfiles=Array.from({length:6},()=>({camera:{start:0,sampleRate:15,frames:Array.from({length:900},(_,i)=>[Math.cos(i/15*.2),Math.sin(i/15*.2),-Math.sin(i/15*.2),Math.cos(i/15*.2),0,0])}}));
const {createRequire}=require('node:module');const fs=require('node:fs');const vm=require('node:vm');
const src=fs.readFileSync(__dirname+'/hyper-hexagoner-910.js','utf8');const H={exports:{}};
new Function('module','require',src)(H,p=>p==='./engine'?mockEngine:p==='./stage-profiles'?mockProfiles:p==='./hyper-hexagoner-910-data'?D:null);
const M=H.exports;
assert.equal(D.EVENTS.length,63);assert.equal(M.SOURCE_EVENTS.length,63);
assert.equal(M.BRIDGE.events.length,5);
assert.equal(M.PRE_PARTS.length,26);assert.equal(M.POST_PARTS.length,9);
assert.equal(M.ALL_PARTS.length,36);
assert.equal(D.GAP_OBSERVATIONS.length,13);
assert.equal(M.SPECIAL&&Object.keys(M.SPECIAL).length,0,'do not invent striped source walls');
assert.equal(M.BRIDGE.sourceStart,D.EVENTS[39].time);
assert.equal(M.BRIDGE.sourceEnd,D.EVENTS[43].time);
assert(D.EVENTS[39].time<60&&D.EVENTS[43].time>60);
assert(Math.abs(D.EVENTS[0].time-2.29)<.03,'the filmed HUD first wall is at 2.29s');
assert(D.EVENTS.at(-1).time<88.04,'post-death camera flash is not a video wall');
assert(D.gameTimeAtVideo(488.31)===88.04,'old event 64 was observed after gameover');
const video=M.create(null,25,90,{order:'video'});
assert.equal(video.waves.length,76);
assert.equal(video.waves.filter(w=>w.opticalGap).length,13);
const original=video.waves.filter(w=>Number.isInteger(w.sourceEventId))
 .sort((a,b)=>a.sourceEventId-b.sourceEventId);
assert.equal(original.length,63);
assert(video.waves.every(w=>!w.repeatedAfterReference&&w.special===null));
assert.deepEqual(original.map(w=>w.sourceMask),D.EVENTS.map(e=>e.mask));
assert.deepEqual(original.map(w=>w.sourceWidth),D.EVENTS.map(e=>e.width));
assert.deepEqual(original.map(w=>w.sourceGameSecond),D.EVENTS.map(e=>e.time));
assert.equal(new Set(M.ALL_PARTS.flatMap(p=>p.events.map(e=>e.id))).size,76);
assert(video.partOrder.every(p=>!p.rotation&&!p.mirrored));
assert(video.partOrder.filter(p=>p.anchored).length===1);
assert.deepEqual(original.map(w=>w.sectors),M.SOURCE_EVENTS.map(e=>e.sectors));
assert(video.waves.find(w=>w.sourceEventId===41).start<60);
const parts={pre:M.PRE_PARTS.length,bridge:M.BRIDGE.events.length,post:M.POST_PARTS.length};
let orders=[];
for(let s of [1,2,3,4,7,11,12,2026,2027,81201]){
 const d=M.create(null,s,115);
 assert.equal(d.waves.filter(w=>!w.repeatedAfterReference).length,76,
  '63 original crossings plus 13 frame-confirmed gap-band estimates');
 assert.equal(d.partOrder.filter(p=>p.anchored).length,1);
 assert.equal(d.partOrder[M.PRE_PARTS.length].id,M.BRIDGE.id);
 const firstCycle=d.partOrder.filter(p=>!p.repeatedAfterReference);
 assert.equal(firstCycle.length,36);
 for(let i=0;i<firstCycle.length-1;i++){
  const current=firstCycle[i],next=firstCycle[i+1];
  assert(current.at+current.sourceEnd-current.sourceStart<=next.at-.26,'no cross-part overlap');
 }
 assert.equal(new Set(firstCycle.slice(0,26).map(p=>p.id)).size,26);
 assert.equal(new Set(firstCycle.slice(27).map(p=>p.id)).size,9);
 assert(d.waves.every(w=>w.partRotation===0&&!w.mirrored&&w.special===null));
 orders.push(d.partOrder.slice(0,parts.pre).map(p=>p.id).join('-'));
 const g=new M.HyperHexagonerGame(d);
 for(let t=0;t<=87;t+=.2){g.time=t;g.sampleWalls();assert(g.walls.every(w=>w.points.every(p=>p.every(Number.isFinite))));}
}
assert(new Set(orders).size>=8,'whole phrase orders vary widely');
assert.equal(M.PLAYER_SPEED,540*Math.PI/180);
assert.equal(M.PLAYER_DEGREES_PER_TICK,9);
assert.equal(M.DEATH_TIMING.resultStart,.267);
assert.equal(M.DEATH_TIMING.zoomStart,.018);
assert.equal(M.deathScale(0),1);
assert(M.deathScale(.20)>4);
for(let t=0;t<88;t+=.033){const c=M.cameraAt(t);assert(c.length===6&&c.every(Number.isFinite));}
{
 const g=new M.HyperHexagonerGame(M.create(null,17,110,{order:'video'}));
 g.time=8;g.sampleWalls();const source=g.recordedCamera.slice();
 g.freezeDeath();
 assert(g.death&&g.death.sides===6&&g.death.contact.length===2);
 assert.deepEqual(g.deathCamera.affine,source);
 g.time=8.5;g.sampleWalls();assert.deepEqual(g.deathCamera.affine,source);
}
// Regression: once sparse walls were white on a dark backdrop, and
// video mode had >2s entirely empty intervals around HUD 4/12/23/28s.
assert.deepEqual(M.palette(4.1)[2],[98,91,50],'white/pastel field and colorful walls');
const originalRun=M.create(null,3,90,{order:'video'});
let empty=0,total=0,run=0,maxBlank=0;
for(let t=4;t<86.5;t+=.05){
 const visible=originalRun.waves.some(w=>{
  const r=w.r-w.speed*(t-w.start);
  return t>=w.start&&t<w.end&&r<=520&&r+w.thickness>=55;
 });
 total++;empty+=!visible;run=visible?0:run+.05;maxBlank=Math.max(maxBlank,run);
}
assert(empty/total<.16,'video source must not drop most of its on-screen walls');
assert(maxBlank<1,'the formerly 2-second video gap must be filled');
// The one-use shuffle used to place a 0-second singleton into a 3s
// source slot. Test the actual radial envelope; a merely reachable route
// can still look like a completely empty screen.
for(let seed of [1,2,3,5,17,42,101,2026,86753,91337]){
 const d=M.create(null,seed,100,{order:'random'});
 let maxBlank=0,empty=0;
 for(let t=4;t<90;t+=.1){
  const shown=d.waves.some(w=>{
   const r=w.r-w.speed*(t-w.start);
   return t>=w.start&&t<w.end&&r<=520&&r+w.thickness>=55;
  });
  empty=shown?0:empty+.1;maxBlank=Math.max(maxBlank,empty);
 }
 assert(maxBlank<=1.01,'random source parts must not leave >1s empty field');
}
console.log('PASS tasks 9/10',JSON.stringify(parts),
 '76 source-informed cues, 36 phrases, colorful walls, visible video coverage',
 (100*(1-empty/total)).toFixed(1)+'%', '10 safe seeded shuffles');
console.log('route source',M.hasCoarseRoute(video.waves),'fallbacks',Array.from({length:8},(_,i)=>M.create(null,i+1,115).routeFallback||'none'));