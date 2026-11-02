'use strict';
// Verified golden frames preserve stage 1 from 0:00 up to 18.000 seconds,
// exactly as in the previously accepted GitHub build (807e2322).
// This intentionally DOES NOT claim exact fidelity to the commercial game:
// the reference footage is unavailable as a frame-readable source.
const assert=require('node:assert/strict');
const {Game,wallVisualPoly,playerPoly,intersect,wallTimelineTime}=require('./engine');
const recorded=require('./assets/timelines/waves-stage-0.json');
const game=new Game(0,recorded);
let signature=2166136261>>>0;
function add(s){
 for(let i=0;i<s.length;i++)signature=Math.imul(signature^s.charCodeAt(i),16777619)>>>0;
}
let comparedWalls=0;
for(let f=0;f<18*60;f++){
 game.time=f/60;game.sampleWalls();
 add('F'+f+':S'+game.sides+':A'+game.fromSides+':M'+game.morph.toFixed(6)+';');
 for(const w of game.walls){
  add(w.id+':'+w.sector+':'+w.sides+':'+w.r.toFixed(6)+':'+w.thickness.toFixed(6)+';');
  comparedWalls++;
 }
}
assert.equal(signature,2570665931,'0-18s previous wall/shape sequence changed');
assert.equal(comparedWalls,28776,'0-18s wall count changed');
assert.equal(recorded.shapeSchedule[1][0],20,'first five-sided transition must be 20s');

assert.equal(recorded.source,'5mDjFdetU28',
 'first map must use the selected single original-video reference');
const ringIds=[144,145,146,147],passage=[0,1,2,3],before18=[0,3,4,5];
for(const time of [17.99,18,18.01,19.9,20,20.1,20.28,20.45]){
 game.time=time;game.sampleWalls();
 const ring=game.walls.filter(w=>w.waveId>=144&&w.waveId<=149)
  .sort((a,b)=>a.waveId-b.waveId);
 assert.deepEqual(ring.map(w=>w.waveId),ringIds,
  'reference-video ring lost or duplicated wall actors at '+time);
 assert.deepEqual(ring.map(w=>w.sector),time<18?before18:passage,
  'first passage sectors changed at '+time);
 assert.deepEqual(ring.map(w=>w.id),['144:0','145:3','146:4','147:5'],
  'IDs must stay unchanged during the offscreen handoff');
 assert(ring.every(w=>w.sides===(time<18?6:5)),
  'wall sectors must use their source video side count after 18s');
 if(time>=18){
  assert.deepEqual(ring.map(w=>w.fromSector),passage);
  assert.deepEqual(ring.map(w=>w.toSector),passage);
 }
 if(time===18){
  // Switching the layout while the entire ring is still offscreen must
  // never cause a visible pop or replace any of the physical actors.
  const m=game.recordedCamera,zoom=Math.sqrt(m[0]*m[3]-m[1]*m[2]);
  const halfDiagonal=Math.hypot(480,300);
  for(const w of ring){
   const polygon=wallVisualPoly(w,game.fromSides,game.sides,game.morph);
   const nearest=Math.min(...polygon.map(p=>Math.hypot(p[0],p[1])));
   assert(nearest*zoom>halfDiagonal,
    'cannot hand off to observed sectors while a wall is visible');
  }
 }
 if(time===20)assert.equal(game.morph,0);
 if(time===20.1)assert(game.morph>0&&game.morph<1);
}
assert.deepEqual(passage,[0,1,2,3],
 'four walls leave adjacent hex sides 4+5 free before the morph');
assert.deepEqual([...passage].sort(),[0,1,2,3],
 'four pentagon sides must leave exactly side 4 free');
assert(Math.abs(wallTimelineTime(20.1,recorded.shapeSchedule)-20.1)<1e-9,
 'first morph must be moving until the pentagon is complete');
for(const t of [20.45,20.5,20.6,20.65])
 assert(Math.abs(wallTimelineTime(t,recorded.shapeSchedule)-20.45)<1e-9,
  'first pentagon must remain stationary for 0.2s after morph at '+t);
assert(wallTimelineTime(20.7,recorded.shapeSchedule)>20.45,
 'pentagon must descend again after the post-morph pause');
assert(Math.abs(wallTimelineTime(21,recorded.shapeSchedule)-20.8)<1e-9,
 'the first pentagon must descend at the ORIGINAL speed after unfreezing');
assert(Math.abs(wallTimelineTime(21.5,recorded.shapeSchedule)-21.3)<1e-9,
 'the first pentagon must keep ordinary wall speed through 21.50s');
assert(Math.abs(wallTimelineTime(22.5,recorded.shapeSchedule)-22.5)<1e-9,
 'delayed recovery must restore source-video time before the next wave');
for(let frame=0;frame<200;frame++){
 const t=20.65+frame/240;
 if(t+1/240>21.5)break;
 const traveled=wallTimelineTime(t+1/240,recorded.shapeSchedule)-
  wallTimelineTime(t,recorded.shapeSchedule);
 assert(Math.abs(traveled-1/240)<1e-8,
  'walls must not accelerate above ordinary speed near the pentagon at '+t);
}

// The actual rendered wall objects (not just the abstract clock) must remain
// in exactly the same place throughout the requested completed-pentagon stop.
const frozen=new Map();
for(const time of [20.45,20.50,20.55,20.60,20.65]){
 game.time=time;game.sampleWalls();
 assert.equal(game.sides,5);
 assert(Math.abs(game.morph-1)<1e-12,'pentagon must be fully formed before pausing');
 const ring=game.walls.filter(w=>w.waveId>=144&&w.waveId<=147);
 assert.equal(ring.length,4,'ring must remain intact throughout the pause');
 for(const w of ring){
  if(!frozen.has(w.id))frozen.set(w.id,w.r);
  assert(Math.abs(w.r-frozen.get(w.id))<1e-7,'wall moved during 0.2s pause at '+time);
 }
}
game.time=20.70;game.sampleWalls();
for(const w of game.walls.filter(w=>frozen.has(w.id)))
 assert(w.r<frozen.get(w.id)-1,'pentagon walls must descend after the pause');

let tested=0,minFree=144;
for(let frame=18*60;frame<=Math.floor(26.6*60);frame++){
 const time=frame/60;game.time=time;game.sampleWalls();
 const nearby=game.walls.filter(w=>w.r<108&&w.r+w.thickness>44);
 if(nearby.length<4)continue;
 const polygons=nearby.map(w=>wallVisualPoly(w,game.fromSides,game.sides,game.morph));
 let free=0;
 for(let j=0;j<144;j++){
  const player=playerPoly(j*2*Math.PI/144);
  if(polygons.every(poly=>!intersect(player,poly)))free++;
 }
 tested++;
 assert(free>0,'fully sealed route at '+time.toFixed(3)+'s');
 minFree=Math.min(minFree,free);
}
assert(tested>100,'insufficient checked frames across the first shape change');
console.log('PASS stage 1 0-18s preserved: '+comparedWalls+' walls, golden '+signature);
console.log('PASS first 6->5 shape change: 4 reachable aligned sectors, offscreen 18s handoff, no sealed frames');
console.log('PASS '+tested+' near-player frames, minimum '+minFree+'/144 free angles');
