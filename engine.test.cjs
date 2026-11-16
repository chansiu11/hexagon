'use strict';
const assert=require('node:assert/strict'),test=require('node:test');
const {Game,levels,registerPattern,hasPattern,polyForWall,insidePoly,ORBIT_SPEED}=require('./engine.js');
test('six map slots, seventh and direct routes removed',()=>{
 assert.equal(levels.length,6);
 assert.deepEqual(levels.slice(0,3).map(x=>x[0]),['HEXAGON','HEXAGONER','HEXAGONEST']);
 assert.throws(()=>new Game(6),RangeError);assert.throws(()=>registerPattern(6,()=>({walls:[]})),RangeError);
});
test('unimplemented maps never fall back to another pattern',()=>{
 for(let n=1;n<6;n++){assert.equal(hasPattern(n),false);assert.throws(()=>new Game(n),/no rebuilt wall pattern/)}
});
test('first frame safe; controls and clock progress',()=>{
 const g=new Game(0);assert.equal(g.dead,false);g.update(1/60,1);assert.equal(g.dead,false);
 assert.ok(Math.abs(g.angle-((Math.PI*1.5+ORBIT_SPEED/60)%(Math.PI*2)))<1e-5);
});
test('test-only wall moves inward and collides with its rendered polygon',()=>{
 const g=new Game(0,{walls:[{at:0,radius:180,speed:120,thickness:35,sector:0,sides:6}]});
 g.angle=Math.PI/6;g.update(.2);assert.ok(g.walls[0].inner<180);assert.equal(g.dead,false);
 for(let i=0;i<90&&!g.dead;i++)g.update(1/60);
 assert.equal(g.dead,true);
 assert.equal(insidePoly(66*Math.cos(g.angle),66*Math.sin(g.angle),polyForWall(g.walls[0])),true);
 const t=g.time;g.update(1,1);assert.equal(g.time,t);
});
test('empty lane survives; active actor identity remains stable',()=>{
 const g=new Game(0,{walls:[{at:.1,radius:160,speed:90,thickness:35,sector:2,sides:6}]});
 g.angle=Math.PI/6;g.update(.15);const actor=g.walls[0];assert.ok(actor);
 g.update(.2);assert.strictEqual(g.walls[0],actor);
 for(let i=0;i<90;i++)g.update(1/60);assert.equal(g.dead,false);
});
test('mode 2 and mode 3 work and reject missing sectors',()=>{
 const g=new Game(0);g.setControlMode(2);const a=g.angle;
 g.armDoubleStep();g.stepSector(1);assert.ok(Math.abs(g.angle-a)>1);
 const b=g.angle;g.stepSector(1);assert.ok(Math.abs(g.angle-b)<1.2);
 g.setControlMode(3);assert.equal(g.selectSector(0),true);
 assert.equal(g.selectSector(99),false);assert.equal(g.sectorForKey('Key'+g.directKeys[0]),0);
});
test('bad wall fields are rejected',()=>{
 assert.throws(()=>new Game(0,{walls:[{at:0,radius:100,speed:-2,thickness:10,sector:0}]}),/Invalid wall/);
 assert.throws(()=>new Game(0,{walls:[{at:0,radius:100,speed:2,thickness:10,sector:6}]}),/Invalid wall lane/);
});
