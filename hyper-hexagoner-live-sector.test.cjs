'use strict';
// Regression: even when the 60fps optical silhouette bank is downloaded,
// the ordinary fifth-stage game must never draw its bent outlines or
// core/HUD artifacts as lethal walls. All visible walls are one rigid
// polygon per recorded sector, with identical renderer/collision geometry.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const E=require('./engine.js');
const P=require('./stage-profiles.js');
const D=require('./hyper-hexagoner-910-data.js');
const FILMCAM=require('./hyper-hexagoner-filmed-camera-15fps.js');
let atlasReads=0;
const contaminatedAtlas={ready:true,WIDTH:576,HEIGHT:360,
 getFrame(){atlasReads++;return {index:10,rgb:[255,10,40],
  paths:[[288,180,290,181,560,182,290,183,286,181],
   [0,0,576,0,576,360,0,360]]};}};
const mod={exports:{}};
new Function('module','require',fs.readFileSync(__dirname+
 '/hyper-hexagoner-910.js','utf8'))(mod,name=>
 name==='./engine'?E:
 name==='./stage-profiles'?P:
 name==='./hyper-hexagoner-910-data'?D:
 name==='./hyper-hexagoner-wall-atlas'?contaminatedAtlas:FILMCAM);
const H=mod.exports;
const almost=(a,b)=>Math.abs(a-b)<1e-6;
const TAU=2*Math.PI,STEP=TAU/6;
let examined=0,wallsSeen=0;
for(const order of ['video','random']){
 const game=new H.HyperHexagonerGame(H.create(null,31415,90,{order}));
 for(let frame=0;frame<88*4;frame++){
  game.time=frame/4;
  game.sampleWalls();
  assert.equal(game.atlasActive,false,'raw optical geometry leaked into gameplay');
  assert.strictEqual(game.walls,game._collisionWalls);
  assert.equal(game.sides,6);
  const camera=game.recordedCamera;
  assert(camera&&camera.length===6);
  for(const wall of game.walls){
   const p=wall.points;
   assert.equal(p.length,4,'bent source outline leaked into panel geometry');
   assert.equal(wall.sides,6);
   assert(wall.sector>=0&&wall.sector<6);
   const a=wall.sector*STEP,b=(wall.sector+1)*STEP;
   const inner=Math.max(0,wall.r);
   const outer=Math.max(inner,wall.r+wall.thickness);
   const angles=[a,b,b,a],radii=[inner,inner,outer,outer];
   for(let i=0;i<4;i++){
    assert(almost(p[i][0],Math.cos(angles[i])*radii[i]));
    assert(almost(p[i][1],Math.sin(angles[i])*radii[i]));
    assert(p[i].every(Number.isFinite));
    // The background spokes AND these vertices use the SAME affine
    // camera. In screen space the actor still lies exactly on the spoke.
    const [x,y]=p[i];
    const screen=[camera[0]*x+camera[2]*y+camera[4],
      camera[1]*x+camera[3]*y+camera[5]];
    const expected=[camera[0]*Math.cos(angles[i])*radii[i]+
      camera[2]*Math.sin(angles[i])*radii[i]+camera[4],
      camera[1]*Math.cos(angles[i])*radii[i]+
      camera[3]*Math.sin(angles[i])*radii[i]+camera[5]];
    assert(Math.hypot(screen[0]-expected[0],screen[1]-expected[1])<1e-5);
   }
   wallsSeen++;
  }
  examined++;
 }
}
assert.equal(atlasReads,0,'normal gameplay attempted to read a corrupt outline');
assert(wallsSeen>100,'no actual source-observed sector walls');
const game=new H.HyperHexagonerGame(H.create(null,12,90,{order:'video'}));
game.time=2.3;game.sampleWalls();
const contact=game.walls.find(w=>w.r<=66&&w.r+w.thickness>=66);
assert(contact,'first filmed wave never reached the avatar orbit');
assert(game.hit((contact.sector+.5)*STEP),'rendered panel and lethal obstacle do not agree');
const clear=Array.from({length:360},(_,i)=>i*TAU/360).find(a=>!game.hit(a));
assert(clear!==undefined,'all corridors blocked in first wave');
console.log('PASS fifth-stage rigid spoke geometry: '+examined+' frames, '+
 wallsSeen+' camera-aligned quads, no center fragments, same hit geometry');
