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

const ringIds=[144,145,146,147],expectedSectors=[0,3,4,5];
for(const t of [19.9,20,20.1,20.28,20.45]){
 game.time=t;game.sampleWalls();
 const ring=game.walls.filter(w=>w.waveId>=144&&w.waveId<=149)
  .sort((a,b)=>a.waveId-b.waveId);
 assert.deepEqual(ring.map(w=>w.waveId),ringIds,
  'the transition ring has missing or duplicate wall actors at '+t);
 assert.deepEqual(ring.map(w=>w.sector),expectedSectors,
  'the transition ring switched opening positions at '+t);
 assert(ring.every(w=>w.sides===6),'each side must morph from a hexagon');
 assert.equal(new Set(ring.map(w=>w.sector)).size,4,'one actor per blocked direction');
 if(t===20)assert.equal(game.morph,0);
 if(t===20.1)assert(game.morph>0&&game.morph<1);
}
assert.deepEqual(expectedSectors.map(x=>Math.floor((x+.5)*5/6)),[0,2,3,4],
 'two adjacent six-sided holes must merge into one pentagon opening');
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
console.log('PASS first 6->5 shape change: 4 fixed walls, two gaps become one, no sealed frames');
console.log('PASS '+tested+' near-player frames, minimum '+minFree+'/144 free angles');
