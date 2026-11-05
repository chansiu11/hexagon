'use strict';
// The seventh stage must get harder and visually more chaotic without
// producing unavoidable walls for either existing control mode.
const assert=require('node:assert/strict');
const {Game,levels,shapeStateAt,wallVisualPoly,playerPoly,intersect}=require('./engine');
const {create,SPAWN_RADIUS,SHAPE_SCHEDULE,atTime}=require('./random-waves');
const TAU=Math.PI*2,wrap=a=>(a%TAU+TAU)%TAU;
const delta=(from,to)=>((to-from+Math.PI+TAU)%TAU)-Math.PI;
const seeds=[1,2,7,19,42,77,108,2026,123456,0xdeadbeef];
assert.equal(levels.length,7);
assert.equal(levels[6][0],'RANDOM HEXAGON');
let narrow=0,wide=0,bestWaveCount=Infinity,fastest=0;
for(const seed of seeds){
 const data=create(seed),copy=create(seed);
 assert.deepEqual(data,copy,'seed must reproduce same walls and spin');
 assert.deepEqual(data.shapeSchedule,SHAPE_SCHEDULE);
 assert.equal(data.duration,60);
 assert.equal(data.mode,'batched-wall-waves');
 assert.equal(data.camera.length,3601);
 assert(data.waves.length>=25&&data.waves.length<=45,'harder sustained obstacle rhythm');
 bestWaveCount=Math.min(bestWaveCount,data.waves.length);
 assert(data.spinEvents.length>=14);
 assert(Math.abs(data.spinEvents[0][1])<1.5);
 assert(data.spinEvents.some(([t,speed])=>t>=45&&Math.abs(speed)>4),
  'camera spin intensity must increase strongly later');
 for(let i=0;i<data.waves.length;i++){
  const w=data.waves[i],prev=data.waves[i-1];
  assert(w.r===SPAWN_RADIUS);
  assert([4,5,6].includes(w.sides),'vary polygon geometry from hexagon to pentagon/square');
  assert.equal(w.sides,atTime(w.impact,data.shapeSchedule));
  assert(w.r*Math.cos(Math.PI/4)>Math.hypot(480,300),
   'all wall polygons are initially born outside canvas');
  assert(w.speed>=296&&w.speed<365,'faster but bounded walls');
  fastest=Math.max(fastest,w.speed);
  assert(w.thickness>=40&&w.thickness<=53);
  assert(w.openings>=1&&w.openings<=3);
  assert(w.sectors.length===w.sides-w.openings);
  assert.equal(new Set(w.sectors).size,w.sectors.length);
  assert(!w.sectors.includes(w.safeSector));
  if(w.openings===1)narrow++;if(w.openings===3)wide++;
  for(const [at] of data.shapeSchedule.slice(1)){
   assert(Math.abs(w.impact-at)>=.8,'avoid impossible wall hits during morph');
   if(w.impact>at)assert(w.start>=at+.25||w.impact>at+10,
     'new shape must not appear before the transition');
  }
  if(prev){
   const oldCenter=(prev.safeSector+.5)*TAU/prev.sides;
   const newCenter=(w.safeSector+.5)*TAU/w.sides;
   assert(Math.abs(delta(oldCenter,newCenter))<1.9,
    'reachable safe sector may drift only locally');
   assert(w.impact-prev.impact>=1.05,
    'wall rhythm must still leave time for real player input');
   assert(w.start>prev.start);
  }
  assert(Math.abs(w.end-Math.min(60,w.start+(w.r+w.thickness-26)/w.speed))<1e-9,
   'each actor must travel continuously behind the center before expiry');
 }
 for(const mode of [1,2]){
  const game=new Game(6,data);
  game.setControlMode(mode);
  let index=0,changed=0,spinAt10=0,spinAt50=0,tiltMaxEarly=0,tiltMaxLate=0;
  let spinEarly=0,spinLate=0,earlyFrames=0,lateFrames=0;
  for(let frame=0;frame<60*60;frame++){
   const dt=1/60;
   while(index<data.waves.length-1&&game.time>data.waves[index].impact+.35)index++;
   const wave=data.waves[index],target=(wave.safeSector+.5)*TAU/wave.sides;
   if(mode===1){
    const d=delta(game.angle,target);
    game.update(dt,Math.max(-1,Math.min(1,d/(game.playerSpeed*dt))));
   }else{
    const current=Math.floor(wrap(game.angle)/(TAU/game.sides)+1e-9);
    const desired=wave.safeSector;
    const fwd=(desired-current+game.sides)%game.sides;
    const back=(current-desired+game.sides)%game.sides;
    if(fwd||back){changed++;game.stepSector(fwd<=back?1:-1)}
    game.update(dt,0);
   }
   assert(!game.dead,'random level must be survivable for seed '+seed+
    ', mode '+mode+' at '+game.time.toFixed(3)+'s, wave '+index);
   assert(game.walls.every(w=>w.sides>=4&&w.sides<=6),
    'new polygon walls stay intact through shape morphs');
   if(game.time<10)tiltMaxEarly=Math.max(tiltMaxEarly,Math.abs(game.tilt));
   if(game.time>2&&game.time<9){spinEarly+=Math.abs(game.rotationSpeed);earlyFrames++}
   if(game.time>48&&game.time<58){spinLate+=Math.abs(game.rotationSpeed);lateFrames++}
   if(game.time>48)tiltMaxLate=Math.max(tiltMaxLate,Math.abs(game.tilt));
   if(Math.abs(game.time-10)<1/90)spinAt10=Math.abs(game.rotationSpeed);
   if(Math.abs(game.time-50)<1/90)spinAt50=Math.abs(game.rotationSpeed);
  }
  assert(game.timelineEnded&&game.completed&&game.time===60);
  assert.equal(tiltMaxEarly,0,'random level tilt cannot begin before 10s');
  assert(tiltMaxLate>.08,'screen must visibly tilt after 10s');
  assert(spinAt50>0,'camera rotation must remain active late');
  assert(spinLate/lateFrames>spinEarly/earlyFrames*1.7,
   'rotation must become substantially stronger late in each random attempt');
  if(mode===2)assert(changed>8,'mode-two inputs must be needed repeatedly');
 }
 // The renderer/collision polygon for every actor must use its original
 // sides even during a 6→5 or 6→4 core morph.
 for(const t of [12.2,27.2,42.2,53.2]){
  const g=new Game(6,data);g.time=t;g.sampleWalls();
  assert(g.morph>0&&g.morph<1);
  assert.equal(g.sides,shapeStateAt(t,data.shapeSchedule).to);
  for(const w of g.walls){
   const p=wallVisualPoly(w,w.sides,w.sides,1);
   assert(p.length===4&&p.flat().every(Number.isFinite));
  }
 }
}
assert(narrow>65,'need frequent demanding one-lane gaps');
assert(wide>2,'need occasional brief wide breathing intervals');
assert(fastest>345,'late-game speed must be noticeably higher');
assert.notDeepEqual(create(1).waves,create(2).waves);
console.log('PASS harder random stage: '+bestWaveCount+'+ rings, 4/5/6-sided morphs, growing spin/tilt and playable 60s paths for 10 seeds in both modes');
