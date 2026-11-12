'use strict';
const assert=require('node:assert/strict');
const D=require('./hyper-hexagoner-910-data');
const TAU=2*Math.PI;
const mockEngine={
 PLAYER_SPEED_BY_LEVEL:[7,7,9,7,7,9].map(n=>n*TAU/360*60),
 Game:class {constructor(level,timeline){this.level=level;this.timeline=timeline;this.time=0;this.angle=4.71238898;this.walls=[];this.rotation=0;this.rotationSpeed=0;this.zoom=1;this.tilt=0;this.playerLean=0;this.sides=6;this.fromSides=6;this.morph=1;this.controlMode=1;this.dead=false;this.completed=false;this.timelineEnded=false;this.teleportCooldown=0;}
 stepSector(){return false}selectSector(){return false}},
 wrap:a=>(a%TAU+TAU)%TAU,
 playerHitPoint:a=>[Math.cos(a)*66,Math.sin(a)*66],
 pointInPolygon:(p,poly)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&(p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]))hit=!hit;}return hit},
 wallVisualPoly:w=>{const a=w.sector*TAU/w.sides,b=(w.sector+1)*TAU/w.sides;return [[Math.cos(a)*w.r,Math.sin(a)*w.r],[Math.cos(b)*w.r,Math.sin(b)*w.r],[Math.cos(b)*(w.r+w.thickness),Math.sin(b)*(w.r+w.thickness)],[Math.cos(a)*(w.r+w.thickness),Math.sin(a)*(w.r+w.thickness)]];}
};
const mockProfiles=Array.from({length:6},()=>({camera:{start:0,sampleRate:15,frames:Array.from({length:900},(_,i)=>[Math.cos(i/15*.2),Math.sin(i/15*.2),-Math.sin(i/15*.2),Math.cos(i/15*.2),0,0])}}));
const {createRequire}=require('node:module');const fs=require('node:fs');const vm=require('node:vm');
const src=fs.readFileSync(__dirname+'/hyper-hexagoner-910.js','utf8');const H={exports:{}};
new Function('module','require',src)(H,p=>p==='./engine'?mockEngine:p==='./stage-profiles'?mockProfiles:p==='./hyper-hexagoner-910-data'?D:null);
const M=H.exports;
assert.equal(D.EVENTS.length,64);assert.equal(M.SOURCE_EVENTS.length,64);assert.equal(M.BRIDGE.events.length,5);
assert.equal(M.BRIDGE.sourceStart,57.55);assert.equal(M.BRIDGE.sourceEnd,62.33);
const video=M.create(null,25,90,{order:'video'});
assert.equal(video.waves.length,64);assert.deepEqual(video.waves.map(w=>w.sourceGameSecond),D.EVENTS.map(e=>e.time));
assert(video.partOrder.every(p=>!p.rotation&&!p.mirrored));
assert(video.partOrder.filter(p=>p.anchored).length===1);
assert.deepEqual(video.waves.map(w=>w.sectors),M.SOURCE_EVENTS.map(e=>e.sectors));
assert(video.waves.find(w=>w.sourceGameSecond===60.16).start<60);
const parts={pre:M.PRE_PARTS.length,bridge:M.BRIDGE.events.length,post:M.POST_PARTS.length};
let orders=[];
for(let s of [1,2,3,4,7,11,12,2026,2027,81201]){
 const d=M.create(null,s,115);assert(d.waves.length>=64);assert(d.partOrder.filter(p=>p.anchored).length===1);
 orders.push(d.partOrder.slice(0,parts.pre).map(p=>p.id).join('-'));
 const g=new M.HyperHexagonerGame(d);
 for(let t=0;t<=87;t+=.2){g.time=t;g.sampleWalls();assert(g.walls.every(w=>w.points.every(p=>p.every(Number.isFinite))));}
}
assert.notEqual(orders[0],orders[1]);
assert.equal(M.PLAYER_SPEED,mockEngine.PLAYER_SPEED_BY_LEVEL[4]);
for(let t=0;t<88;t+=.033){const c=M.cameraAt(t);assert(c.length===6&&c.every(Number.isFinite));}
console.log('PASS tasks 9/10',JSON.stringify(parts),'video events 64, safe sample geometry, 10 shuffled seeds');
console.log('route source',M.hasCoarseRoute(video.waves),'fallbacks',Array.from({length:8},(_,i)=>M.create(null,i+1,115).routeFallback||'none'));