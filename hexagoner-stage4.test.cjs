'use strict';
// Task 4: HEXAGONER game 60+ only; independent from tasks 1,3 and 5.
// node hexagoner-stage4.test.cjs
const assert=require('node:assert/strict'),fs=require('node:fs');
const X=require('./hexagoner-parts');
const Y=require('./hexagoner-post60');
const reference=require('./hexagoner-reference-60');
const source=require('./assets/timelines/waves-stage-1.json');
assert.equal(X.deriveParts(source).length,21,'task 3 clips unchanged');
assert.equal(Y.PARTS.length,15,'source 60+ reference clips');
assert.equal(Y.PARTS.reduce((n,p)=>n+p.events.length,0),60);
assert(Y.PARTS.every(p=>p.events.length&&p.sourceVideoSeconds[0]>=176.8));
assert.deepEqual(Y.cameraAt(70),Y.cameraAt(70),'camera deterministic, independent of part RNG');
assert.deepEqual(Y.palette(81),Y.palette(81),'color deterministic, independent of part RNG');
const play=fs.readFileSync('play.js','utf8');
assert(play.includes('updateVisualTurn(game,elapsed'),'mode-1 steering motion callback');
assert(play.includes('game.visualTurn||0'),'visual-only triangle steering is used by renderer');
assert(play.includes('new HexHexagonerPost60.HexagonerGame'),'post-60 stage wired');
const orders=[];
for(const seed of [1,2,7,101,2026,12345]){
 const timeline=X.create(source,seed,120);
 const before=new X.HexagonerGame(timeline),after=new Y.HexagonerGame(timeline);
 for(const time of [0,1,10,23,42,59.9]){
  before.time=after.time=time;before.sampleWalls();after.sampleWalls();
  assert.deepEqual(after.walls,before.walls,'0-60 source walls unchanged');
  assert.deepEqual(after.recordedCamera,before.recordedCamera,'0-60 source camera unchanged');
 }
 const original=after._spawns.filter(w=>w.start<=60+1e-8)
   .map(w=>[w.id,w.start,w.end,w.sectors.join(',')]).sort((a,b)=>a[0]-b[0]);
 after.time=60;
 const r=Y.build(after);
 assert(r.newWaves>60&&r.parts>15,'new source parts created after boundary');
 assert.equal(after.timeline.post60PartCount,15);
 assert.equal(after.timeline.mode,'hexagoner-video-parts-post60');
 const retained=after._spawns.filter(w=>w.id<1000000)
   .map(w=>[w.id,w.start,w.end,w.sectors.join(',')]).sort((a,b)=>a[0]-b[0]);
 assert.deepEqual(retained,original,'all and only already spawned source waves retained');
 const newWaves=after.timeline.waves.filter(w=>w.id>=1000000);
 assert(newWaves.every(w=>w.start>=60-1e-8),
  'post60 walls spawn at or after boundary, never appear suddenly onscreen');
 assert(newWaves.every(w=>w.sectors.length&&w.sectors.length<6&&!w.sectors.includes(w.safeSector)));
 assert(newWaves.every(w=>w.sourceVideo==='1557(7).mp4'));
 orders.push(after.timeline.post60PartOrder.map(p=>p.partId).join(','));
 for(let t=60;t<=112;t+=.06){
  after.time=t;after.sampleWalls();
  assert(after.recordedCamera.every(Number.isFinite));
  assert(after.walls.every(w=>Number.isFinite(w.r)&&Number.isFinite(w.thickness)));
  const blocked=new Set(after.walls
   .filter(w=>w.r<=66&&w.r+w.thickness>=66)
   .map(w=>w.sector));
  assert(blocked.size<6,'no completely sealed circle at player orbit');
 }
}
assert.notEqual(orders[0],orders[1],'whole parts are randomly ordered across runs');
console.log('PASS task4: 15 source clips / 60 crossing events; 6 seeds; 60s boundary, source-preserving walls, no fully sealed orbit, deterministic camera/palette, mode-1 visual lean');
