'use strict';
const assert=require('node:assert/strict'),Motion=require('./hard-motion'),H=require('./hard-mode'),E=require('./engine'),reference=require('./hard-motion-reference.json');
for(const c of reference.clips){assert(Math.abs(Motion.CLOCK_RATE-c.clockRate)<.0003);for(const [i,t]of [3,20,70].entries()){const measured=c.rotation[i].meanDegreesPerGameSecond,target=Motion.spinRate(t)*180/Math.PI;assert(Math.abs(measured-target)<5,`${c.file} spin ${measured}/${target}`)}assert(Math.abs(Motion.BASE_COMPRESSION-c.projectionQuantiles[1])<.01)}
assert(Math.abs(Motion.wallSpeed(20)-reference.pooled.before60.speedQuantiles[2])<10);assert(Math.abs(Motion.wallSpeed(70)-reference.pooled.after60.speedQuantiles[2])<10);
const d=H.create(19,120);
for(let t=0;t<120;t+=.05){const m=Motion.cameraAt(t,t*3,1,d.groups),[a,b,c,e]=m;const tr=a*a+b*b+c*c+e*e,det=(a*e-b*c)**2,disc=Math.sqrt(Math.max(0,tr*tr-4*det)),ratio=Math.sqrt((tr-disc)/(tr+disc));assert(ratio>.25&&ratio<.82,'side-on floor stays visible and never flips');assert(a*e-b*c>0)}
const empty={duration:120,shapeSchedule:[[0,6]],groups:[{at:0,rate:1,tilt:0}],waves:[]};
for(const dt of [1/60,1/20,1/10]){const g=new H.HardGame(empty);for(let i=0;i<Math.round(1/dt);i++)g.update(Motion.frameDelta(dt,true),1);assert(Math.abs(g.time-Motion.CLOCK_RATE)<1e-10);assert(Math.abs(Motion.audioTime(g.time)-1)<1e-10);assert(Math.abs(g.rotation-Motion.spinRate(0)*Motion.CLOCK_RATE)<1e-10);assert(Math.abs(E.wrap(g.angle+Math.PI/2)-E.wrap(E.PLAYER_SPEED))<1e-10,'real player turning rate is preserved')}
assert.equal(Motion.frameDelta(.1,false),.05);assert.equal(Motion.frameDelta(.1,true),.1);
console.log('PASS three-video clock/spin/projection calibration, wall-flow medians, shared non-flat camera and real-time motion at 10/20/60 FPS with unchanged turning speed');

assert(H.MORPH_SECONDS>=.12&&H.MORPH_SECONDS<=.22);const schedule=[[0,6],[1,5],[4,4]];for(const t of [1,1.05,1.10,1.17])assert.equal(H.wallClock(t,schedule),1);assert(H.wallClock(1.25,schedule)>1);for(let t=0;t<8;t+=.023){const c=H.wallClock(t,schedule);assert(Math.abs(H.wallClock(H.realTimeAtClock(c,schedule),schedule)-c)<1e-8)}
assert.equal(require('./mixed-transition').MORPH_SECONDS,.65,'random stage morph timing is preserved');console.log('PASS fast HARD-only morph/hold clock with invertible recovery; unchanged stage-seven duration');
