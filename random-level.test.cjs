'use strict';
const assert=require('node:assert/strict');
const {Game,levels}=require('./engine');
const {create,SPAWN_RADIUS}=require('./random-waves');
const TAU=Math.PI*2;
const wrap=a=>(a%TAU+TAU)%TAU;
const delta=(from,to)=>((to-from+Math.PI+TAU)%TAU)-Math.PI;
const seeds=[1,2,7,19,42,77,108,2026,123456,0xdeadbeef];
assert.equal(levels.length,7);
assert.equal(levels[6][0],'RANDOM HEXAGON');
let narrow=0,wide=0,bestWaveCount=Infinity;
for(const seed of seeds){
 const data=create(seed),copy=create(seed);
 assert.deepEqual(data,copy,'same seed must reproduce the exact same wall layout');
 assert.equal(data.kind,'procedural-random');
 assert.equal(data.duration,60);
 assert.equal(data.mode,'batched-wall-waves');
 assert.equal(data.camera.length,3601);
 assert(data.waves.length>=20&&data.waves.length<=34,'moderate sustained obstacle rhythm');
 bestWaveCount=Math.min(bestWaveCount,data.waves.length);
 for(let i=0;i<data.waves.length;i++){
  const w=data.waves[i],prev=data.waves[i-1],hole=new Set([w.safeSector]);
  assert(w.r===SPAWN_RADIUS&&w.sides===6,'all random walls preserve the hexagon shape');
  assert(w.r*Math.cos(Math.PI/6)>Math.hypot(480,300),'walls must appear fully outside the screen');
  assert(w.speed>=258&&w.speed<306,'moderate controlled wall speed');
  assert(w.thickness>=36&&w.thickness<=48);
  assert(w.openings>=1&&w.openings<=3);
  assert(w.sectors.length===6-w.openings);
  assert.equal(new Set(w.sectors).size,w.sectors.length,'no duplicate polygon sides');
  for(const s of w.sectors)assert(s>=0&&s<6);
  assert(!w.sectors.includes(w.safeSector),'planned safe side must be open');
  for(let n=0;n<6;n++)if(!w.sectors.includes(n))hole.add(n);
  assert.equal(hole.size,w.openings);
  if(w.openings===1)narrow++;
  if(w.openings===3)wide++;
  if(prev){
   const turn=Math.min((w.safeSector-prev.safeSector+6)%6,
                       (prev.safeSector-w.safeSector+6)%6);
   assert(turn<=1,'the only safe path cannot jump to the opposite side');
   assert(w.impact-prev.impact>=1.70,'successive waves must give time to rotate');
   assert(w.start>prev.start,'wave births must stay chronological');
  }
  const actualEnd=w.start+(w.r+w.thickness-26)/w.speed;
  assert(Math.abs(w.end-Math.min(60,actualEnd))<1e-9,
   'walls must expire behind the central core, never mid-screen');
 }
 for(const mode of [1,2]){
  const game=new Game(6,data);
  game.setControlMode(mode);
  assert.equal(game.sides,6);
  let index=0,changed=0;
  for(let frame=0;frame<60*60;frame++){
   const dt=1/60;
   while(index<data.waves.length-1&&game.time>data.waves[index].impact+.35)index++;
   const target=(data.waves[index].safeSector+.5)*TAU/6;
   if(mode===1){
    const d=delta(game.angle,target);
    game.update(dt,Math.max(-1,Math.min(1,d/(game.playerSpeed*dt))));
   }else{
    const current=Math.floor(wrap(game.angle)/(TAU/6)+1e-9);
    const desired=data.waves[index].safeSector;
    const fwd=(desired-current+6)%6,back=(current-desired+6)%6;
    if(fwd||back){changed++;game.stepSector(fwd<=back?1:-1)}
    game.update(dt,0);
   }
   assert(!game.dead,'random stage must admit a playable path for seed '+seed+
    ', mode '+mode+' at '+game.time.toFixed(3)+'s, wave '+index);
  }
  assert(game.timelineEnded&&game.completed&&game.time===60,
   'random level must complete after 60 seconds');
  if(mode===2)assert(changed>5,'random path should require multiple deliberate moves');
 }
}
assert(narrow>10,'the random level needs real occasional one-lane challenges');
assert(wide>3,'some breathing-room patterns should exist');
assert.notDeepEqual(create(1).waves,create(2).waves,'different seeds need new wall placements');
console.log('PASS 7th random level with '+bestWaveCount+'+ rings, diverse patterns, safe connected gaps and 60s real-collision playthroughs for 10 seeds in both modes');
