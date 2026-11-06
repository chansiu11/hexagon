'use strict';
const assert=require('node:assert/strict'),D=require('./direct-controls'),{Game}=require('./engine');
assert.equal(D.POOL,'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
const seen=new Set();
for(let seed=1;seed<=500;seed++){
 const keys=D.createKeys(require('./random-waves').makeRng(seed));
 assert.equal(keys.length,6);assert.equal(new Set(keys).size,6);
 for(const key of keys){assert(D.POOL.includes(key));seen.add(key)}
}
assert.equal(seen.size,36);
for(let start=0;start<36;start+=6){
 const keys=[...D.POOL.slice(start,start+6)];
 for(let i=0;i<6;i++){
  const code=/[A-Z]/.test(keys[i])?'Key'+keys[i]:'Digit'+keys[i];
  assert.equal(D.sectorForCode(keys,code,6),i);
  if(i>=4)assert.equal(D.sectorForCode(keys,code,4),-1);
 }
}
for(const sides of [4,5,6]){
 const g=new Game();g.sides=sides;g.setControlMode(3);
 for(let i=0;i<sides;i++){assert(g.selectSector(i));assert(Math.abs(g.angle-(i+.5)*Math.PI*2/sides)<1e-9)}
 const angle=g.angle;assert(!g.selectSector(sides));assert(!g.selectSector(-1));assert.equal(g.angle,angle);
 assert(!g.teleportHalfTurn());assert(!g.armDoubleStep());assert(!g.stepSector(1));
}
const hit=new Game();hit.setControlMode(3);hit.walls=[{r:60,thickness:35,sides:6,sector:2}];
assert(hit.selectSector(2));assert(hit.dead,'selecting a blocked landing must collide immediately');
const safe=new Game();safe.setControlMode(3);safe.walls=[{r:60,thickness:35,sides:6,sector:2}];
assert(safe.selectSector(5));assert(!safe.dead,'an instantaneous selection tests the landing, not the skipped arc');
console.log('PASS all 36 independent direct keys, unique bindings, 4/5/6-sided slots and real landing collision');
