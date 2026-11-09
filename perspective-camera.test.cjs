'use strict';
const assert=require('node:assert/strict');
const P=require('./perspective-camera');
const center=[480,300],width=960,height=600;
const zero=P.parameters({tilt:0});
assert.equal(zero.strength,0);
for(const game of [
 {level:0,tilt:.24},{level:1,tilt:-.24},
 {level:2,hexagonestMode:true,time:80,tilt:.16},
 {level:3,tilt:.24},{level:4,tilt:-.24},
 {level:5,tilt:.24},{level:6,tilt:-.24},
 {level:0,hardMode:true,tilt:.60}]){
 const p=P.parameters(game);
 assert(p.strength>.1,'projective camera activates for stage '+game.level);
 assert(p.compression>=.9,'perspective must keep the core nearly round');
 const projected=P.forwardPixel(...center,width,height,p);
 assert(Math.hypot(projected[0]-center[0],projected[1]-center[1])<1e-8,
  'projection must leave the center of every stage fixed');
 const outer=P.forwardPixel(480,550,width,height,p);
 const distant=P.forwardPixel(480,50,width,height,p);
 assert(Math.abs(outer[1]-300)!==Math.abs(distant[1]-300),
  'near/far wall bands must have different projected scales');
 assert(Math.abs(p.beta)>.02&&Number.isFinite(outer[0])&&Number.isFinite(outer[1]));
}
const mono=P.parameters({hexagonestMode:true,time:120,tilt:.18});
assert.equal(mono.strength,0,'the source video mono era uses a static camera');
for(const t of [-.24,-.12,0,.12,.24]){
 const p=P.parameters({tilt:t});
 for(const [x,y] of [[0,0],[960,0],[0,600],[960,600],[480,300]]){
  const q=P.forwardPixel(x,y,width,height,p);
  assert(q.every(Number.isFinite),'finite projection across full viewport');
 }
}
assert.equal(P.SOURCE_MARGIN,.24);
console.log('PASS seven game stages and HARD use center-preserving pinhole perspective, not affine pancake flattening');
