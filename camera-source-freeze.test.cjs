'use strict';
const assert=require('node:assert/strict');
const H=require('./hexagon-beat'),E=require('./hexagonest-beat-early');
const M=require('./hexagonest-beat-mono'),C=require('./hexagonest-camera');
const Hard=require('./hard-mode'),Hexest=require('./hexagonest-mode');
const Death=require('./hard-feedback');
const wall={id:'camera-test',renderPoly:[[0,0],[1,0],[1,1],[0,1]]};
// The original samples are displayed at their measured video frame boundary;
// no cross-frame radius lerp softens the kick.
for(const [f,t,dt] of [[H.sourceRadius,12,.015],[E.radiusAt,30,.015],
 [M.radiusAt,145,.04]])assert.equal(f(t),f(t+dt));
assert(C.rotationAt(5.28)<C.rotationAt(5.27),'source camera is still spinning negative');
assert(C.rotationAt(5.52)>C.rotationAt(5.51),'reversal switches to positive angular speed');
for(const t of [5.2,5.6,10.4,10.8,21.6,22,63.6,64,110,111])
 assert.equal(C.rotationAt(t),C.at(t).rotation,'reference angular sample kept');
const g=new Hard.HardGame({duration:30,shapeSchedule:[[0,6]],groups:[{at:0,rate:1,tilt:0}],waves:[]});
g.time=3;g.rotation=1.14;g.zoom=1.08;g.tilt=.2;
g.die(wall);const snapshot={...g.deathCamera};
assert(g.dead&&g.deathCamera&&g.deathCamera.time===g.time);
for(const age of [0,.02,.2,.7,.95,1.03,1.1,1.5]){
 const view=Death.deathView(g,age);
 assert.equal(view.rotation,snapshot.rotation);
 if(age<=.933333)assert.equal(view.scale,1);
 if(age>1&&age<1.2)assert(view.scale>1);
}
g.update(.3);assert.deepEqual(g.deathCamera,snapshot);
const timeline={...Hexest.create(37,12),duration:300,waves:[],
 groups:[{at:0,rate:0,tilt:0}],sourceAligned:true};
const x=new Hexest.HexagonestGame(timeline);
x.time=5.2;x.rotation=999;x.zoom=999;x.die(wall);
const source=C.at(x.time+C.OFFSET);
assert.equal(x.deathCamera.rotation,source.rotation);
assert.equal(x.deathCamera.zoom,source.zoom);
const previous={...x.deathCamera};x.update(.15);
assert.deepEqual(x.deathCamera,previous);
assert.equal(Death.deathView(x,.4).rotation,previous.rotation);
assert.equal(Death.deathView(x,.4).scale,1);
console.log('PASS frame-held source pulses, source reversal, frame-exact death freeze and separate zoom (HEXAGON/HEXAGONEST).');
