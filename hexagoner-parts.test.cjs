'use strict';
const assert=require('node:assert/strict'),X=require('./hexagoner-parts');
const source=require('./assets/timelines/waves-stage-1.json');
const parts=X.deriveParts(source);
assert.equal(parts.length,21,'the supplied Hexagoner segment yields 21 continuous dodge parts');
assert.equal(parts.reduce((sum,p)=>sum+p.waves.length,0),source.waves.length);
assert.equal(parts[0].id,0);
for(let seed=1;seed<=50;seed++){
 const d=X.create(source,seed,120);
 assert.equal(d.sourcePartCount,21);
 assert(d.partOrder.length>=30);
 assert.equal(d.partOrder[0].partId,0,'the observed initial dodge is replayed exactly');
 const groups=new Map();
 for(const w of d.waves){
  if(!groups.has(w.group))groups.set(w.group,[]);
  groups.get(w.group).push(w);
  const original=source.waves.find(p=>p.id===w.sourceWaveId);
  assert(original,'every replay wall is a source-video wall');
  assert.deepEqual(w.sectors,original.sectors.map(k=>(k+w.partRotation)%6));
  assert.equal(w.thickness,original.thickness);
  assert.equal(w.r,original.r);
  assert.equal(w.speed,original.speed);
  assert(Math.abs((w.end-w.start)-(original.end-original.start))<1e-8);
 }
 for(let i=0;i<d.partOrder.length;i++){
  const p=d.partOrder[i],original=parts[p.partId],walls=groups.get(i);
  assert.equal(walls.length,original.waves.length,'only entire dodge parts are played');
  assert.equal(p.played,walls.length);
  for(let j=0;j<walls.length;j++){
   assert.equal(walls[j].sourceWaveId,original.waves[j].id);
   assert.equal(walls[j].partRotation,p.rotation,'one fixed rotation per complete part');
   assert(Math.abs((walls[j].impact-walls[0].impact)-(original.waves[j].sourceImpact-original.sourceStart))<1e-7);
  }
 }
 for(let i=1;i<d.waves.length;i++)assert(d.waves[i].impact>=d.waves[i-1].impact);
 const g=new X.HexagonerGame(d);
 assert(g.hexagonerMode&&g.level===1&&g.sides===6);
 assert(g.walls.length>0);
 const first=g.walls.map(w=>[w.waveId,w.sector,w.r]);
 g.time=10;g.sampleWalls();
 assert(g.walls.length>0);
 g.time=0;g.sampleWalls();assert.deepEqual(g.walls.map(w=>[w.waveId,w.sector,w.r]),first);
}
assert.notDeepEqual(X.create(source,1,120).partOrder.map(x=>x.partId),
 X.create(source,2,120).partOrder.map(x=>x.partId),'every attempt shuffles differently');
assert.deepEqual(X.create(source,7,120).waves,X.create(source,7,120).waves);
console.log('PASS 50 HEXAGONER seeds, 21 uninterrupted video dodge parts, exact within-part wave geometry and safe source IDs');
