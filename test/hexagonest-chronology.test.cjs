'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {audit,auditBoth}=require('../hexagonest-chronology.js');
function makeFilm(seconds=62){
 const fps=20,frames=Array.from({length:seconds*fps+1},(_,i)=>{
  const t=i/fps;
  const normal={id:'wave-'+Math.floor(t),points:[[190-t,0],[204-t,0],[204-t,12],[190-t,12]]};
  const crossing=t>=59.5&&t<=60.5?
   [{id:'cross-60',points:[[80,0],[96,0],[96,12],[80,12]]}]:[];
  return {angle:.1*t,zoom:1,sides:t<30?6:5,walls:[normal,...crossing]};
 });
 return {fps,gameRate:1,gameStartOffset:0,frames};
}
test('the two films are audited independently and the 60s wall is not recreated',()=>{
 const a=makeFilm(),b=makeFilm();
 b.frames[0]={...b.frames[0],walls:[{id:'independent-1596',
  points:[[170,0],[190,0],[190,10],[170,10]]}]};
 const report=auditBoth({'1595':a,'1596':b});
 assert.equal(report.source1595.frameAt60,1200);
 assert.equal(report.source1596.frameAt60,1200);
 assert.ok(report.source1595.actorsContinuousAt60.includes('cross-60'));
 assert.ok(report.source1596.actorsContinuousAt60.includes('cross-60'));
 assert.notEqual(report.source1595.actorIds,report.source1596.actorIds);
 assert.ok(report.source1595.birthsBefore60>0);
 assert.ok(report.source1595.birthsAfter60>0);
 assert.ok(report.source1595.maxArrivalGapBefore60<=1);
 assert.ok(report.source1595.maxArrivalGapAfter60<=1);
});
test('missing or incomplete reference video is rejected rather than inventing walls',()=>{
 assert.throws(()=>auditBoth({'1595':makeFilm()}),/both source recordings/);
 assert.throws(()=>audit(makeFilm(40),'1595'),/60s\+ footage is missing/);
 const late=makeFilm();
 late.gameStartOffset=2;
 assert.throws(()=>audit(late,'1595'),/not aligned/);
});
test('frame geometry and tracked IDs are validated',()=>{
 const bad=makeFilm();bad.frames[500].walls[0].id='';
 assert.throws(()=>audit(bad,'1595'),/untracked wall/);
});
