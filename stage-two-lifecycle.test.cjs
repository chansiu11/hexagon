const assert=require('node:assert/strict');
const {Game,PLAYER_SPEED,PLAYER_SPEED_BY_LEVEL,observedWaveRadius}=require('./engine');
const stageOne=require('./assets/timelines/waves-stage-0.json');
const stageTwo=require('./assets/timelines/waves-stage-1.json');
const raw=require('./assets/timelines/rigid-stage-1.json');
const {buildObservedWaves}=require('./build_observed_waves.cjs');
assert.equal(stageOne.waves.length,561,'stage one remains unchanged');
assert(PLAYER_SPEED_BY_LEVEL.every(s=>s===PLAYER_SPEED),'all maps rotate at first-stage speed');
assert.deepEqual(buildObservedWaves(raw,1),stageTwo,'stage two is reproducible');
assert.equal(stageTwo.repair.stageTwoRepair.prematureAfter,0);
let repaired=0;
for(const w of stageTwo.waves){
 assert(Number.isFinite(w.r)&&w.end>w.start);
 if(w.end<stageTwo.duration-1/60)
  assert(w.r-w.speed*(w.end-w.start)+w.thickness<=50+1e-7,'visible pop: '+w.id);
 if(!w.stageTwoLifecycle)continue;
 repaired++;
 const boundary=w.stageTwoLifecycle.baselineEnd;
 const dt=Math.min(1/240,(w.end-boundary)/3);
 if(dt<=0)continue;
 const a=new Game(1,stageTwo),b=new Game(1,stageTwo);
 a.time=boundary-dt;a.sampleWalls();b.time=boundary+dt;b.sampleWalls();
 const before=a.walls.find(q=>q.waveId===w.id),after=b.walls.find(q=>q.waveId===w.id);
 assert(before&&after,'wall vanishes at prior cutoff '+w.id);
 assert(Math.abs(before.r-after.r-w.speed*2*dt)<1e-7,'wall jumps at prior cutoff '+w.id);
 assert.equal(before.thickness,after.thickness);
 assert.equal(before.sides,after.sides);
 assert(Math.abs(after.r-observedWaveRadius(w,boundary+dt))<1e-7);
}
assert(repaired>400,'stage-two damaged tracks receive lifecycle repair');
console.log('PASS stage-two no-vanishing walls, rigid motion, stage-one preservation and common orbit speed');
