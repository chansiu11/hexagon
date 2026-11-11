'use strict';
/* node hexagoner-camera-smooth.test.cjs
 * Regression for task-3/4 arena/background smoothness only. The original
 * 15Hz measured camera poses remain reference anchor points, while rendering
 * can now interpolate at 60, 90 or 120Hz independent of the player's orbit.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const H=require('./hexagoner-video8');
const Profiles=require('./stage-profiles');
const E=require('./engine');
const camera=Profiles[1].camera;
const matDiff=(a,b)=>Math.hypot(...a.slice(0,4).map((v,i)=>v-b[i]));
assert.equal(E.ORIGINAL_ARROW_DEGREES_PER_TICK[1],7,'character rotation speed unchanged');
const script=fs.readFileSync('play.js','utf8');
assert(script.includes('HexHexagonerVideo8.cameraAt(game.time)'),
 'render-time camera must not be capped by cached 60fps physics camera');
assert(script.includes('game.controlMode===1?(game.visualTurn||0):game.playerLean'),
 'character lean display unchanged');
assert(script.includes('audioShakeAt(music.position,music.pulse,musicReady)'),
 'music beat shake preserved');
assert(script.includes('game.dead?(game.deathCamera?.affine||game.recordedCamera)'),
 'camera motion must stop on death');
assert(script.includes('game.hexagonerSource8&&!launch?'),
 'camera fix must be limited to HEXAGONER only');
// Every keyframe must agree with the original source orientation and shear
// after the separately measured video-game zoom multiplier is applied.
for(let j=0;j<Math.min(camera.frames.length,899);j++){
 const t=camera.start+j/camera.sampleRate;
 if(t>=60)break;
 const original=camera.frames[j],actual=H.cameraAt(t);
 const length=Math.hypot(original[0],original[1])||1;
 const reconstructed=[...actual.slice(0,4)].map(v=>v*(length/Math.hypot(actual[0],actual[1])));
 assert(matDiff(reconstructed,original)<1e-7,
  'original video source keyframe orientation/shear must be preserved');
}
let peak=0;
for(let t=0;t<59.99;t+=1/120){
 const a=H.cameraAt(t),b=H.cameraAt(t+1/120);
 assert(a.every(Number.isFinite)&&b.every(Number.isFinite));
 peak=Math.max(peak,matDiff(a,b));
}
assert(peak<.07,'no 15Hz wall/background orientation snap visible at 120fps: '+peak);
assert(matDiff(H.cameraAt(15.51),H.cameraAt(15.5183333333))>1e-5,
 'the pre-60 camera should move at sub-60fps intervals');
assert(matDiff(H.cameraAt(82.005),H.cameraAt(82.0133333333))>1e-5,
 'post-60 camera should move at sub-60fps intervals');
assert.deepEqual(H.audioShakeAt(42,0,true),[0,0]);
assert.deepEqual(H.audioShakeAt(42,.9,false),[0,0]);
assert(H.audioShakeAt(42,.9,true).some(v=>v!==0));
for(const seed of [1,7,2026]){
 const game=new H.HexagonerGame(H.create(null,seed,112));
 for(let t=0;t<108;t+=.14){
  game.time=t;game.sampleWalls();
  assert(game.walls.every(w=>w.points.every(p=>p.every(Number.isFinite))));
 }
}
console.log('PASS HEXAGONER smooth camera: original keyframes retained, 120fps smooth arena, beat shake/death freeze, player controls and wall geometry unaffected; peak subframe change '+peak.toFixed(5));
