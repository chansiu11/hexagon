const assert=require('node:assert/strict');
const {Game,intersect,playerPoly,wallPoly,observedWaveRadius}=require('./engine');
const first=require('./assets/timelines/waves-stage-0.json');
assert.equal(first.waves.length,561,'stage one must retain its previously verified waves');
for(const w of first.waves.slice(0,25))for(const t of [w.start,Math.min(w.end,w.start+.1)]){
 assert.equal(observedWaveRadius(w,t),w.r-w.speed*(t-w.start),'stage one is unchanged');
}
for(let level=1;level<=5;level++){
 const raw=require('./assets/timelines/rigid-stage-'+level+'.json');
 const d=require('./assets/timelines/waves-stage-'+level+'.json');
 assert.equal(d.mode,'batched-wall-waves');
 assert.equal(d.stage,level);
 assert.equal(d.waves.length+d.repair.discardedSuspectTracks.length,d.repair.groups);
 assert.deepEqual(d.shapeSchedule,raw.shapeSchedule,'retain observed stage transformations');
 assert.equal(d.duration,60);
 assert.equal(d.sampleRate,60);
 assert(d.waves.some(w=>w.sectors.length>1),'build connected walls, stage '+level);
 assert.equal(new Set(d.waves.map(w=>w.speed)).size,1,'stage uses stable wave speed');
 const registered=d.waves.flatMap(w=>w.sourceTrackIds);
 const dropped=d.repair.discardedSuspectTracks.flatMap(w=>w.sourceTrackIds);
 assert.equal(registered.length+ dropped.length,raw.walls.length,'retain every source track or explain exclusion');
 assert.equal(new Set([...registered,...dropped]).size,raw.walls.length,'source tracks must be unique');
 const zoom=Math.min(1,...d.camera.map(c=>Math.hypot(c[0],c[1])));
 let previous=-Infinity;
 for(const w of d.waves){
  assert(w.observedStart>=previous-1e-8,'preserve recorded appearance order');previous=w.observedStart;
  assert(w.start>=0&&w.end>w.start&&w.end<=d.duration&&w.observedStart>=w.start);
  assert(w.r*Math.cos(Math.PI/w.sides)*zoom>Math.hypot(480,300),'no mid-screen wall births');
  assert(w.sectors.length>0&&w.sectors.length<w.sides);
  assert.equal(new Set(w.sectors).size,w.sectors.length,'unique sectors inside each wave');
  assert(w.thickness>=12&&w.speed>0);
  const shape=raw.shapeSchedule.filter(s=>s[0]<=w.observedStart+1e-7).at(-1)[1];
  assert.equal(w.sides,shape,'respect observed side transitions');
  if(w.approach){
   assert(Math.abs(observedWaveRadius(w,w.observedStart)-w.approach.observedR)<1e-7);
   assert(Math.abs(observedWaveRadius(w,w.observedStart-1e-6)-w.approach.observedR)<.1,'continuous entry');
  }
  if(w.continuityExtension)assert(w.end-w.observedEnd<=.6500001,'no unbounded lifetime speculation');
 }
 for(let frame=30;frame<1800;frame++){
  const time=frame/30,game=new Game(level,d);
  game.time=time;game.sampleWalls();
  const obstacles=game.walls.filter(w=>w.r<100&&w.r+w.thickness>50);
  if(obstacles.length<4)continue;
  let open=false;
  for(let k=0;k<144;k++){
   const player=playerPoly(k*2*Math.PI/144);
   if(!obstacles.some(w=>intersect(player,wallPoly(w.r,w.sector,w.thickness,w.sides)))){open=true;break}
  }
  assert(open,'stage '+(level+1)+' must have a sampled angular escape route at '+time.toFixed(3));
 }
 console.log('PASS stage '+(level+1)+': measured actor order, outside births, geometry, shape timing, and clear passage');
}
console.log('PASS: stage one remains unchanged, all subsequent stages use batched observed walls');
