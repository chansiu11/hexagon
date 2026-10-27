const assert=require('node:assert/strict');
const {Game,intersect,playerPoly,wallVisualPoly,shapeStateAt,stabilizeTimeline,HIDDEN_WALL_OUTER_RADIUS,hiddenWallEnd,wallTimelineTime}=require('./engine');
const TAU=Math.PI*2;
assert.equal(HIDDEN_WALL_OUTER_RADIUS,26);
assert(HIDDEN_WALL_OUTER_RADIUS<45.8807*Math.cos(Math.PI/4)-4,'must be hidden even by a four-sided core');
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
 // Every repaired wave preserves its original motion/sector and is only
 // extended into the invisible interior of the polygon.
 let protectedEdges=0;
 for(const original of raw.waves){
  if(omitted.has(original.id))continue;
  const wave=d.waves.find(w=>w.id===original.id);
  assert(wave,'original wall must have a stable actor');
  assert.equal(wave.start,original.start);
  assert.equal(wave.r,original.r);
  assert.equal(wave.speed,original.speed);
  assert.deepEqual(wave.sectors,original.sectors);
  const originalEnd=overrides.get(original.id)??original.end;
  assert(Math.abs(wave.end-hiddenWallEnd(original,originalEnd,raw.duration))<1e-8);
  if(wave.end>originalEnd+1e-8){
   protectedEdges++;
   // At the old cutoff, the actor remains and travels smoothly inwards.
   const eps=Math.min(1/240,(wave.end-originalEnd)/4);
   // Find the render time at which the morph-aware motion clock crosses
   // the original observed cutoff (pauses must not count as wall motion).
   let low=0,high=raw.duration;
   for(let n=0;n<40;n++){
    const mid=(low+high)/2;
    if(wallTimelineTime(mid,raw.shapeSchedule)<originalEnd)low=mid;
    else high=mid;
   }
   const cutoff=(low+high)/2;
   if(level===0&&(original.id===148||original.id===149))continue; // two sectors intentionally opened for the first pentagon transition
   if(cutoff-eps>0&&cutoff+eps<raw.duration){
    g.time=cutoff-eps;g.sampleWalls();
    const before=g.walls.find(w=>w.waveId===original.id);
    g.time=cutoff+eps;g.sampleWalls();
    const after=g.walls.find(w=>w.waveId===original.id);
    assert(before&&after,'wall must continue beyond the old blinking cutoff');
    const motion=wallTimelineTime(cutoff+eps,raw.shapeSchedule)-
      wallTimelineTime(cutoff-eps,raw.shapeSchedule);
    assert(Math.abs(before.r-after.r-original.speed*motion)<1e-5,
     'wall must not teleport at original cutoff');
   }
  }
 }
 assert(protectedEdges>50,'many previously visible wall cutoffs must be protected');
 assert.equal(d.waves.length,raw.waves.length-omitted.size);
 assert.equal(d.waves.filter(w=>overrides.has(w.id)).length,overrides.size);
 assert.equal(new Set(d.waves.map(w=>w.id)).size,d.waves.length,'no duplicate wave actors');
 assert.strictEqual(stabilizeTimeline(level,raw),d,'repair must be cached');
 for(const w of d.waves){
  if(w.end<d.duration-1/60)
   assert(w.r-w.speed*(w.end-w.start)+w.thickness<=HIDDEN_WALL_OUTER_RADIUS+1e-6,
    'wave '+w.id+' on map '+(level+1)+' expires with a visible core-edge sliver');
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
