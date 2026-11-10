'use strict';
// Reproducible regression checks for task 3 only (HEXAGONER game seconds 0..60).
// Run: node hexagoner-stage3.test.cjs
const assert=require('node:assert/strict');
const R=require('./hexagoner-reference-60');
const X=require('./hexagoner-parts');
const source=require('./assets/timelines/waves-stage-1.json');
const parts=X.deriveParts(source);
assert.equal(parts.length,21,'existing 21 dodge parts must remain intact');
assert.equal(parts.reduce((n,p)=>n+p.waves.length,0),source.waves.length);
assert.equal(R.KEY_CENTIRAD.length,121,'0.5-second source camera keyframes 0..60');
assert.deepEqual(R.cameraAt(10),R.cameraAt(10),'camera deterministic');
const sourceById=new Map(source.waves.map(w=>[w.id,w]));
const orders=[];
for(const seed of [1,2,7,101,2026,76543,999999]){
 const data=X.create(source,seed,120);
 const game=new X.HexagonerGame(data);
 assert.equal(data.sourcePartCount,21);
 orders.push(data.partOrder.map(x=>x.partId).join(','));
 for(const w of data.waves){
  const original=sourceById.get(w.sourceWaveId);
  assert(original,'all replay walls came from original source');
  assert.equal(w.thickness,original.thickness);
  assert.equal(w.r,original.r);
  assert.equal(w.speed,original.speed);
  assert(Math.abs((w.end-w.start)-(original.end-original.start))<1e-8);
  assert.deepEqual(w.sectors,original.sectors.map(k=>(k+w.partRotation)%6));
 }
 for(const t of [0,1.5,5,10,23,28,40,59.983,60,75]){
  game.time=t;game.sampleWalls();
  assert.equal(game.sides,6,'no unintended shape morph');
  if(t<60)assert.deepEqual(game.recordedCamera,R.cameraAt(t),
   'new video camera applies only during task 3');
  else assert.equal(game.recordedCamera,null,
   'task 4 post-60 camera has not been replaced');
  assert(game.walls.every(w=>Number.isFinite(w.r)));
 }
}
assert.notEqual(orders[0],orders[1],'parts alone shuffle across seeds');
assert.notEqual(R.angleAt(10),R.angleAt(23),'source camera has direction changes');
for(const t of [0,10,20,30,40,59])assert.deepEqual(R.palette(t),R.palette(t),
 'video color does not use randomness');
console.log('PASS HEXAGONER task 3: 7 seeds, 21 parts, source walls preserved; deterministic 0..60 camera, correct 60+ isolation');
