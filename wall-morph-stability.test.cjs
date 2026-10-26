const assert=require('node:assert/strict');
const {Game,intersect,playerPoly,wallVisualPoly,shapeStateAt,stabilizeTimeline}=require('./engine');
const TAU=Math.PI*2;
const patches=require('./wall-lifecycle-patches.js');
assert.equal(patches.length,6);
const wall={r:250,sector:2,sides:6,thickness:40};
const first=wallVisualPoly(wall,6,5,0),middle=wallVisualPoly(wall,6,5,.5),last=wallVisualPoly(wall,6,5,1);
assert.notDeepEqual(first,last,'six-sided wall must become a pentagonal wall');
for(let i=0;i<4;i++)for(let j=0;j<2;j++){
 assert(Math.abs(middle[i][j]-(first[i][j]+last[i][j])/2)<1e-8,'wall morph must be continuous');
}
for(let level=0;level<6;level++){
 const raw=require('./assets/timelines/waves-stage-'+level+'.json');
 const g=new Game(level,raw),d=g.timeline;
 const omitted=new Set(patches[level].omit),overrides=new Map(patches[level].extend);
 assert.equal(d.waves.length,raw.waves.length-omitted.size);
 assert.equal(d.waves.filter(w=>overrides.has(w.id)).length,overrides.size);
 assert.equal(new Set(d.waves.map(w=>w.id)).size,d.waves.length,'no duplicate wave actors');
 assert.strictEqual(stabilizeTimeline(level,raw),d,'repair must be cached');
 for(const w of d.waves){
  if(w.end<d.duration-1/60)
   assert(w.r-w.speed*(w.end-w.start)+w.thickness<=50+1e-6,
    'wave '+w.id+' on map '+(level+1)+' vanishes before reaching the core');
  assert(w.end>=w.start&&w.end<=d.duration);
 }
 for(let frame=30;frame<1800;frame++){
  const t=frame/30;g.time=t;g.sampleWalls();
  const near=g.walls.filter(w=>w.r<105&&w.r+w.thickness>46);
  if(near.length<4)continue;
  let passage=false;
  for(let a=0;a<144;a++){
   const p=playerPoly(a*TAU/144);
   if(!near.some(w=>intersect(p,wallVisualPoly(w,g.fromSides,g.sides,g.morph)))){
    passage=true;break;
   }
  }
  assert(passage,'stage '+(level+1)+' must leave an angular escape at '+t.toFixed(3)+'s');
 }
 for(const [time,to] of raw.shapeSchedule.slice(1)){
  const before=shapeStateAt(time-1/600,raw.shapeSchedule);
  const start=shapeStateAt(time,raw.shapeSchedule);
  const mid=shapeStateAt(time+.225,raw.shapeSchedule);
  const after=shapeStateAt(time+.45,raw.shapeSchedule);
  assert.equal(start.from,before.to,'transition keeps outgoing side count');
  assert.equal(start.to,to,'incoming side count is correct');
  assert.equal(start.progress,0);
  assert(Math.abs(mid.progress-.5)<1e-9);
  assert(Math.abs(after.progress-1)<1e-12);
  const proto={sector:0,sides:before.to,r:200,thickness:30};
  const a=wallVisualPoly(proto,before.from,before.to,before.progress);
  const b=wallVisualPoly(proto,start.from,start.to,start.progress);
  for(let k=0;k<4;k++)for(let axis=0;axis<2;axis++)
   assert(Math.abs(a[k][axis]-b[k][axis])<1e-6,'shape-change boundary jumps wall geometry');
 }
 console.log('PASS map '+(level+1)+' stable walls, morph and angular passages');
}
console.log('PASS all six walls remain continuous and transform with the shared core');
