'use strict';
/* Task 3/4 only. Run: node hexagoner-camera-smooth.test.cjs
 * Reference video 1557(8).mp4, 119–224s:
 * bass onsets ~0.445s apart; ring radius +10% on kick and -9% at +0.2s.
 * New camera must be a uniform rotation + music-onset zoom, not a shear.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const H=require('./hexagoner-video8');
const E=require('./engine');
const matrixGap=(a,b)=>Math.hypot(...a.slice(0,4).map((v,i)=>v-b[i]));
assert.equal(E.ORIGINAL_ARROW_DEGREES_PER_TICK[1],7);
assert.equal(H.ANGULAR_SPEED,480*Math.PI/180);
assert(H.beatScale(0)>1.10);
assert(H.beatScale(.2)<.91);
assert(H.beatScale(.445)>1.09);
assert.equal(H.beatScale(Infinity),1);
for(let t=0;t<109;t+=.013){
 const m=H.cameraAt(t);
 const x=Math.hypot(m[0],m[1]),y=Math.hypot(m[2],m[3]);
 assert(m.every(Number.isFinite));
 assert(Math.abs(x-y)<1e-9,'no uneven stretching');
 assert(Math.abs(m[0]*m[2]+m[1]*m[3])<1e-9,'no perspective skew/tilt');
 assert.equal(m[4],0);assert.equal(m[5],0);
}
assert(matrixGap(H.cameraAt(59.999),H.cameraAt(60))<.02,
 'camera has no 60-second discontinuity');
let maxJump=0;
for(let t=0;t<59.99;t+=1/120)
 maxJump=Math.max(maxJump,matrixGap(H.cameraAt(t),H.cameraAt(t+1/120)));
assert(maxJump<.07,'camera motion is smooth at 120fps');
const play=fs.readFileSync('play.js','utf8');
assert(play.includes('HexHexagonerVideo8.cameraAt(game.time,settings.sound&&music.active'),
 'real audio onset drives camera zoom');
assert(play.includes('music.context.currentTime-music.lastHit'),
 'no synthetic BPM timebase');
assert(play.includes('game.controlMode===1?(game.visualTurn||0):game.playerLean'),
 'visual triangle steering unchanged');
assert(play.includes('audioShakeAt(music.position,music.pulse,musicReady)'),
 'short music-hit screen shake still active');
assert(play.includes('game.dead?(game.deathCamera?.affine||game.recordedCamera)'),
 'death camera frozen');
const special=H.SPECIAL_PARTS;
assert(special['HX3-08']==='staircase'&&special['HX3-14']==='double-rail');
assert(special['HX4-02']==='double-rail'&&special['HX4-04']==='comb');
const delta=2*Math.PI/6;
function fixture(){
 const game=new H.HexagonerGame(H.create(null,318,112));
 const wall={id:'test',sector:0,sides:6,r:48,thickness:62};
 wall.points=E.wallVisualPoly(wall);
 game.walls=[wall];game.sampleWalls=()=>{};
 return {game,wall};
}
{
 const {game}=fixture();game.angle=2*Math.PI-.008;
 game.update(1/240,1);
 assert(!game.dead,'side contact must clip the orbit rather than kill');
 assert(game.angle>=2*Math.PI-.008&&game.angle<2*Math.PI);
 assert(!game.hit(),'clipped position is not inside a wall');
}
{
 const {game,wall}=fixture();game.angle=delta*.5;wall.r=68;
 wall.points=E.wallVisualPoly(wall);
 game.sampleWalls=()=>{wall.r=64;wall.points=E.wallVisualPoly(wall)};
 game.update(1/240,0);
 assert(game.dead&&game.deathCamera,'wall advancing into player kills');
}
{
 const {game}=fixture();game.setControlMode(2);game.angle=delta*5.5;
 assert(game.stepSector(1)&&game.dead&&game.deathCamera);
}
{
 const {game}=fixture();game.setControlMode(3);game.angle=delta*5.5;
 assert(game.selectSector(0)&&game.dead&&game.deathCamera);
}
// Render and collision must use the same preallocated wall quads,
// including stair offsets, striped comb layers, and double rails.
for(const seed of [1,7,2026,81201]){
 const g=new H.HexagonerGame(H.create(null,seed,116));let specials=0;
 for(let t=0;t<108;t+=.13){
  g.time=t;g.sampleWalls();
  for(const w of g.walls){
   if(w.special)specials++;
   const poly=E.wallVisualPoly(w);
   for(let i=0;i<4;i++)for(let xy=0;xy<2;xy++)
    assert(Math.abs(poly[i][xy]-w.points[i][xy])<1e-7,
     'special wall drawing and hitbox use identical vertices');
  }
 }
 assert(specials>0,'random play must include video-derived special walls');
}
console.log('PASS: camera orthogonal + song-pulse zoom, task 3/4 special walls, requested midpoint speed 480deg/s, stage 1/5-like side collision, beat shake and controls');
