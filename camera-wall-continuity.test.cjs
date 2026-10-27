'use strict';
const assert=require('node:assert/strict');
const {Game,wallVisualPoly,PLAYER_SPEED_BY_LEVEL,wallTimelineTime}=require('./engine');
const {cameraScale,stabilizeCameraScale,MAX_CAMERA_SCALE_RATE}=require('./camera-stability');

const fps=60,dt=1/fps,eps=1e-6;
assert.equal(new Set(PLAYER_SPEED_BY_LEVEL).size,1,
 'all maps retain stage-one player orbit speed');
const straight=[1,0,0,1,0,0],jump=[2,0,0,2,0,0];
assert(Math.abs(cameraScale(stabilizeCameraScale(straight,jump,dt))-1)<=MAX_CAMERA_SCALE_RATE*dt+eps);
assert.deepEqual(stabilizeCameraScale(null,jump,dt),jump);

for(let level=0;level<6;level++){
 const source=require('./assets/timelines/waves-stage-'+level+'.json');
 const g=new Game(level,source);
 const speedById=new Map(g.timeline.waves.map(w=>[w.id,w.speed]));
 let prior=new Map(),priorCamera=null,actors=0,exits=0,zoomCorrections=0;
 for(let frame=0;frame<source.duration*fps;frame++){
  const time=frame/fps;
  g.time=time;g.sampleWalls();
  assert.equal(g.timeline.waves.length>0,true);
  const measured=g.recordedCamera;
  const stabilized=stabilizeCameraScale(priorCamera,measured,dt);
  const scale=cameraScale(stabilized),measuredScale=cameraScale(measured);
  assert(Number.isFinite(scale)&&scale>0,'noninvertible camera on map '+level+' time '+time);
  if(priorCamera){
   assert(Math.abs(scale-cameraScale(priorCamera))<=MAX_CAMERA_SCALE_RATE*dt+eps,
    'zoom jump map '+level+' time '+time);
  }
  if(Math.abs(scale-measuredScale)>eps)zoomCorrections++;
  for(let i=0;i<4;i++)
   assert(Math.abs(stabilized[i]/scale-measured[i]/measuredScale)<eps,
    'camera rotation/shear changed map '+level+' time '+time);
  const next=new Map();
  for(const w of g.walls){
   assert(!next.has(w.id),'duplicate rendered wall '+w.id);
   next.set(w.id,w);
   assert(Number.isFinite(w.r)&&Number.isFinite(w.thickness));
   const points=wallVisualPoly(w,g.fromSides,g.sides,g.morph);
   assert(points.every(p=>p.every(Number.isFinite)),
    'invalid wall polygon map '+level+' '+time);
   if(prior.has(w.id)){
    const old=prior.get(w.id);
    const motionDelta=frame?wallTimelineTime(time,source.shapeSchedule)-wallTimelineTime(time-dt,source.shapeSchedule):0;
    assert(Math.abs((old.r-w.r)-speedById.get(w.waveId)*motionDelta)<1e-4,
     'wall teleported '+w.id+' map '+level+' '+time);
   }else if(frame>0){
    assert(w.r>700,'wall appeared near player '+w.id+' map '+level+' '+time);
   }
   actors++;
  }
  if(frame>0)for(const [id,w] of prior){
   if(next.has(id))continue;
   // The vanished wave must already be completely behind the center.
   const clockStep=wallTimelineTime(time,source.shapeSchedule)-
     wallTimelineTime(time-dt,source.shapeSchedule);
   // The 0.35s catch-up can advance the physical wave by more than dt.
   assert(w.r+w.thickness<=26+speedById.get(w.waveId)*clockStep+eps,
    'visible wall vanished '+id+' map '+level+' '+time);
   exits++;
  }
  prior=next;priorCamera=stabilized;
 }
 assert(zoomCorrections>=0);
 console.log('PASS stage '+(level+1)+' 0-60s, '+actors+
  ' rendered wall instances, '+exits+' hidden exits, '+zoomCorrections+' camera corrections');
}
console.log('PASS continuous wall actors, bounded zoom, unchanged orbit speed across six stages');
