const assert=require('node:assert/strict');
const {Game,PLAYER_SPEED,PLAYER_SPEED_BY_LEVEL,ORIGINAL_TICK_RATE,ORIGINAL_ARROW_DEGREES_PER_TICK,wrap}=require('./engine');
const expectedPerTick=[7,7,9,7,7,9];
assert.equal(ORIGINAL_TICK_RATE,60);
assert.deepEqual(ORIGINAL_ARROW_DEGREES_PER_TICK,expectedPerTick);
assert(Math.abs(PLAYER_SPEED-7*Math.PI/3)<1e-12);
assert.equal(PLAYER_SPEED_BY_LEVEL.length,6);
for(let level=0;level<6;level++){
 assert(Math.abs(PLAYER_SPEED_BY_LEVEL[level]-expectedPerTick[0]*Math.PI/3)<1e-12);
 const originalDegreesForOneFrame=PLAYER_SPEED_BY_LEVEL[level]/ORIGINAL_TICK_RATE*180/Math.PI;
 assert(Math.abs(originalDegreesForOneFrame-expectedPerTick[0])<1e-10,'all six maps use stage one speed');
}

const initial=-Math.PI/2;
for(let level=0;level<6;level++){
 const speed=PLAYER_SPEED_BY_LEVEL[level];
 const right=new Game(level),left=new Game(level),fine=new Game(level),still=new Game(level);
 right.update(.1,1);
 left.update(.1,-1);
 for(let frame=0;frame<24;frame++)fine.update(1/240,1);
 still.update(.1,0);
 assert(Math.abs(right.angle-wrap(initial+speed*.1))<1e-9,'right orbit speed, stage '+level);
 assert(Math.abs(left.angle-wrap(initial-speed*.1))<1e-9,'left orbit speed, stage '+level);
 assert(Math.abs(fine.angle-right.angle)<1e-9,'frame-rate independence, stage '+level);
 assert(Math.abs(still.angle-wrap(initial))<1e-9,'neutral input must not move player');
}
assert(PLAYER_SPEED_BY_LEVEL.every(speed=>speed===PLAYER_SPEED));
console.log('PASS stage-one 7-degree/tick movement on all stages, symmetric and frame-independent');
