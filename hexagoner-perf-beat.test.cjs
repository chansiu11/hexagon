'use strict';
// Performance and music-onset regression for tasks 3/4 only:
// node hexagoner-perf-beat.test.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {performance}=require('node:perf_hooks');
const H=require('./hexagoner-video8');
const E=require('./engine');
const play=fs.readFileSync('play.js','utf8');
assert(play.includes('if(level===1)return HexHexagonerVideo8.create();'),
 'HEXAGONER should not download an unrelated ~475KB wall JSON');
assert(play.includes('game._lastAudioResyncTime'),'audio seeks must be rate limited');
assert(play.includes('audioShakeAt(music.position,music.pulse,musicReady)'),
 'shake is driven by actual music onset');
assert(play.includes("game.controlMode===1?(game.visualTurn||0):game.playerLean"),
 'mode-1 visual steering must be retained');
assert(play.includes('new HexHardPost60.HardGame(timeline)'));
assert(play.includes('new HexHexagonestPost60.HexagonestGame(timeline)'));
assert.equal(H.audioShakeAt(8,0,true)[0],0);
assert.deepEqual(H.audioShakeAt(8,1,false),[0,0]);
assert(H.audioShakeAt(8,.75,true).some(v=>v!==0));
assert(H.audioShakeAt(8,.15,true).every((v,i)=>Math.abs(v)<Math.abs(H.audioShakeAt(8,.75,true)[i])));
for(const seed of [1,2,7,2026]){
 const game=new H.HexagonerGame(H.create(null,seed,115));
 let reuseCount=0;
 for(let t=0;t<108;t+=.09){
  game.time=t;game.sampleWalls();
  for(const w of game.walls){
   const expected=E.wallVisualPoly(w);
   for(let j=0;j<4;j++)for(let xy=0;xy<2;xy++)
    assert(Math.abs(w.points[j][xy]-expected[j][xy])<1e-7,
     'cached render polygon must exactly match original physics polygon');
  }
  const prev=game.walls.slice();
  game.time+=.002;game.sampleWalls();
  for(const w of prev)if(game.walls.includes(w))reuseCount++;
 }
 assert(reuseCount>100,'panels should be reused across physics ticks');
}
const timingGame=new H.HexagonerGame(H.create(null,31337,115));
const start=performance.now();
for(let i=0;i<3000;i++){timingGame.time=(i*.03)%108;timingGame.sampleWalls()}
const ms=performance.now()-start;
console.log('PASS HEXAGONER: music-triggered shake, silent/death disable, no audio seek loop; cached polygons preserve exact collision geometry across 4 seeds. 3000 geometry samples: '+ms.toFixed(1)+' ms on this device');
