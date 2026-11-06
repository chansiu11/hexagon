'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {Motion,apply}=require('./music-motion');
function run(bpm,features){const m=new Motion();let output;for(let i=0;i<600;i++)output=m.update(1/60,i/60,{bpm,phase:.06},features);return output}
const quiet={active:true,energy:.01,bass:.001,brightness:.05,pulse:0};
const loud={active:true,energy:.20,bass:.12,brightness:.65,pulse:.9};
assert(run(174,loud).rotationScale>run(130,loud).rotationScale*1.12);
assert(run(174,loud).amplitude>run(174,quiet).amplitude*5);
assert(run(174,loud).rotationScale>run(174,quiet).rotationScale);
for(const fps of [30,60,120]){
 const game={level:6,timeline:{musicTrack:{bpm:174,phase:.06}},time:0,rotation:0,angle:1,walls:[{r:70}],sides:6,tilt:.2};
 const physical=JSON.stringify({angle:game.angle,walls:game.walls,sides:game.sides,tilt:game.tilt});
 let lastAngle=0,priorScale=0,speedChanges=0;
 for(let i=0;i<fps*10;i++){
  const dt=1/fps;game.time+=dt;const baseDelta=(i<fps*5?2:-4)*dt;game.rotation+=baseDelta;
  const state=apply(game,dt,baseDelta,i<fps*3?quiet:loud);
  assert(Math.abs(game.musicRotation-lastAngle)<=6.8*dt+1e-9,'instant speed changes must not teleport the scene angle');
  assert(Math.abs(state.shakeX)<=4.5&&Math.abs(state.shakeY)<=4.5);
  if(Math.abs(state.rotationScale-priorScale)>.05)speedChanges++;
  assert.equal(game.musicMotionState.speed,Math.max(-6.8,Math.min(6.8,baseDelta/dt*state.rotationScale)),'rotation velocity must change immediately, without inertia');
  lastAngle=game.musicRotation;priorScale=state.rotationScale;
 }
 assert(speedChanges>5,'music accents must produce distinct speed steps');
 assert.equal(JSON.stringify({angle:game.angle,walls:game.walls,sides:game.sides,tilt:game.tilt}),physical);
 for(let i=0;i<fps*2;i++)apply(game,1/fps,0,{active:false});
 assert(game.musicMotion.amplitude<.0001,'mute/pause/silence cannot leave shaking behind');
}
for(let level=0;level<6;level++){const game={level,rotation:1,walls:[]},before=JSON.stringify(game);assert.equal(apply(game,1/60,.1,loud),null);assert.equal(JSON.stringify(game),before)}
const context={window:{}};vm.runInNewContext(fs.readFileSync('./audio.js','utf8'),context);
const audio=new context.window.BeatAudio(),connections=[];
const analyser={reads:0,fftSize:1024,frequencyBinCount:512,getFloatTimeDomainData(a){this.reads++;a.fill(.1)},getByteFrequencyData(a){a.fill(64)}};
audio.level=6;audio.enabled=true;audio.active=true;audio.energy=.06;audio.pulse=.8;
audio.source={connect(node){connections.push(node)}};
audio.context={state:'running',sampleRate:48000,createAnalyser(){return analyser}};
const features=audio.motionFeatures();assert(features.active&&Math.abs(features.energy-.1)<1e-6&&features.brightness>0);
assert.equal(connections.length,1);assert.strictEqual(connections[0],analyser);audio.motionFeatures();assert.equal(connections.length,1);
audio.context.currentTime=.01;audio.energy=.08;audio.pulse=.4;
const cached=audio.motionFeatures();assert.strictEqual(cached,features);assert.equal(analyser.reads,1);assert.equal(cached.bass,.08);assert.equal(cached.pulse,.4);
audio.context.currentTime=.04;audio.motionFeatures();assert.equal(analyser.reads,2,'full-band analysis is throttled while bass and beat pulses stay fresh');
audio.enabled=false;assert.equal(audio.motionFeatures().active,false);
audio.enabled=true;audio.level=0;assert.equal(audio.motionFeatures().active,false);
console.log('PASS tempo/mood/beat-driven shake, abrupt bounded camera velocity, unchanged collisions and original stages, music-only audio analysis');
