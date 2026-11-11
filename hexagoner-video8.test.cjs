'use strict';
/* Node regression for HEXAGONER tasks 3,4 only.
 * Run: node hexagoner-video8.test.cjs
 * 1557(8).mp4 sampled at 480x300, 10fps. Values approximate.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const H=require('./hexagoner-video8');
const D=require('./hexagoner-video8-data');
const E=require('./engine');
assert.equal(D.EVENTS.length,134);
assert.equal(D.EVENTS.filter(e=>e.time<60).length,70);
assert.equal(D.EVENTS.filter(e=>e.time>=60).length,64);
assert.equal(H.PARTS_PRE.length,14);
assert.equal(H.PARTS_POST.length,9);
assert.equal(H.PARTS_PRE.flatMap(p=>p.events).length,67);
assert.equal(H.PARTS_POST.flatMap(p=>p.events).length,56);
assert.equal(H.PARTS_POST.flatMap(p=>p.events).filter(e=>e.sourceLaneCorrection).length+
 H.BOUNDARY_PART.events.filter(e=>e.sourceLaneCorrection).length,4);
assert.equal(H.BOUNDARY_PART.events.length,11);
assert.equal(H.BOUNDARY_PART.sourceStart,58.3);
assert.equal(H.BOUNDARY_PART.sourceEnd,65.6);
assert.equal(H.ANGULAR_SPEED,8*Math.PI/180*60);
const video=H.create(null,111,115,{order:'video'});
assert.equal(video.waves.length,134,'all reference crossing events survive in video mode');
assert.equal(video.orderMode,'video');
assert.deepEqual(video.waves.map(w=>w.sourceGameSecond),H.SOURCE_EVENTS.map(e=>e.time));
assert(video.partOrder.every(p=>p.rotation===0));
assert.equal(video.partOrder.filter(p=>p.anchored).length,1);
assert(video.waves.find(w=>w.sourceGameSecond===60.7).start<60);
const left=H.cameraAt(59.93),right=H.cameraAt(60);
const mag=a=>Math.hypot(a[0],a[1]);
assert(Math.abs(mag(right)/mag(left)-1)<.10,'world zoom does not jump at 60');
for(const t of [0,5,25,38,57,60,64,72,85,100,109]){
 assert(H.cameraAt(t).length===6&&H.cameraAt(t).every(Number.isFinite));
 assert(H.palette(t).every((v,i)=>i===2?v.every(Number.isFinite):Number.isFinite(v)));
}
const script=fs.readFileSync('play.js','utf8');
const index=fs.readFileSync('index.html','utf8');
assert(script.includes('new HexHexagonerVideo8.HexagonerGame(timeline)'));
assert(script.includes('return level===1?HexHexagonerVideo8.create(video):video'));
assert(script.includes('game.controlMode===1?(game.visualTurn||0):game.playerLean'));
assert(index.indexOf('hexagoner-video8-data.js')<index.indexOf('hexagoner-video8.js'));
const n=144,dt=.05,step=Math.floor(H.ANGULAR_SPEED*dt/(2*Math.PI/n));
const orders=[];
for(const seed of [1,2,3,4,5,7,11,2026,12345,81201]){
 const d=H.create(null,seed,115),g=new H.HexagonerGame(d);
 assert(d.waves.length>120);
 assert(d.waves.every(w=>w.sectors.length&&w.sectors.length<6&&
  !w.sectors.includes(w.safeSector)&&Number.isFinite(w.start)&&w.start>=0));
 assert(d.waves.filter(w=>d.partOrder[w.group].era===0).every(w=>w.impact<60));
 assert(d.waves.filter(w=>d.partOrder[w.group].era===1).every(w=>w.impact>=60&&w.start>=60));
 const wavePart=new Map();
 for(const w of d.waves){
  const part=w.partId===H.BOUNDARY_PART.id?H.BOUNDARY_PART:
   (d.partOrder[w.group].era?H.PARTS_POST:H.PARTS_PRE)
    .find(x=>x.id===w.partId);
  assert(part);
  assert.equal(w.thickness,part.events[w.partEvent].width);
  if(!wavePart.has(w.partId+':'+w.group))wavePart.set(w.partId+':'+w.group,w.partRotation);
  assert.equal(w.partRotation,wavePart.get(w.partId+':'+w.group));
  assert.equal(w.partRotation,0,'source sectors cannot be rotated');
  assert.deepEqual(w.sectors,w.sourceSectors,'no mirror or per-wall lane shift');
 }
 orders.push(d.partOrder.map(p=>p.id).join(','));
 let reachable=new Array(n).fill(false),next=new Array(n).fill(false);
 reachable[108]=true; // default starting triangle angle = 270°
 for(let time=0;time<=108;time+=dt){
  g.time=time;g.sampleWalls();
  assert(g.walls.every(w=>Number.isFinite(w.r)&&w.points.every(p=>p.every(Number.isFinite))));
  const blocked=new Set(g.walls.filter(w=>w.r<=66&&w.r+w.thickness>=66).map(w=>w.sector));
  assert(blocked.size<6,'a complete blocked orbit is impossible');
  for(let k=0;k<n;k++){
   if(blocked.has(Math.floor(k/24))){next[k]=false;continue}
   let ok=false;
   for(let dx=-step;dx<=step;dx++)if(reachable[(k+dx+n)%n]){ok=true;break}
   next[k]=ok;
  }
  assert(next.some(Boolean),'source parts retain a reachable 1-mode route');
  [reachable,next]=[next,reachable];
 }
}
assert.notEqual(orders[0],orders[1],'whole dodge parts, not camera, shuffle');
assert.deepEqual(H.cameraAt(23),H.cameraAt(23),'camera deterministic');
console.log('PASS: 134 video events, 14+bridge+9 full source phrases, fixed 58.3–65.6 crossing, unrotated shuffles, 10 seeded 0–108s paths');
