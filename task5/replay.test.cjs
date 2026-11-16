'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const E=require('./rebuilt-engine.js');
const S=require('./hyper-hexagoner-order.js');
test('new source provider is registered only for map 5',()=>{
 assert.equal(E.hasPattern(4),true);
 for(const k of [1,2,3,5])assert.equal(E.hasPattern(k),false);
});
test('both videos have independent source-order cues before and after 60s',()=>{
 const expected=[[330,170,160],[306,168,138]];
 S.sources.forEach((s,i)=>{
  assert.deepEqual([s.cues.length,s.pre60,s.post60],expected[i]);
  assert.ok(s.cues[0].time<=2&&s.cues.at(-1).time>85);
  for(let j=1;j<s.cues.length;j++)assert.ok(s.cues[j].time>=s.cues[j-1].time);
  for(const c of s.cues)assert.ok(c.mask>0&&c.mask<64&&c.duration>0);
 });
 assert.notDeepEqual(S.sources[0].cues,S.sources[1].cues);
});
test('source timelines generate legal deterministic actors without resetting at 60s',()=>{
 for(let source=0;source<2;source++){
  const a=S.timeline(source);
  assert.deepEqual(a,S.timeline(source));
  assert.ok(a.walls.length>600);
  assert.ok(a.walls.some(w=>w.at<60)&&a.walls.some(w=>w.at>=60));
  assert.equal(a.shapeEvents.length,0);
  assert.doesNotThrow(()=>E.validateTimeline(a));
  for(const w of a.walls)assert.ok(w.at>=0&&w.radius>=1&&w.thickness>=12&&w.sector>=0&&w.sector<6);
  const g=new E.Game(4,a);
  for(let n=0;n<18;n++)g.update(1/240,0);
  assert.equal(g.dead,false,'early start should not instantly die');
  g.checkCollision=()=>false;
  let below=false,above=false;
  while(g.time<Math.min(S.sources[source].duration,95)){
   g.update(1/30,0);
   if(g.time>=59.9&&g.time<60)below=true;
   if(g.time>=60&&g.time<60.2)above=true;
  }
  assert.ok(below&&above&&g.time>=85);
  assert.ok(g.nextWall>=a.walls.length-200);
  for(const w of g.snapshot().walls)assert.deepEqual(w.polygon,E.polyForWall(w));
 }
});
test('switching video sources does not merge or reorder them',()=>{
 S.register(1);
 const b=new E.Game(4);
 assert.match(b.timeline.provenance,/:B:/);
 S.register(0);
 const a=new E.Game(4);
 assert.match(a.timeline.provenance,/:A:/);
 assert.notEqual(a.timeline.walls.length,b.timeline.walls.length);
});
