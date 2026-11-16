'use strict';
// Task 3-1 tests intentionally use synthetic contours. They verify plumbing,
// NOT film fidelity. Real-video and browser acceptance tests remain pending.
const test=require('node:test');
const assert=require('node:assert/strict');
const source=require('../hexagonest-source.js');
const chronology=require('../hexagonest-chronology.js');
const fps=20;
function film(id,seconds=62){
 return {id,fps,gameRate:1,gameStartOffset:0,
  frames:Array.from({length:seconds*fps+1},(_,i)=>({
   angle:i*.001,zoom:1,sides:6,
   walls:[{id:'wall-'+Math.floor(i/18),points:[[180-i/20,0],[196-i/20,0],[196-i/20,20],[180-i/20,20]]},
    ...(i>=1180&&i<=1220?[{id:'crosses-60',points:[[80,0],[96,0],[96,20],[80,20]]}]:[])]
  }))};
}
function manifest(){
 return {recordings:{
  '1595':{sourceFile:'1595(2).mp4',path:'data/hexagonest-1595.b64',
   videoStart:0,videoEnd:62,sampleFps:20,gameRate:1,gameStartOffset:0},
  '1596':{sourceFile:'1596(2).mp4',path:'data/hexagonest-1596.b64',
   videoStart:11,videoEnd:73,sampleFps:20,gameRate:1,gameStartOffset:0}
 }};
}
function engine(){
 const registered=new Map();
 return {hasMap:id=>registered.has(id),
  getMap:id=>registered.get(id)||null,
  registerMap:(id,map)=>registered.set(id,map)};
}
test('source-only stage 3 installs only after both full 60+ recordings pass',()=>{
 const registry=engine(),recordings={'1595':film('1595'),'1596':film('1596')};
 const result=source.install({manifest:manifest(),recordings,engine:registry,chronology});
 assert.equal(result.ready,true);
 assert.equal(result.report.source1595.frameAt60,1200);
 assert.equal(result.report.source1596.frameAt60,1200);
 assert.ok(result.report.source1595.actorsContinuousAt60.includes('crosses-60'));
 assert.ok(registry.hasMap(2));
 assert.equal(registry.getMap(2).sourceStatus,'filmed-chronological-3-1-audited-not-randomized');
 assert.deepEqual(registry.getMap(2).walls,[]);
 assert.deepEqual(registry.getMap(2).shapes,[{at:0,sides:6}]);
 assert.notEqual(registry.getMap(2).replays['1595'].path,
  registry.getMap(2).replays['1596'].path);
});
test('absence of verified manifest leaves third map unavailable',async()=>{
 const registry=engine();
 const result=await source.prepare({fetcher:async()=>({ok:false,status:404}),engine:registry});
 assert.equal(result.ready,false);
 assert.equal(registry.hasMap(2),false);
});
test('a missing source, reused trace or unmeasured 60+ is rejected',()=>{
 const m=manifest();
 delete m.recordings['1596'];
 assert.throws(()=>source.checkManifest(m),/filename missing/);
 const r=manifest();
 r.recordings['1596'].path=r.recordings['1595'].path;
 assert.throws(()=>source.checkManifest(r),/aliased trace path/);
 const short={'1595':film('1595',55),'1596':film('1596')};
 assert.throws(()=>source.checkRecordings(short,source.checkManifest(manifest()),chronology),
  /source video range and decoded frame count disagree/);
});
test('source clocks must match the video and source IDs must remain separate',()=>{
 const records={'1595':film('1595'),'1596':film('1596')};
 records['1596'].gameRate=1.3;
 assert.throws(()=>source.checkRecordings(records,source.checkManifest(manifest()),chronology),
  /clock disagree/);
});
test('engine stage 1 and 2 definitions are not changed',()=>{
 const registry=engine(),one={sourceStatus:'stage1'},two={sourceStatus:'stage2'};
 registry.registerMap(0,one);registry.registerMap(1,two);
 source.install({manifest:manifest(),recordings:{'1595':film('1595'),'1596':film('1596')},
  engine:registry,chronology});
 assert.equal(registry.getMap(0),one);
 assert.equal(registry.getMap(1),two);
});
