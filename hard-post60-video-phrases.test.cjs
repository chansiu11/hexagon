'use strict';
/* Task 2 – video-derived source phrase regression.
 * node hard-post60-video-phrases.test.cjs
 *
 * This is a source-approximation from user video 1557(7).mp4.
 * The clip bank preserves 58 detected crossings, 10 continuous phrases,
 * relative timing, width and shape, with three documented lane aliases.
 */
const assert=require('node:assert/strict');
const H=require('./hard-mode');
const P=require('./hard-post60');
const Run=require('./hard-post60-video-run');
const Bank=require('./hard-post60-video-parts');
const E=require('./engine');
const fs=require('node:fs');
assert.equal(Bank.ORIGINAL_SEQUENCE.length,58);
assert.equal(Bank.PARTS.length,19);
assert.equal(Bank.COMPLETE_PARTS.length,10);
assert.equal(Bank.SOURCE_LANE_CORRECTIONS,3);
assert.equal(P.PARTS,Bank.COMPLETE_PARTS);
assert.deepEqual(Bank.COMPLETE_PARTS.map(p=>p.sides),
 [6,5,4,5,4,5,6,5,4,5]);
assert(Bank.COMPLETE_PARTS.flatMap(p=>p.events).every(e=>
 Number.isFinite(e.offset)&&e.offset>=0&&
 e.blocked.length>0&&e.blocked.length<e.sides&&
 Number.isFinite(e.width)&&e.width>0));
const index=fs.readFileSync('index.html','utf8');
assert(index.indexOf('hard-post60-video-parts.js')<index.indexOf('hard-post60-video-run.js'));
assert(index.indexOf('hard-post60-video-run.js')<index.indexOf('hard-post60.js?'));
assert(index.includes('hexagoner-video8.js?v=20261111-speed480-v5'));
const seeds=[1,2,3,4,5,7,11,23,2026,81201,42042,123456];
let sampled=0;
for(const seed of seeds){
 const original=H.create(seed,220),game=new P.HardGame(original);
 const startClock=H.wallClock(60,original.shapeSchedule);
 const inherited=game._actors.filter(w=>w.start<=startClock+1e-9);
 game.hit=()=>null;game.time=59.98;game.sampleWalls();game.update(.05,0);
 assert(game._post60Active,'60-second transition');
 const data=game.timeline,generated=data.waves.filter(w=>Number(w.id)>=1000000);
 assert.equal(data.mode,'hard-post60-video-phrases');
 assert.equal(data.post60SourceEventCount,58);
 assert.equal(data.post60PhraseCount,10);
 assert.equal(game._actors.filter(w=>Number(w.id)<1000000).length,
 inherited.length,'already spawned walls are preserved at boundary');
 assert(generated.length>70);
 assert(generated.every(w=>w.start>startClock+.01&&
  w.sides===H.shapeAt(w.impact,data.shapeSchedule).to&&
  w.sectors.length>0&&w.sectors.length<w.sides));
 const first=data.post60Parts.filter(p=>p.cycle===0);
 assert.equal(first.length,10);
 assert.deepEqual(first.map(p=>p.id),Bank.COMPLETE_PARTS.map(p=>p.id),
  'first source replay preserves the original video phrase order');
 const cycle2=data.post60Parts.filter(p=>p.cycle===1);
 assert(cycle2.length>0);
 assert(cycle2.every(p=>
  Bank.COMPLETE_PARTS.find(s=>s.id===p.id)?.sides===p.nativeSides));
 const schedule=data.shapeSchedule;
 for(let i=1;i<schedule.length;i++){
  if(schedule[i][0]>170)break;
  assert(schedule[i][0]>schedule[i-1][0],'shape timeline is ordered');
  if(schedule[i][0]<60||schedule[i][1]===schedule[i-1][1])continue;
  assert(!Run.dangerAt(game._actors,schedule[i][0],schedule),
   'no ring passes through the triangle orbit during a morph');
 }
 const N=72,dt=.08,step=Math.floor(E.PLAYER_SPEED*dt/(2*Math.PI/N));
 let reachable=Array(N).fill(true),next=Array(N).fill(false);
 for(let frame=0;frame<=Math.ceil((170-60)/dt);frame++){
  const t=60+frame*dt;
  game.time=t;game.sampleWalls();
  for(let i=0;i<N;i++){
   if(game.hit((i+.5)*2*Math.PI/N)){next[i]=false;continue}
   let possible=false;
   for(let d=-step;d<=step;d++)if(reachable[(i+d+N)%N]){
    possible=true;break;
   }
   next[i]=possible;
  }
  assert(next.some(Boolean),
   'task-2 replay is mathematically traversable at time '+t+', seed '+seed);
  [reachable,next]=[next,reachable];sampled++;
 }
}
console.log('PASS: task-2 58 events in 10 source phrases, 3 calibrated source aliases, original first pass, shape-safe repeats, '+seeds.length+' seeded 60–170s paths, 480deg/s cache active');
