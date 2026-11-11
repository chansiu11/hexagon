'use strict';
// HEXAGON task 1/2 shape-change safety.
// Run: node hard-shape-safe.test.cjs
const assert=require('node:assert/strict');
const H=require('./hard-mode'),P=require('./hard-post60');
const E=require('./engine'),Motion=require('./hard-motion');
const SEEDS=[1,2,3,4,5,7,11,23,2026,81201,42042,123456];
let pre=0,post=0;
for(const seed of SEEDS){
 const data=H.create(seed,143),snapshot=data.shapeSchedule.map(e=>e.slice());
 assert(data.waves.length>80&&data.shapeSchedule.length>10);
 for(let i=1;i<snapshot.length;i++){
  const at=snapshot[i][0];if(at>120)break;
  for(const w of data.waves){
   const low=at-(w.thickness+(w.outerExtra||0))/w.speed-.35;
   const high=at+H.MORPH_SECONDS+.18+.60;
   assert(w.impact<low-1e-7||w.impact>=high-1e-7,
    'Unsafe task-1 ring before shape change at '+at+', seed '+seed);
  }pre++;
 }
 const g=new P.HardGame(data);g.hit=()=>null;
 const initialClock=H.wallClock(60,snapshot);
 const originalBorn=data.waves.filter(w=>w.start<=initialClock+1e-9);
 g.time=59.98;g.sampleWalls();g.update(.045,0);
 assert(g._post60Active,'task 2 is active');
 assert.equal(g._actors.filter(w=>Number(w.id)<1000000).length,originalBorn.length,
  'retain existing walls on task 2 entry');
 assert(g.timeline.post60Parts.length>3);
 assert.deepEqual(data.shapeSchedule,snapshot,'source shape schedule is immutable');
 const schedule=g.timeline.shapeSchedule;
 assert(schedule.every((x,i)=>i===0||x[0]>schedule[i-1][0]),
  'task-2 shape events are chronological');
 for(let i=1;i<schedule.length;i++){
  const [at,to]=schedule[i];if(at>120)break;
  if(to===schedule[i-1][1])continue;
  const clock=H.wallClock(at,schedule);
  for(const wave of g._actors){
   if(wave.start>clock+1e-8)break;
   if(wave.end<=clock)continue;
   const inner=wave.r-wave.speed*(clock-wave.start);
   if(inner>200)continue;
   assert(!wave.actors.some(actor=>inner+actor.offset+actor.thickness>=46),
    'Task-2 shape morph too close to a wall at '+at+', seed '+seed);
  }post++;
 }
}
for(const seed of [1,2,3,7])for(const mode of [1,2,3]){
 const data=H.create(seed,128),g=new H.HardGame(data);g.setControlMode(mode);
 let index=0,next=0;
 const clear=data.waves.map(w=>H.realTimeAtClock(
  H.wallClock(w.impact,data.shapeSchedule)+
  (66+w.thickness+(w.outerExtra||0)-59)/w.speed,
  data.shapeSchedule));
 const delta=(a,b)=>E.wrap(b-a+Math.PI)-Math.PI;
 for(let frame=0;frame<3600;frame++){
  while(index<data.waves.length-1&&g.time>clear[index]+.02)index++;
  const w=data.waves[index],target=g.sectorAngle(w.safeSector,w.sides);
  const landing=Array.from({length:g.sides},(_,i)=>i)
   .sort((a,b)=>Math.abs(delta(g.sectorAngle(a),target))-
     Math.abs(delta(g.sectorAngle(b),target)))[0];
  if(mode===1)g.update(1/60,Math.max(-1,Math.min(1,
   delta(g.angle,target)/(g.playerSpeed/60))));
  else{
   if(g.time>=next){
    if(mode===3)g.selectSector(landing);
    else{
     const current=g.currentSector(),a=(landing-current+g.sides)%g.sides,
      b=(current-landing+g.sides)%g.sides;
     if(a||b)g.stepSector(a<=b?1:-1);
    }
    next=g.time+.18*Motion.CLOCK_RATE;
   }
   g.update(1/60);
  }
  assert(!g.dead,'Unexpected hit, seed '+seed+' control '+mode+' at '+g.time);
 }
}
console.log('PASS: '+SEEDS.length+' HEXAGON seeds; '+pre+
 ' task-1 windows; '+post+' task-2 morphs; 12 guided runs, 3 controls.');
