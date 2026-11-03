'use strict';
// The pair the player sees slightly offset at ~30.5s on stage 5:
// actor 304 (sector 0) and actor 307 (sector 4). Delete only those two
// visuals AND their collisions; preserve neighboring wall 309 (sector 5).
const assert=require('node:assert/strict');
const {Game,playerPoly,wallVisualPoly,intersect}=require('./engine');
const source=require('./assets/timelines/waves-stage-4.json');
const game=new Game(4,source);
const ids=[304,307];
for(const id of ids){
 const original=game.timeline.waves.find(w=>w.id===id);
 assert(original,'the intended source wall must exist');
}
for(let f=0;f<=60*60;f++){
 const t=f/60;
 game.time=t;game.sampleWalls();
 for(const id of ids)
  assert(!game.walls.some(w=>w.waveId===id),
   'removed 30s side-wall actor visible or collidable at '+t.toFixed(3));
}
for(const t of [30.2,30.35,30.45,30.5]){
 game.time=t;game.sampleWalls();
 const neighbor=game.walls.find(w=>w.waveId===309);
 assert(neighbor,'unrelated neighbor wall 309 must remain at '+t);
 assert.equal(neighbor.sector,5);
}
for(let f=30*60;f<=Math.round(30.75*60);f++){
 const t=f/60;game.time=t;game.sampleWalls();
 const polys=game.walls.filter(w=>w.r<110&&w.r+w.thickness>48)
  .map(w=>wallVisualPoly(w,game.fromSides,game.sides,game.morph));
 let open=0;
 for(let a=0;a<180;a++){
  const p=playerPoly(a*Math.PI/90);
  if(polys.every(poly=>!intersect(p,poly)))open++;
 }
 assert(open>0,'30s group sealed every escape at '+t.toFixed(3));
}
console.log('PASS only the two staggered stage-five walls 304 and 307 are removed, neighbor 309 retained, 30s gap open');
