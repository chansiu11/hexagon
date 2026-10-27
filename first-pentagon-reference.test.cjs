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
const ringIds=[144,145,146,147],measured=[0,2,4,3],before18=[0,3,4,5];
for(const time of [17.99,18,18.01,19.9,20,20.1,20.28,20.45]){
 game.time=time;game.sampleWalls();
 const ring=game.walls.filter(w=>w.waveId>=144&&w.waveId<=149)
  .sort((a,b)=>a.waveId-b.waveId);
 assert.deepEqual(ring.map(w=>w.waveId),ringIds,
  'reference-video ring lost or duplicated wall actors at '+time);
 assert.deepEqual(ring.map(w=>w.sector),time<18?before18:measured,
  'wrong observed sectors at '+time);
 assert.deepEqual(ring.map(w=>w.id),['144:0','145:3','146:4','147:5'],
  'IDs must stay unchanged during the offscreen handoff');
 assert(ring.every(w=>w.sides===(time<18?6:5)),
  'wall sectors must use their source video side count after 18s');
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
assert.deepEqual(measured.map(x=>Math.floor((x+.5)*6/5)),[0,3,5,4],
 'measured wave sectors must leave two connected openings in the hexagon');
assert.deepEqual([...measured].sort(),[0,2,3,4],
 'video-tracked first pentagon ring must leave one open direction');
assert.equal(wallTimelineTime(20.1,recorded.shapeSchedule),20,
 'moving walls must hold their distance during first shape change');

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
console.log('PASS first 6->5 shape change: 4 video-measured sectors, offscreen 18s handoff, no sealed frames');
console.log('PASS '+tested+' near-player frames, minimum '+minFree+'/144 free angles');
