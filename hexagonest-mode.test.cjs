'use strict';
const assert=require('node:assert/strict');
const E=require('./engine');
const V=require('./hexagonest-video');
const X=require('./hexagonest-mode');
assert.equal(V.events.length,360);
assert.equal(V.clips.length,984);
assert.equal(X.VIDEO_PART_COUNT,984);
assert(V.events.every(e=>e.mask>0&&e.mask<63&&e.width>=22&&e.videoSeconds<317));
assert.equal(X.palette(30)[1],92,'bright early palette');
assert.equal(X.palette(61)[1],0,'desaturation after 60 seconds');
assert.deepEqual(X.palette(125),[0,0,[0,0,100]],'monochrome later footage');
for(const t of [0,59,60,119,120,300])assert(X.speedAt(t)>=570);
assert.notEqual(X.speedAt(40),X.speedAt(70));
assert.equal(X.rotateMask(0b000011,2,false),0b001100);
for(let seed=1;seed<=100;seed++){
 const d=X.create(seed,320),parts=new Set(d.waves.map(w=>w.partId));
 assert.equal(d.mode,'hexagonest-video');
 assert.deepEqual(d.shapeSchedule,[[0,6]],'Hexagonest footage retains six sides');
 assert(d.waves.length>490&&d.waves.length<1000);
 assert(parts.size>=120,'should combine many short observed fragments');
 assert(d.waves.at(-1).impact>315,'extend beyond the old 60s wall track');
 for(const w of d.waves){
  assert(w.sectors.length>0&&w.sectors.length<6);
  assert(!w.sectors.includes(w.safeSector),'every wave has a real passable lane');
  assert(w.sectors.every(s=>s>=0&&s<6));
  assert(w.start<w.impact&&w.end>w.impact);
  assert(Number.isFinite(w.speed)&&w.speed>0);
 }
}
assert.deepEqual(X.create(42,125),X.create(42,125),'seed determinism');
assert.notDeepEqual(X.create(1,125).waves,X.create(2,125).waves,'replay variety');
console.log('PASS 100 Hexagonest seeds: 360 source observations, 984 parts, open polygon masks, 315+ seconds, three palette/speed eras');

const delta=(a,b)=>E.wrap(b-a+Math.PI)-Math.PI;
let replays=0;
for(let seed=1;seed<=8;seed++){
 const duration=seed<=2?318:125;
 const d=X.create(seed,duration),clear=d.waves.map(w=>w.impact+(66+w.thickness-59)/w.speed);
 for(const mode of [1,2,3]){
  const g=new X.HexagonestGame(d);g.setControlMode(mode);
  assert(g.hexagonestMode&&!g.hardMode&&g.level===2);
  assert(Math.abs(g.playerSpeed-9*Math.PI/180*60*25/24)<1e-8);
  let index=0,next=0;
  for(let frame=0;frame<=Math.floor((duration===318?316:120)*60);frame++){
   while(index<d.waves.length-1&&g.time>clear[index]+.02)index++;
   const w=d.waves[index],target=g.sectorAngle(w.safeSector,6);
   if(mode===1)g.update(1/60,Math.max(-1,Math.min(1,delta(g.angle,target)/(g.playerSpeed/60))));
   else{
    if(g.time>=next){
     const lane=Array.from({length:6},(_,i)=>i).sort((a,b)=>Math.abs(delta(g.sectorAngle(a),target))-Math.abs(delta(g.sectorAngle(b),target)))[0];
     if(mode===3)g.selectSector(lane);
     else{
      const current=g.currentSector(),a=(lane-current+6)%6,b=(current-lane+6)%6;
      if(a||b)g.stepSector(a<=b?1:-1);
     }
     next=g.time+.18;
    }
    g.update(1/60);
   }
   assert(!g.dead,'seed '+seed+' mode '+mode+' time '+g.time.toFixed(3)+' at wave '+index);
  }
  assert(g.time>=(duration===318?315:119.9),'run must survive intended timeline');
  replays++;
 }
}
console.log('PASS '+replays+' collision-aware Hexagonest mode 1/2/3 replays, including six full 316-second runs');
