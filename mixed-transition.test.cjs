'use strict';
const assert=require('node:assert/strict');
const Transition=require('./mixed-transition'),R=require('./random-waves');
const {Game,wallVisualPoly,playerPoly,intersect,fastIntersect}=require('./engine');
// Regression: every stable boundary must be a complete polygon corner,
// never an opening ending halfway along an existing side.
for(const native of [4,5,6])for(let sector=0;sector<native;sector++){
 const panels=Transition.panels(native,sector);
 let nativeSpan=0;
 for(const [start,end]of panels){
  nativeSpan+=Transition.laneAt(native,end)-Transition.laneAt(native,start);
  for(const current of [4,5,6])for(const t of [start,end]){
   const p=Transition.unitAt(current,t),index=Transition.laneAt(current,t);
   assert.equal(index,Math.round(index),'stable lane ends only at a whole corner');
   assert(Math.abs(Math.hypot(...p)-1)<1e-12,'no half-side boundary inset into the old polygon');
  }
 }
 assert.equal(nativeSpan,1,'the native wall still covers exactly one complete side');
}
for(let seed of [1,7,19,42,77]){
 const data=R.create(seed),g=new Game(6,data);
 for(const [at]of data.shapeSchedule.slice(1)){
  g.time=at;g.sampleWalls();
  const clock=g.wallMotionTime,actors=g.walls.map(w=>[w.id,w.r]),waves=g.waves.map(w=>w.id);
  for(let i=0;i<=65;i++){
   const t=at+i/100;g.time=t;g.sampleWalls();
   assert(Math.abs(g.wallMotionTime-clock)<1e-8,'wall clock must freeze for the entire morph');
   assert.deepEqual(g.walls.map(w=>[w.id,w.r]),actors,'no radial movement, births or disappearing walls while morphing');
   assert.deepEqual(g.waves.map(w=>w.id),waves);
   assert(Math.abs(g.morph-i/65)<1e-8,'morph progress must span the complete hold');
   for(const w of g.walls){
    // Both boundaries of every physical wall panel must be exact scaled
    // points on the core's mesh, including corners in the outgoing shape.
    const u=g.morph*g.morph*(3-2*g.morph);
    for(const [t,vertex] of [[w.mixedStart,0],[w.mixedEnd,1]]){
     const a=Transition.unitAt(g.fromSides,t),b=Transition.unitAt(g.sides,t);
     const p=w.renderPoly[vertex];
     assert(Math.abs(p[0]-(a[0]*(1-u)+b[0]*u)*Math.max(0,w.r))<1e-9);
     assert(Math.abs(p[1]-(a[1]*(1-u)+b[1]*u)*Math.max(0,w.r))<1e-9);
    }
   }
   for(let j=1;j<g.walls.length;j++){
    const a=g.walls[j-1],b=g.walls[j];
    if(a.waveId===b.waveId&&a.band===b.band&&a.mixedEnd===b.mixedStart){
     assert.deepEqual(a.renderPoly[1],b.renderPoly[0],'shared inner boundary must stay welded');
     assert.deepEqual(a.renderPoly[2],b.renderPoly[3],'shared outer boundary must stay welded');
    }
   }
   for(const w of g.walls)assert.deepEqual(w.renderPoly,wallVisualPoly(w,g.fromSides,g.sides,g.morph),'cached render and hitbox must match the accepted polygon exactly');
  }
  let previousSpeed=0;
  for(let i=1;i<18;i++){
   const t=at+Transition.MORPH_SECONDS+i/100,epsilon=1e-5;
   const speed=(Transition.clockAt(t+epsilon,data.shapeSchedule)-Transition.clockAt(t-epsilon,data.shapeSchedule))/(2*epsilon);
   assert(speed>=previousSpeed-1e-7&&speed<=1.000001,'restart eases to normal speed with no catch-up burst');previousSpeed=speed;
  }
  const after=at+Transition.MORPH_SECONDS+Transition.RESUME_SECONDS+.1;
  assert(Math.abs((Transition.clockAt(after+.001,data.shapeSchedule)-Transition.clockAt(after,data.shapeSchedule))/.001-1)<1e-8);
 }
 const references=new Map();let wallArray=null,waveArray=null;
 for(let frame=0;frame<7200;frame++){
  g.time=frame/120;g.sampleWalls();
  if(!wallArray){wallArray=g.walls;waveArray=g.waves}else{assert.strictEqual(g.walls,wallArray);assert.strictEqual(g.waves,waveArray)}
  for(const w of g.walls){
   const prior=references.get(w.id);
   if(prior){assert.strictEqual(w,prior.wall);assert.strictEqual(w.renderPoly,prior.poly)}else references.set(w.id,{wall:w,poly:w.renderPoly});
   if(frame%20===0){
    const expected=wallVisualPoly(w,g.fromSides,g.sides,g.morph);assert.deepEqual(w.renderPoly,expected);
    for(let a=0;a<12;a++){const p=playerPoly(a*Math.PI/6,.4*Math.sin(a));assert.equal(fastIntersect(p,expected),intersect(p,expected),'allocation-free SAT must preserve inclusive collision semantics')}
   }
  }
 }
 for(const w of data.waves){
  g.time=w.impact;g.sampleWalls();const wave=g.waves.find(v=>v.id===w.id);
  assert(wave&&Math.abs(wave.r-66)<1e-8,'pause calibration must preserve every beat-aligned arrival');
 }
}
console.log('PASS whole-edge corner collapse without half lanes, welded shared core/wall perimeter, full 0.65s radial freeze, smooth non-accelerated restart, exact cached polygons/SAT, stable actors and musical arrivals');
