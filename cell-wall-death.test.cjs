'use strict';
const assert=require('node:assert/strict'),R=require('./random-waves'),T=require('./mixed-transition'),{Game}=require('./engine');
for(let seed=1;seed<=50;seed++){
 const data=R.create(seed),g=new Game(6,data);g.time=3;g.sampleWalls();
 for(const wave of g.mixedActors)for(const extra of wave.smallWalls){
  assert.equal(extra.thickness,wave.thickness);
  assert((wave.spawnRadius+extra.offset)*Math.cos(Math.PI/4)*.70>Math.hypot(480,300)+8,'full-cell companions must be born outside the tilted viewport');
  const actors=wave.actors.filter(a=>a.band===extra.band);
  assert(actors.length>0&&actors.every(a=>a.sector===extra.sector));
  const span=actors.reduce((s,a)=>s+T.laneAt(wave.sides,a.mixedEnd)-T.laneAt(wave.sides,a.mixedStart),0);
  assert.equal(span,1,'each companion is a complete native cell, not a shortened strip');
 }
}
for(const mode of [1,2,3]){
 const g=new Game();g.walls=[{id:'fatal',r:60,sector:0,sides:6,thickness:30}];g.angle=Math.PI/6;g.setControlMode(mode);
 if(mode===3)g.selectSector(0);else g.update(1/240,0);
 assert(g.dead&&g.death&&g.death.wallId==='fatal');
 const snapshot=JSON.stringify(g.death),time=g.time,angle=g.angle;
 g.update(1,1);assert.equal(g.time,time);assert.equal(g.angle,angle);assert.equal(JSON.stringify(g.death),snapshot);
 g.walls[0].r=0;assert.equal(JSON.stringify(g.death),snapshot,'the visible impact snapshot is immutable');
 assert.equal(new Game().death,undefined,'retry begins without the previous impact');
}
console.log('PASS full-cell normal-thickness companion walls and immutable precise death snapshots in all modes');
