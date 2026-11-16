'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const engine=require('../engine.js');
global.HexEngine=engine;
require('../stages/hexagon.js');
const make=(walls,shapes=[{at:0,sides:6}])=>engine.registerMap(0,{sourceStatus:'test-only',walls,shapes});
const wall=(patch={})=>({id:'w1',spawnAt:0,radius:150,speed:120,thickness:32,sides:6,blocked:[0],...patch});
test('six stage numbers survive; seventh map and random route are rejected',()=>{
 assert.equal(engine.LEVELS.length,6);assert.equal(engine.hasMap(6),false);
 assert.throws(()=>new engine.ArenaGame(6),/removed/);
 assert.throws(()=>engine.registerMap(6,{walls:[],shapes:[{at:0,sides:6}]}),/0 through 5/);
 assert.equal(engine.hasMap(0),true);
 assert.equal(engine.hasMap(1),false);
 assert.throws(()=>new engine.ArenaGame(1),/MAP_UNAVAILABLE/);
 const index=fs.readFileSync('index.html','utf8');
 for(const legacy of ['random-waves.js','stage-profiles.js','pattern-bank.js','hard-mode.js'])
  assert.ok(!index.includes(legacy),'unreachable old play dependency '+legacy);
});
test('first frame is safe, walls descend continuously and share polygons with collision',()=>{
 make([wall()]);
 const g=new engine.ArenaGame(0);
 assert.equal(g.dead,false);assert.equal(g.time,0);
 g.sampleWalls();assert.equal(g.walls.length,1);
 const first=g.walls[0].r;
 g.update(.3);
 assert.equal(g.dead,false);
 assert.ok(g.walls[0].r<first);
 const poly=g.walls[0].points;
 assert.deepEqual(poly,engine.panelPolygon(g.walls[0].r,32,6,0));
 g.update(.5);
 assert.equal(g.dead,true,'obstructed lane reaches the player');
 assert.equal(g.death.wallId,'w1:0');
 const atDeath=g.time,actors=g.walls.map(w=>w.r);
 g.update(3,1);
 assert.equal(g.time,atDeath);assert.deepEqual(g.walls.map(w=>w.r),actors);
});
test('safe lane does not trigger phantom collision',()=>{
 make([wall()]);
 const g=new engine.ArenaGame(0);g.angle=Math.PI;
 g.update(1.2);assert.equal(g.dead,false);
 assert.ok(g.walls.length>=0);
});
test('step input, double-step activation and direct sector work independently',()=>{
 make([]);const g=new engine.ArenaGame(0);g.setControlMode(2);
 const s=g.currentSector();
 assert.ok(g.stepSector(1));assert.equal(g.currentSector(),(s+1)%6);
 g.armDoubleStep();g.stepSector(-1);assert.equal(g.currentSector(),(s+5)%6);
 g.setControlMode(3);
 assert.equal(g.selectSector(5),true);assert.equal(g.currentSector(),5);
 assert.equal(g.selectSector(6),false);
});
test('wall actors persist across 60 seconds without duplication or teleportation',()=>{
 make([wall({id:'boundary',spawnAt:59.8,radius:500,speed:80,thickness:35,blocked:[2]})]);
 const g=new engine.ArenaGame(0);
 g.update(59.9);
 assert.equal(g.walls.length,1);
 const id=g.walls[0].id,r=g.walls[0].r;
 g.update(.25);
 assert.equal(g.walls.length,1);
 assert.equal(g.walls[0].id,id);
 assert.ok(g.walls[0].r<r);
 assert.ok(Math.abs(g.walls[0].r-(500-80*(g.time-59.8)))<.01);
});
test('pause/resume and restart reset only new runs',()=>{
 make([wall()]);
 const g=new engine.ArenaGame(0);g.update(.2);g.pause();const time=g.time;
 g.update(2);assert.equal(g.time,time);g.resume();g.update(.1);assert.ok(g.time>time);
 const r=g.reset();assert.equal(r.time,0);assert.equal(r.dead,false);
});

test('outgoing walls never invert through the center or create invalid panels',()=>{
 const points=engine.panelPolygon(-8,32,6,0);
 assert.ok(points.every(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)));
 assert.ok(Math.hypot(...points[0])>=19.99);
 assert.ok(Math.hypot(...points[2])>=Math.hypot(...points[0]));
});
