const assert=require('node:assert/strict');
const d=require('./assets/timelines/rigid-stage-0.json');
const {Game}=require('./engine');
const radius=(w,t)=>w.r-w.speed*(t-w.start);
assert.equal(d.continuityVersion,'opening-1');
const repaired=d.walls.filter(w=>w.continuityRepair);
assert(repaired.length>0);
for(const w of repaired){
 if(w.end<d.duration)assert(radius(w,w.end)+w.thickness<=42.001,'visible wall must not expire');
 const g=new Game(0,d);g.time=w.end-.00001;g.sampleWalls();assert(g.walls.some(x=>x.id===w.id),'wall exists until its physical exit');
}
for(const a of repaired)for(const b of repaired){
 if(a.id>=b.id||a.wave!==b.wave)continue;
 assert.equal(a.start,b.start);assert.equal(a.speed,b.speed);assert.equal(a.r,b.r);assert.equal(a.thickness,b.thickness);
}
console.log('PASS stage one: physical wall lifetime and connected-wall geometry');
