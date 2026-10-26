const assert=require('node:assert/strict');
const {Game,intersect,playerPoly,wallPoly,observedWaveRadius}=require('./engine');
const {buildObservedWaves}=require('./build_observed_waves.cjs');
const first=require('./assets/timelines/waves-stage-0.json');
assert.equal(first.waves.length,561,'stage one wall source must remain unchanged');
assert.equal(first.version,7,'stage one wall timeline version is frozen');
for(const w of first.waves){
 for(const t of [w.start,Math.min(w.end,w.start+.1)]){
  assert.equal(observedWaveRadius(w,t),w.r-w.speed*(t-w.start),
   'stage one motion remains exactly as before');
 }
}
for(let level=1;level<=5;level++){
 const raw=require('./assets/timelines/rigid-stage-'+level+'.json');
 const d=require('./assets/timelines/waves-stage-'+level+'.json');
 assert.equal(d.mode,'batched-wall-waves');
 assert.equal(d.stage,level);
 assert.equal(d.generator,'stage-one-rigid-v7','same generation rule as stage one');
 assert.equal(d.version,8);
 assert.equal(d.offscreenBirth,true);
 assert.equal(d.continuity.minObservedSeconds,first.continuity.minObservedSeconds);
 assert.equal(d.continuity.maxExtensionSeconds,first.continuity.maxExtensionSeconds);
 assert.equal(d.continuity.physicalExitRadius,first.continuity.physicalExitRadius);
 assert.deepEqual(d.shapeSchedule,raw.shapeSchedule,'preserve original stage shape transitions');
 assert.equal(d.duration,60);
 assert.equal(d.sampleRate,60);
 assert(d.waves.some(w=>w.sectors.length>1),'stage contains connected wall actors');
 assert.equal(new Set(d.waves.map(w=>w.speed)).size,1,'same constant speed for every wave in stage');
 assert.equal(d.waves[0].speed,d.sharedSpeed);
 const discarded=d.repair.discardedSourceActors;
 assert.equal(d.waves.length+discarded.length,d.repair.groupCount,
  'every built wave is retained or has documented exclusion');
 const registered=d.waves.flatMap(w=>w.sourceTrackIds),dropped=discarded.flatMap(w=>w.sourceTrackIds);
 assert.equal(registered.length+dropped.length,raw.walls.length,'preserve or explicitly exclude source tracks');
 assert.equal(new Set([...registered,...dropped]).size,raw.walls.length,'source tracks cannot be duplicated');
 const zoom=Math.min(1,...d.camera.map(c=>Math.hypot(c[0],c[1])));
 let previous=-Infinity;
 for(const w of d.waves){
  assert(w.observedStart>=previous-1e-8,'preserve observed appearance order');
  previous=w.observedStart;
  assert(w.start>=0&&w.start<=w.observedStart&&w.end>w.start&&w.end<=d.duration);
  assert(!('approach' in w),'no special entrance animations; stage one straight-line travel only');
  const birthZoom=w.start===0?Math.min(1,Math.hypot(d.camera[0][0],d.camera[0][1])):zoom;
  assert(w.r*Math.cos(Math.PI/w.sides)*birthZoom>Math.hypot(480,300),
   'wall actor must begin entirely outside the viewport');
  assert(w.sectors.length>0&&w.sectors.length<w.sides);
  assert.equal(new Set(w.sectors).size,w.sectors.length);
  assert(w.thickness>=12&&w.speed>0);
  const shape=raw.shapeSchedule.filter(s=>s[0]<=w.observedStart+1e-7).at(-1)[1];
  assert.equal(w.sides,shape,'preserve observed number of sides');
  for(const t of [w.start,Math.min(w.end-.000001,w.start+.15)]){
   assert(Math.abs(observedWaveRadius(w,t)-(w.r-w.speed*(t-w.start)))<1e-9,
    'stage-one linear movement applies to every wave');
  }
  if(w.continuityExtension){
   const normalEnd=w.stageTwoLifecycle?.baselineEnd??w.glitchCorrection?.baselineEnd??w.end;
   assert(normalEnd-w.observedEnd<=first.continuity.maxExtensionSeconds+1e-7,
    'stage-one normal wall continuation remains bounded');
   const next=raw.shapeSchedule.find(s=>s[0]>w.observedEnd+1e-6)?.[0]??d.duration;
   assert(w.end<=next+1e-7,'lifetime extension may not exceed stage shape transition');
  }
  if(w.glitchCorrection){
   assert(w.glitchCorrection.baselineEnd>=15.5&&w.glitchCorrection.baselineEnd<=19.5,
    'special continuity only applies to the reported 17-second interval');
   assert(w.glitchCorrection.extendedSeconds>0&&w.glitchCorrection.extendedSeconds<=2+1e-7);
   assert(Math.abs(w.end-w.glitchCorrection.baselineEnd-w.glitchCorrection.extendedSeconds)<1e-7);
   assert(w.samples>=6,'all supported 6+ frame tracks may receive continuation');
  }
 }
 // Regression: walls used to blink out visibly around 17 seconds because
 // 6-11-frame source observations were not extended by the old repair.
 // During the affected window all walls must finish behind the center core,
 // never at a still-visible radius (stage one is separately left untouched).
 for(const w of d.waves){
  if(w.end<16||w.end>=18.75)continue;
  const visibleOuterAtDeath=w.r-w.speed*(w.end-w.start)+w.thickness;
  assert(visibleOuterAtDeath<=50+1e-7,
   'stage '+(level+1)+' wave '+w.id+' pops out onscreen at '+w.end.toFixed(3)+'s (r='+visibleOuterAtDeath.toFixed(1)+')');
 }
 assert(d.repair.glitchLifetimeExtensions>0,
  '17-second continuation must be generated for this stage');
 for(let frame=30;frame<1800;frame++){
  const t=frame/30,g=new Game(level,d);
  g.time=t;g.sampleWalls();
  const near=g.walls.filter(w=>w.r<100&&w.r+w.thickness>50);
  if(near.length<4)continue;
  let open=false;
  for(let i=0;i<144;i++){
   const p=playerPoly(i*Math.PI*2/144);
   if(!near.some(w=>intersect(p,wallPoly(w.r,w.sector,w.thickness,w.sides)))){open=true;break;}
  }
  assert(open,'sampled passage must stay open in stage '+(level+1)+' at '+t.toFixed(3));
 }
 if(level===1){
  assert(d.repair.stageTwoRepair,'stage two uses complete stage-one wave lifecycle');
  assert.equal(d.repair.stageTwoRepair.prematureAfter,0);
  for(const w of d.waves)if(w.end<d.duration-1/60)
   assert(w.r-w.speed*(w.end-w.start)+w.thickness<=50+1e-7,
    'stage-two wall cannot vanish before passing the center');
 }
 assert.equal(d.repair.glitchLifetimeExtensions,d.waves.filter(w=>w.glitchCorrection).length);
 assert.deepEqual(buildObservedWaves(raw,level),d,'checked-in waves must match deterministic generator');
 console.log('PASS stage '+(level+1)+': stage-one grouped rigid walls, births, speed, transitions and passage');
}
console.log('PASS stage one preserved and all other stages use the same generation method');
