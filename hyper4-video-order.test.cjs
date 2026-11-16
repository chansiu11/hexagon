'use strict';
const assert=require('node:assert/strict');
const O=require('./hyper4-filmed-observations.js');
const H=require('./hyper4-video-order.js');

for(const [key,total,beforeCount,afterCount] of [['1595',98,62,36],['1596',107,63,44]]){
 const rows=O.events(key), data=H.create(key), info=O.RUNS[key];
 assert.equal(rows.length,total,'optical peak count '+key);
 assert.equal(rows.filter(e=>e.time<60).length,beforeCount);
 assert.equal(rows.filter(e=>e.time>=60).length,afterCount);
 assert.equal(data.events.length,total);
 assert.equal(data.duration,info.duration);
 assert.equal(data.sourceVideoStart,info.videoStart);
 for(let i=1;i<rows.length;i++)assert.ok(rows[i].time>rows[i-1].time,'non-increasing wall source index '+i);
 for(const e of rows){
  assert.ok(e.screenMask>0&&e.screenMask<63,'screen mask must contain a gap');
  assert.ok(e.time>=0&&e.time<=data.duration+.01);
 }
 const game=new H.HyperGame(data);
 assert.equal(game.dead,false,'no start-frame death '+key);
 assert.equal(game.time,0);
 assert.equal(game.walls.length,0,'no phantom wall at frame zero '+key);
 for(const at of [0,.1,1,2.5,10,30,59.9,60,60.1,80,Math.min(90,data.duration)]){
  game.time=at;game.sampleWalls();
  assert.ok(game.walls.every(w=>w.points.length===4));
  assert.ok(game.walls.every(w=>w.points.flat().every(Number.isFinite)));
  assert.ok(game.walls.every(w=>w.r+w.thickness>=H.ORBIT-60));
 }
 // Optical actors are owned by their source event; 60s cannot reset them.
 const left=new H.HyperGame(data);left.time=59.99;left.sampleWalls();
 const idsBefore=new Set(left.walls.map(w=>w.waveId));
 left.time=60.01;left.sampleWalls();
 const idsAfter=new Set(left.walls.map(w=>w.waveId));
 assert.ok([...idsBefore].some(id=>idsAfter.has(id)),'no persistent 60s wall '+key);
 // The data should not silently change source in the middle of a run.
 assert.equal(left.videoOrderSource,key);
}
console.log('hyper4 task4-1: validated two sequential optical timelines, era split, wall geometry and 60s continuity');
