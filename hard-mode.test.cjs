'use strict';
const assert=require('node:assert/strict'),H=require('./hard-mode'),E=require('./engine'),M=require('./mixed-transition');
let runs=0;
for(let seed=1;seed<=100;seed++)for(const mode of [1,2,3]){
 const data=H.create(seed,120),g=new H.HardGame(data);g.setControlMode(mode);
 let index=0,next=0;
 const clear=data.waves.map(w=>M.timeAtClock(M.clockAt(w.impact,data.shapeSchedule)+(66+w.thickness-59)/w.speed,data.shapeSchedule));
 for(let f=0;f<7201;f++){
  while(index<data.waves.length-1&&g.time>clear[index]+.02)index++;
  const wave=data.waves[index],target=g.sectorAngle(wave.safeSector,wave.sides),delta=(a,b)=>E.wrap(b-a+Math.PI)-Math.PI;
  const landing=Array.from({length:g.sides},(_,i)=>i).sort((a,b)=>Math.abs(delta(g.sectorAngle(a),target))-Math.abs(delta(g.sectorAngle(b),target)))[0];
  if(mode===1)g.update(1/60,Math.max(-1,Math.min(1,delta(g.angle,target)/(g.playerSpeed/60))));
  else{
   if(g.time>=next){
    if(mode===3)g.selectSector(landing);else{const current=g.currentSector(),a=(landing-current+g.sides)%g.sides,b=(current-landing+g.sides)%g.sides;if(a||b)g.stepSector(a<=b?1:-1)}
    next=g.time+.18;
   }
   g.update(1/60);
  }
  assert(!g.dead,`seed ${seed} mode ${mode} at ${g.time.toFixed(3)} wave ${index} shape ${g.sides}`);
 }
 assert(g.completed&&g.timelineEnded);runs++;
}
assert.deepEqual(H.create(42),H.create(42));assert.notDeepEqual(H.create(1).waves,H.create(2).waves);
console.log('PASS',runs,'HARD 120-second collision replays');
const sideData={duration:10,shapeSchedule:[[0,6]],groups:[{at:0,rate:0,tilt:0}],waves:[{id:'side',sides:6,sectors:[0],safeSector:2,safeAngle:2.6,impact:1,r:65,speed:0,thickness:30,start:0,end:10}]};
const side=new H.HardGame(sideData);side.angle=1.4;side.update(.4,-1);assert(!side.dead,'a static lateral face must block rather than kill');assert(side.angle>Math.PI/3,'player must not pass through the lateral wall');
const front=new H.HardGame({...sideData,waves:[{...sideData.waves[0],id:'front',r:100,speed:60}]});front.angle=Math.PI/6;front.update(1,0);assert(front.dead&&front.death.wallId.startsWith('front'),'an inward-moving front must kill on real triangle contact');
const death=JSON.stringify(front.death);front.update(1,1);assert.equal(JSON.stringify(front.death),death);
console.log('PASS lateral blocking, inward-front collision and immutable impact');
