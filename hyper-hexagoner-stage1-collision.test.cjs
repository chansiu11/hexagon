'use strict';
// Recorded video cues first; then whole dodge phrases; task-1 collision.
const assert=require('node:assert/strict');
const E=require('./engine.js');
const H=require('./hyper-hexagoner-910.js');
const D=require('./hyper-hexagoner-910-data.js');
const TAU=Math.PI*2;
assert.equal(H.SOURCE_EVENTS.length,63);
assert.equal(H.PRE_PARTS.length,15);
assert.equal(H.POST_PARTS.length,7);
assert.equal(H.ALL_PARTS.length,23);
assert.equal(H.BRIDGE.events.length,5);
assert(H.BRIDGE.sourceStart<60&&H.BRIDGE.sourceEnd>60);
assert.equal(D.gameTimeAtVideo(488.31),88.04);
assert(Math.abs(D.gameTimeAtVideo(462)-60.59)<1e-8);
const video=H.create(null,123,90,{order:'video'});
assert.equal(video.waves.length,63);
for(let i=0;i<63;i++){
 const w=video.waves[i],e=D.EVENTS[i];
 assert.equal(w.sourceEventId,e.id);
 assert.equal(w.sourceGameSecond,e.time);
 assert.equal(w.sourceMask,e.mask);
 assert.equal(w.sourceWidth,e.width);
 assert.equal(w.special,null);
 assert.equal(w.partRotation,0);
 assert.equal(w.mirrored,false);
}
assert(video.waves.every(w=>w.sourceVideoSecond<488.1));
assert.deepEqual(H.ALL_PARTS.flatMap(p=>p.events.map(e=>e.id)),
 Array.from({length:63},(_,i)=>i));
const preOrders=new Set(),postOrders=new Set();
for(let seed=1;seed<=35;seed++){
 const d=H.create(null,seed,90);
 const first=d.partOrder.filter(p=>!p.repeatedAfterReference);
 assert.equal(d.waves.filter(w=>!w.repeatedAfterReference).length,63);
 assert.equal(first.length,23);
 assert.equal(first[15].id,H.BRIDGE.id);
 assert.equal(first[15].at,H.BRIDGE.sourceStart);
 assert.equal(new Set(first.slice(0,15).map(p=>p.id)).size,15);
 assert.equal(new Set(first.slice(16).map(p=>p.id)).size,7);
 for(let i=0;i<22;i++)assert(first[i].at+first[i].sourceEnd-first[i].sourceStart
  <=first[i+1].at-.26,'no part overlap');
 assert(d.waves.every(w=>w.partRotation===0&&!w.mirrored&&w.special===null));
 preOrders.add(first.slice(0,15).map(p=>p.id).join('|'));
 postOrders.add(first.slice(16).map(p=>p.id).join('|'));
}
assert(preOrders.size>=20&&postOrders.size>=10);
assert.equal(H.PLAYER_SPEED,540*Math.PI/180);
function game(){return new H.HyperHexagonerGame(video);}
const poly=E.wallVisualPoly({sector:0,sides:6,r:45,thickness:45});
const wall={id:'sector-0',sector:0,sides:6,r:45,thickness:45,
 points:poly,collapsed:false};
const one=game();one.walls=[wall];one.angle=Math.PI/6;
assert.equal(one.hit(),wall);
assert.equal(one.hit(Math.PI/2),null);
one.die(wall);
assert.equal(one.death.wallId,wall.id);
assert.deepEqual(one.death.wall,poly);
assert.deepEqual(one.death.contact,E.playerHitPoint(one.angle));
const frame=JSON.stringify(one.deathCamera);
one.time=8;one.sampleWalls();
assert.equal(JSON.stringify(one.deathCamera),frame);
const two=game();two.setControlMode(2);
two.angle=two.sectorAngle(1);two.walls=[wall];
assert(two.stepSector(-1));assert(two.dead);
assert.equal(two.death.wallId,wall.id);
const three=game();three.setControlMode(3);
three.angle=three.sectorAngle(2);three.walls=[wall];
assert(three.selectSector(0));assert(three.dead);
assert.equal(three.death.wallId,wall.id);
const lateral=game();lateral.setControlMode(1);
lateral.angle=1.08;
lateral.sampleWalls=function(){this.walls=[wall];this.recordedCamera=[1,0,0,1,0,0];};
lateral.walls=[wall];
lateral.update(1/60,-1);
assert.equal(lateral.dead,false);
assert(lateral.angle>=TAU/6-0.0002);
assert.equal(lateral.hit(),null);
console.log('PASS source 63, 23 video-part shuffles, modes 1/2/3 point hits, lateral contact and frozen death');
