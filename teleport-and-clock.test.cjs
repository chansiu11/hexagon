'use strict';
const assert=require('node:assert/strict');
const {Game,PLAYER_SPEED}=require('./engine');
const {HardGame,create:createHard}=require('./hard-mode');
const {HexagonestGame,create:createHexagonest}=require('./hexagonest-mode');
const {Game:NormalGame}=require('./engine');
for(let level=0;level<6;level++){
 const g=new Game(level),original=g.angle;
 assert.equal(g.teleportHalfTurn(),false,'mode 1 has no half-turn on map '+level);
 assert.equal(g.angle,original,'disallowed warp cannot move player');
 assert.equal(g.teleport,null,'no warp afterimage');
 g.update(.10,0);
 assert.equal(g.teleport,null,'no delayed warp');
 assert.equal(g.playerSpeed,PLAYER_SPEED,'original continuous turn rate retained');
 g.dead=true;assert.equal(g.teleportHalfTurn(),false,'warp remains disabled after death');
}
for(const g of [new HardGame(createHard(4,60)),
 new HexagonestGame(createHexagonest(4,60))]){
 const initial=g.angle;
 assert.equal(g.teleportHalfTurn(),false,'no half-turn in HARD/Hexagonest');
 assert.equal(g.angle,initial);
 assert.equal(g.teleport,null);
}
const one=require('./assets/timelines/waves-stage-0.json');
const g=new NormalGame(0,one);
g.time=5;g.sampleWalls();
const originalWalls=g.walls.map(w=>[w.id,w.r]);
assert.equal(g.teleportHalfTurn(),false);
assert.deepEqual(g.walls.map(w=>[w.id,w.r]),originalWalls,'removed flip cannot reset or flash obstacles');
assert.equal(g.time,5,'removed flip cannot skip time');
console.log('PASS mode 1 180-degree teleport disabled with unchanged movement, physics and walls on all stages');
