'use strict';
const assert=require('node:assert/strict');
const {Game,playerPoly,intersect,wallVisualPoly}=require('./engine');
const source=require('./assets/timelines/waves-stage-0.json');
const game=new Game(0,source);
for(const t of [24.1,24.2,24.3,24.4]){
 game.time=t;game.sampleWalls();
 assert.equal(game.sides,5,'24s segment should be a pentagon');
 assert(!game.walls.some(w=>w.waveId===173||w.waveId===178),
  'duplicate side-2 blocker returned at '+t);
 const near=game.walls.filter(w=>w.r<140&&w.r+w.thickness>45);
 const polys=near.map(w=>wallVisualPoly(w,game.fromSides,game.sides,game.morph));
 const lane=[115,125,135,145,155,165].map(degrees=>{
  const p=playerPoly(degrees*Math.PI/180);
  return polys.every(poly=>!intersect(p,poly));
 });
 assert(lane.filter(Boolean).length>=3,
  '24s passage too narrow for a player at '+t+': '+lane);
}
console.log('PASS wide first-stage 24s pentagon passage, duplicate wall IDs 173/178 never block the lane');
