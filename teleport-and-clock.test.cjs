const assert=require('node:assert/strict');
const {Game,PLAYER_SPEED,wrap}=require('./engine');
const PI=Math.PI;
for(let level=0;level<6;level++){
 const g=new Game(level);
 const original=g.angle;
 assert(g.teleportHalfTurn(),'first press must teleport on map '+level);
 assert(Math.abs(g.angle-wrap(original+PI))<1e-10,'flip must be exactly 180 degrees');
 assert.equal(g.teleport.from,original);
 assert.equal(g.teleport.to,g.angle);
 assert.equal(g.teleport.duration,.18);
 assert(!g.teleportHalfTurn(),'repeated keydown cannot bypass short effect');
 g.update(.10,0);
 assert(g.teleport&&g.teleport.age>0,'afterimage is time-driven');
 g.update(.1,0);
 assert.equal(g.teleport,null,'afterimage expires');
 assert(g.teleportHalfTurn(),'another press after cooldown must work');
 assert(Math.abs(g.angle-wrap(original))<1e-10,'double flip restores angle');
 assert.equal(g.playerSpeed,PLAYER_SPEED,'horizontal rotation rate must not change');
 g.dead=true;assert(!g.teleportHalfTurn(),'no teleport after death');
}
const one=require('./assets/timelines/waves-stage-0.json');
const g=new Game(0,one);
g.time=5;g.sampleWalls();
const originalWalls=g.walls.map(w=>[w.id,w.r]);
g.teleportHalfTurn();
assert.deepEqual(g.walls.map(w=>[w.id,w.r]),originalWalls,'flipping cannot reset or flash obstacles');
assert.equal(g.time,5,'teleport cannot skip time');
console.log('PASS 180-degree teleport, cooldown, afterimage, death and static walls across six maps');
