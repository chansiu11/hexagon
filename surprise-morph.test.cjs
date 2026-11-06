'use strict';
const assert=require('node:assert/strict'),R=require('./random-waves'),T=require('./mixed-transition'),{Game}=require('./engine');
const tau=Math.PI*2,delta=(a,b)=>((b-a+Math.PI)%tau+tau)%tau-Math.PI;
let closeArrivals=0,changes=0,inner=0,outer=0;
for(let seed=1;seed<=100;seed++){
 const data=R.create(seed);
 for(const [at] of data.shapeSchedule.slice(1)){
  changes++;if(data.waves.some(w=>w.impact<at&&w.impact>at-.4))closeArrivals++;
  assert(Math.abs(at*data.musicTrack.bpm/60-Math.round(at*data.musicTrack.bpm/60))>1e-7,'shape changes must not be locked to a predictable beat grid');
 }
 for(const w of data.waves)for(const rim of w.smallWalls){
  assert(w.sectors.includes(rim.sector)&&rim.sector!==w.safeSector,'mini walls cannot occupy the protected opening');
  assert(rim.thickness>=6&&rim.thickness<=11);
  if(rim.band==='inner'){inner++;assert(rim.offset<0)}else{outer++;assert(rim.offset>w.thickness)}
 }
}
assert(closeArrivals>changes*.20,'walls must keep arriving immediately before unpredictable morphs');
assert(inner>100&&outer>100);
for(const mode of [1,2,3])for(let lane=0;lane<6;lane++){
 const data={kind:'mixed-pattern',mode:'batched-wall-waves',duration:12,sampleRate:60,shapeSchedule:[[0,6],[2,4],[5.1,5],[8.7,6]],morphSeconds:T.MORPH_SECONDS,tiltEvents:[[0,.1]],waves:[]};
 const g=new Game(6,data);g.setControlMode(mode);g.angle=(lane+.5)*tau/6;let previous=g.angle,maximum=0;
 for(let frame=0;frame<1200;frame++){
  g.time=frame/120;g.sampleWalls();maximum=Math.max(maximum,Math.abs(delta(previous,g.angle)));previous=g.angle;
 }
 assert(maximum<.06,'idle player must ride smoothly across all shape changes, mode '+mode+', lane '+lane);
}
const fixture=smallWalls=>({kind:'mixed-pattern',mode:'batched-wall-waves',duration:60,sampleRate:60,shapeSchedule:[[0,6]],morphSeconds:.65,tiltEvents:[[0,.1]],waves:[{id:0,sides:6,sectors:[0],safeSector:1,r:100,speed:1,start:0,end:60,thickness:20,smallWalls}]});
const safe=new Game(6,fixture([]));safe.setControlMode(3);safe.sampleWalls();safe.selectSector(0);assert(!safe.dead);
const hit=new Game(6,fixture([{band:'inner',offset:-28,thickness:8,sector:0,pick:.5}]));hit.setControlMode(3);hit.sampleWalls();hit.selectSector(0);assert(hit.dead,'mini walls must have a real matching hitbox independent of the parent wall');
console.log('PASS irregular unannounced morphs, smooth player carry in all modes, random inner/outer mini-wall hitboxes; '+closeArrivals+'/'+changes+' morphs have arrivals in their final 0.4s');
