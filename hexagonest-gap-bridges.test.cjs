'use strict';
const assert=require('node:assert/strict'),E=require('./hexagonest-mode'),V=require('./hexagonest-video');
let count=0;
for(let seed=1;seed<=100;seed++){
 const d=E.createRandomTimeline(seed,320);
 assert.deepEqual(d.waves,E.create(seed,320).waves,'source parts must remain untouched');
 const all=d.waves.concat(d.bridgeWaves).sort((a,b)=>a.impact-b.impact);
 for(let j=1;j<all.length;j++)assert(all[j].impact-all[j-1].impact<=E.MAX_VISIBLE_GAP+1e-6);
 for(const w of d.bridgeWaves){
  assert.equal(w.sectors.length,1,'minimally intrusive one-sector gap wall');
  const original=V.events[w.sourceEventIndex];
  assert.equal(w.pattern,E.rotateMask(original.mask,w.partRotation,false));
  const next=d.waves.findIndex(q=>q.impact>w.impact);
  assert(next>0,'a bridge stays between original walls');
  assert(!w.sectors.includes(d.waves[next-1].safeSector));
  assert(!w.sectors.includes(d.waves[next].safeSector));
 }
 count+=d.bridgeWaves.length;
 const g=new E.HexagonestGame(d);
 assert.equal(g._actors.length,d.waves.length+d.bridgeWaves.length,
  'gap fillers must be physical, rendered and collidable walls');
}
assert(count>500,'source gaps must be filled where necessary');
console.log('PASS Hexagonest safe gap fillers across 100 seeds: '+count);
