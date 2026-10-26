const assert=require('node:assert/strict'),fs=require('node:fs');
const {Game,polygonOverlap,intersect,wallPoly,playerPoly}=require('./engine');
assert(intersect(playerPoly(.5),wallPoly(60,0)));
assert(!intersect(playerPoly(.5),wallPoly(150,0)));
const square=(x,y,r)=>[[x-r,y-r],[x+r,y-r],[x+r,y+r],[x-r,y+r]];
assert(polygonOverlap(square(0,0,1),square(0,0,10)));
assert(!polygonOverlap(square(0,0,1),square(0,0,10),[square(0,0,5)]),'hole is safe');
assert(polygonOverlap(square(5,0,1),square(0,0,10),[square(0,0,5)]),'hole edge collides');
const concave=[[0,0],[10,0],[10,3],[3,3],[3,10],[0,10]];
assert(!polygonOverlap(square(7,7,1),concave),'concave gap remains open');
assert(polygonOverlap(square(2,7,1),concave));
let a=new Game(),b=new Game();
for(let i=0;i<60;i++)a.update(1/60,1);
for(let i=0;i<120;i++)b.update(1/120,1);
assert(Math.abs(a.angle-b.angle)<1e-9);
const oldRandom=Math.random;Math.random=()=>{throw new Error('random wall generation is forbidden');};
for(let level=0;level<6;level++){
 const d=JSON.parse(fs.readFileSync(`${__dirname}/assets/timelines/stage-${level}.json`));
 assert.equal(d.frames.length,3600);assert.equal(d.sampleRate,60);
 for(let angle=0;angle<24;angle++){
  const start=new Game(level,d);start.angle=angle*Math.PI/12;
  for(let i=0;i<60;i++)start.update(1/60);
  assert(!start.dead,'entrance core must never be a wall: '+level+' angle '+angle);
 }
 for(const f of d.frames){assert.equal(f.camera.length,6);assert(f.camera.every(Number.isFinite));
  for(const [id,points,holes] of f.walls){assert(Number.isInteger(id));for(const ring of [points,...holes]){assert(ring.length>=3);assert(ring.flat().every(Number.isFinite));}}
 }
 for(const time of [1,4,10,20,27,45,59]){
  a=new Game(level,d);b=new Game(level,d);a.time=b.time=time;a.angle=0;b.angle=2;
  a.sampleWalls();b.sampleWalls();assert.deepEqual(a.walls,b.walls,'walls cannot depend on input');
  assert.deepEqual(a.walls.map(w=>[w.id,w.points,w.holes]),d.frames[time*60].walls);
 }
 a=new Game(level,d);a.time=59.999;a.update(.01);assert(a.timelineEnded);assert.equal(a.time,60);
 a.update(5);assert.equal(a.time,60,'never synthesize walls after coverage');
 a=new Game(level,d);for(let i=0;i<600&&!a.dead;i++)a.update(1/60);
 assert(a.dead,'stationary player must meet recorded walls');
 console.log('PASS stage',level,'3600 frames, input-independent walls, collision and bounded coverage');
}
Math.random=oldRandom;
console.log('PASS concave and hole collision, frame-rate independence, no random calls');
