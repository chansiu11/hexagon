'use strict';
const assert=require('node:assert/strict');
const {Game,levels,wallVisualPoly,playerPoly,intersect,wrap}=require('./engine');
const R=require('./random-waves'),Transition=require('./mixed-transition'),T=Math.PI*2;
const delta=(a,b)=>wrap(b-a+Math.PI)-Math.PI;
assert.equal(levels.length,7);
assert.equal(new Set(R.PATTERN_BANK.map(p=>p.level)).size,6);
for(const p of R.PATTERN_BANK){
 const ids=new Set(require('./assets/timelines/waves-stage-'+p.level+'.json').waves.map(w=>w.id));
 assert(p.gates.length>=4);
 for(const gate of p.gates){assert(gate.sourceIds.every(id=>ids.has(id)));assert(gate.sectors.length>0&&gate.sectors.length<gate.sides)}
}
const seenTracks=new Set(),seenShapes=new Set(),seenSources=new Set();let minimumWaves=1000;
for(let seed=1;seed<=100;seed++)for(const trackIndex of [0,1,2]){
 const data=R.create(seed,trackIndex);assert.deepEqual(data,R.create(seed,trackIndex));
 assert.equal(data.kind,'mixed-pattern');seenTracks.add(data.musicTrack.key);
 assert(data.waves.length>=45,'mixed normal patterns must remain challenging');
 minimumWaves=Math.min(minimumWaves,data.waves.length);
 assert(data.shapeSchedule.length>=6);
 assert(Math.abs(data.tiltEvents[0][1])>=.07,'random tilt starts immediately');
 for(let i=1;i<data.shapeSchedule.length;i++){
  assert.notEqual(data.shapeSchedule[i][1],data.shapeSchedule[i-1][1]);
  seenShapes.add(data.shapeSchedule[i][1]);
 }
 for(let i=0;i<data.waves.length;i++){
  const w=data.waves[i],prev=data.waves[i-1];seenSources.add(w.sourceLevel);
  assert(w.sectors.length>=1&&w.sectors.length<w.sides);
  assert(w.r*Math.cos(Math.PI/4)*.70>Math.hypot(480,300)+8,'birth must stay outside even a tilted, zoomed and shaken viewport');
  assert(!w.sectors.includes(w.safeSector),'each gate must have a protected opening');
  assert.equal(w.sides,R.atTime(w.impact,data.shapeSchedule));
  const beat=(w.impact-data.musicTrack.phase)/(30/data.musicTrack.bpm);
  assert(Math.abs(beat-Math.round(beat))<1e-8,'every gate arrival must align to music eighth notes');
  for(const[at]of data.shapeSchedule.slice(1))assert(w.impact<=at-.85+1e-8||w.impact>=at+1.05-1e-8,'reserve a physically clear shape-change interval');
  assert(Math.abs(w.end-Math.min(Transition.clockAt(60,data.shapeSchedule),w.start+(w.r+w.thickness-26)/w.speed))<1e-8,'actors expire only behind the core');
  if(prev){
   const turn=Math.abs(delta((prev.safeSector+.5)*T/prev.sides,(w.safeSector+.5)*T/w.sides));
   const clear=prev.impact+(66+prev.thickness-59)/prev.speed;
   const enters=w.impact-(73/Math.cos(Math.PI/w.sides)-66)/w.speed;
   assert(enters-clear>=.20+Math.max(turn/(420*T/360),Math.ceil(turn/(T/w.sides)-1e-9)*.18)-1e-8,'real turning speed, reaction and spaced discrete presses must fit');
  }
 }
 for(const mode of [1,2,3]){
  const game=new Game(6,data);game.setControlMode(mode);
  assert.notEqual(game.tilt,0);
  let index=0,nextPress=0,priorTilt=game.tilt,changes=0;
  for(let frame=0;frame<3600;frame++){
   while(index<data.waves.length-1&&game.time>data.waves[index].impact+.27)index++;
   const wave=data.waves[index],target=(wave.safeSector+.5)*T/wave.sides;
   if(mode===1){const d=delta(game.angle,target);game.update(1/60,Math.max(-1,Math.min(1,d/(game.playerSpeed/60))))}
   else if(mode===3){
    if(game.sides===wave.sides&&game.time>=nextPress){game.selectSector(wave.safeSector);nextPress=game.time+.18;changes++}
    game.update(1/60,0);
   }else{
    if(game.sides===wave.sides&&game.time>=nextPress){
     const current=Math.floor(wrap(game.angle)/(T/game.sides)+1e-9);
     const forward=(wave.safeSector-current+game.sides)%game.sides,back=(current-wave.safeSector+game.sides)%game.sides;
     if(forward||back){game.stepSector(forward<=back?1:-1);nextPress=game.time+.18;changes++}
    }
    game.update(1/60,0);
   }
   assert(!game.dead,'unreachable mixed pattern: seed '+seed+', mode '+mode+', time '+game.time.toFixed(4)+', wave '+index);
   assert(Math.abs(game.tilt-priorTilt)<.03,'random tilt must change continuously');priorTilt=game.tilt;
   assert(Math.abs(game.tilt)<.4);
   if(frame%2===0&&game.morph<1){
    const free=Array.from({length:game.sides},(_,s)=>playerPoly((s+.5)*T/game.sides))
     .filter(p=>game.walls.every(w=>!intersect(p,wallVisualPoly(w,game.fromSides,game.sides,game.morph))));
    assert(free.length>=1,'a real discrete landing must remain open throughout each morph');
   }
  }
  assert(game.timelineEnded&&game.completed&&game.time===60);
  if(mode===2)assert(changes>10);
 }
}
assert.equal(seenTracks.size,3);assert.equal(seenShapes.size,3);assert.equal(seenSources.size,6);
assert.notDeepEqual(R.create(1).waves,R.create(2).waves);
assert.notDeepEqual(R.create(1).shapeSchedule,R.create(2).shapeSchedule);
console.log('PASS '+R.PATTERN_BANK.length+' original motifs, '+minimumWaves+'+ beat-aligned gates, random safe morphs/initial tilt; 100 seeds x all three songs x all three modes in 60s collision replays');
