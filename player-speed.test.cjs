const assert=require('node:assert/strict');
const {Game,PLAYER_SPEED,PLAYER_SPEED_BY_LEVEL,wrap}=require('./engine');
assert.equal(PLAYER_SPEED,8.2);
assert.deepEqual(PLAYER_SPEED_BY_LEVEL,[8.2,8.2,10.2,9.2,9.2,11.2]);
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
assert(PLAYER_SPEED_BY_LEVEL[2]>PLAYER_SPEED_BY_LEVEL[0]);
console.log('PASS increased symmetric player movement, stage difficulty speeds and frame independence');
