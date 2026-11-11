'use strict';
// Task 6 regression: node hexagonest-stage6.test.cjs
const assert=require('node:assert/strict'),fs=require('node:fs');
const BASE=require('./hexagonest-mode');
const POST=require('./hexagonest-post60');
const SOURCE=require('./hexagonest-video');
assert.equal(POST.PARTS.length,5,'5 replayable source-video dodges');
assert.equal(POST.PARTS.reduce((sum,p)=>sum+p.events.length,0),24);
assert.equal(BASE.VIDEO_PART_COUNT,SOURCE.parts.length,'task 5 part count unchanged');
assert(POST.PARTS.every(p=>p.sourceVideoSeconds[0]>285));
assert.equal(POST.SPIN_KEYS[0][0],60);
assert.deepEqual(POST.palette(65),[0,0,[27,48,97]]);
const page=fs.readFileSync('play.js','utf8'),index=fs.readFileSync('index.html','utf8');
assert(page.includes('new HexHexagonestPost60.HexagonestGame'),'task 6 wired for level 2 only');
assert(page.includes('game.controlMode===1?(game.visualTurn||0):game.playerLean'),
 'mode-1 triangle steering remains unchanged');
assert(index.includes('hexagonest-post60.js'),'script import exists');
for(const seed of [1,2,3,5,7,11,2026,12432]){
 const input=BASE.createRandomTimeline(seed,85);
 const existing=new BASE.HexagonestGame(input),g=new POST.HexagonestGame(input);
 for(const t of [0,5,19,33,50,59.98]){
  existing.time=g.time=t;existing.sampleWalls();g.sampleWalls();
  assert.deepEqual(g.walls,existing.walls,'0..60 geometry unchanged');
 }
 g.hit=()=>null;
 g.time=59.97;g.update(.09,0);
 assert(g._post60Active&&g.time>=60&&g.time<60.1,'crossing at 60');
 assert.equal(g.timeline.post60PartCount,5);
 const newWaves=g.timeline.waves.filter(w=>w.id>=1000000);
 assert(newWaves.length>20);
 assert(newWaves.every(w=>w.start>=60&&!w.sectors.includes(w.safeSector)));
 let reachable=new Array(144).fill(true),next=new Array(144).fill(false);
 const dt=.04,step=Math.ceil(g.playerSpeed*dt/(2*Math.PI/144));
 for(let t=60;t<=75;t+=dt){
  g.time=t;g.sampleWalls();
  assert(g.walls.every(w=>w.actors.every(a=>
   a.renderPoly.every(p=>p.every(Number.isFinite)))));
  const hit=new Set(g.walls.filter(w=>w.r<=66&&w.r+w.thickness>=66).map(w=>w.sector));
  assert(hit.size<6,'no completely sealed orbit');
  for(let lane=0;lane<144;lane++){
   if(hit.has(Math.floor(lane/24))){next[lane]=false;continue}
   let ok=false;for(let dx=-step;dx<=step;dx++)
    if(reachable[(lane+dx+144)%144]){ok=true;break}
   next[lane]=ok;
  }
  assert(next.some(Boolean),'at least one legal route exists over sampled orbit');
  [reachable,next]=[next,reachable];
 }
}
// Death camera: source-aligned inherited camera must not override the new
// clip's affine snapshot or continue rotation after collision.
const g=new POST.HexagonestGame(BASE.createRandomTimeline(99,90));
g.hit=()=>null;g.time=60;POST.createContinuation(g);g.time=69;
g.hit=()=>({id:'forced',renderPoly:[[0,0],[1,0],[1,1],[0,1]]});
g.update(1/60,0);
assert(g.dead&&g.deathCamera?.affine?.length===6);
assert.deepEqual(POST.cameraAt(g),g.deathCamera.affine);
assert.equal(g.rotationSpeed,0);
console.log('PASS HEXAGONEST task 6: 5 source parts/24 events, 8 seeded reachable continuations, 60s crossover, task5 geometry untouched, death freeze and 1-mode lean preserved');
