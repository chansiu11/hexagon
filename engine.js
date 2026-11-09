(function(root){
'use strict';
const TAU=Math.PI*2,STEP=TAU/6;
const MIXED_TRANSITION=typeof module!=='undefined'?require('./mixed-transition.js'):root.HexMixedTransition;
// The original game uses a 60 Hz update and angular arrow speeds of 7 or
// 9 degrees/tick (Hexagonest and Hyper Hexagonest use 9). Based on
// https://github.com/sumguytho/SuperHexagonRE#arrow_speed
// Convert to radians/second so browser movement stays frame independent.
const ORIGINAL_TICK_RATE=60;
const ORIGINAL_ARROW_DEGREES_PER_TICK=Object.freeze([7,7,9,7,7,9]);
// Preserve the original game's documented stage differences as reference,
// but intentionally use the first stage's orbit rate on every map.
const PLAYER_SPEED=ORIGINAL_ARROW_DEGREES_PER_TICK[0]*TAU/360*ORIGINAL_TICK_RATE;
const PLAYER_SPEED_BY_LEVEL=Object.freeze(ORIGINAL_ARROW_DEGREES_PER_TICK.map(()=>PLAYER_SPEED));
const LIFECYCLE=typeof module!=='undefined'?require('./wall-lifecycle-patches.js'):(root.HexWallLifecyclePatches||[]);
// The previous 42px cutoff lies OUTSIDE the inscribed area of the square
// core (45.8807 * cos(PI/4) ~= 32.4px). Those last visible slivers popped
// offscreen at the tracker end, which looks like repeated wall blinking.
// Finish every wave behind the inner core across all side transitions.
const HIDDEN_WALL_OUTER_RADIUS=26;
function hiddenWallEnd(w,existingEnd,duration){
 if(!Number.isFinite(w.speed)||w.speed<=0)return existingEnd;
 const physicalEnd=w.start+(w.r+w.thickness-HIDDEN_WALL_OUTER_RADIUS)/w.speed;
 return Math.max(existingEnd,Math.min(duration,physicalEnd));
}
const repairedTimelines=new WeakMap();
function stabilizeTimeline(level,data){
 if(!data||data.mode!=='batched-wall-waves')return data;
 let cache=repairedTimelines.get(data);
 if(!cache){cache=new Map();repairedTimelines.set(data,cache);}
 if(cache.has(level))return cache.get(level);
 const patch=LIFECYCLE[level];
 if(!patch){cache.set(level,data);return data;}
 const discarded=new Set(patch.omit);
 const overrides=new Map(patch.extend);
 const waves=data.waves.filter(w=>!discarded.has(w.id)).map(w=>{
  const baseEnd=overrides.get(w.id)??w.end;
  const end=hiddenWallEnd(w,baseEnd,data.duration);
  return Math.abs(end-w.end)<1e-10?w:{...w,end};
 });
 const copy={...data,waves,stability:{sourceWaves:data.waves.length,continued:overrides.size,excluded:discarded.size}};
 cache.set(level,copy);
 return copy;
}
// One global polygon transition applies to the core, walls and collision
// alike, regardless of each video fragment's old recorded side count.
const MORPH_SECONDS=.45;
// Most shape transitions preserve their prior 0.28s pause at the start.
// Only stage 1's FIRST 6->5 change (20.000s) pauses AFTER the morph has
// COMPLETED: morph 20.00-20.45s, hold 20.45-20.65s, then descend again.
// Keep all recorded wall actors, sector mappings and collision geometry.
// Catch up smoothly after each hold so no delay accumulates against the
// absolute timestamps of the video-extracted wall tracks.
const WALL_MORPH_HOLD_SECONDS=.28;
const WALL_MORPH_RECOVERY_SECONDS=.35;
const FIRST_PENTAGON_POST_MORPH_HOLD_SECONDS=.20;
// Do not accelerate the incoming pentagon walls as soon as they unfreeze:
// 0.20s of lag recovered in 0.35s made them rush at 1.57x normal speed
// exactly while they approached the player's 66px orbit. Keep normal speed
// until 21.50s, then make up time smoothly between 21.50s and 22.50s,
// when the first ring has already passed behind the center.
const FIRST_PENTAGON_SAFE_SPEED_UNTIL_SECONDS=1.50; // since 20.00s morph boundary
const FIRST_PENTAGON_DELAYED_RECOVERY_SECONDS=1.00;
function wallTimelineTime(t,schedule){
 if(!Array.isArray(schedule))return t;
 let lag=0;
 for(let i=0;i<schedule.length;i++){
  const event=schedule[i],boundary=event[0];
  if(boundary<=0||t<=boundary)continue;
  const elapsed=t-boundary;
  // Explicitly scope this change to stage 1's first hexagon -> pentagon.
  const firstPentagon=i===1&&schedule[0][0]===0&&
   schedule[0][1]===6&&boundary===20&&event[1]===5;
  if(firstPentagon){
   const holdStart=MORPH_SECONDS;
   const holdEnd=holdStart+FIRST_PENTAGON_POST_MORPH_HOLD_SECONDS;
   if(elapsed<=holdStart)lag=0;
   else if(elapsed<=holdEnd)lag=elapsed-holdStart;
   else if(elapsed<=FIRST_PENTAGON_SAFE_SPEED_UNTIL_SECONDS)
    lag=FIRST_PENTAGON_POST_MORPH_HOLD_SECONDS;
   else if(elapsed<FIRST_PENTAGON_SAFE_SPEED_UNTIL_SECONDS+FIRST_PENTAGON_DELAYED_RECOVERY_SECONDS){
    const fraction=(elapsed-FIRST_PENTAGON_SAFE_SPEED_UNTIL_SECONDS)/FIRST_PENTAGON_DELAYED_RECOVERY_SECONDS;
    lag=FIRST_PENTAGON_POST_MORPH_HOLD_SECONDS*(1-fraction);
   }else lag=0;
  }else if(elapsed<=WALL_MORPH_HOLD_SECONDS)lag=elapsed;
  else if(elapsed<WALL_MORPH_HOLD_SECONDS+WALL_MORPH_RECOVERY_SECONDS){
   const fraction=(elapsed-WALL_MORPH_HOLD_SECONDS)/WALL_MORPH_RECOVERY_SECONDS;
   lag=WALL_MORPH_HOLD_SECONDS*(1-fraction);
  }else lag=0;
 }
 return Math.max(0,t-lag);
}
// Player-facing accessibility adjustment for the FOUR actors making the
// first stage's initial five-sided ring. After its requested 0.20-second
// freeze, that ring used to reach the 66px player orbit in ~0.4 seconds.
// Slowing only these actors to 45% of their former speed provides time to
// recognize and enter the one available pentagon opening. Other wall actors,
// the world clock and every later ring retain their original trajectories.
const FIRST_PENTAGON_RING_APPROACH_SPEED=.45;
const FIRST_PENTAGON_RING_RESUME_TIME=20+MORPH_SECONDS+FIRST_PENTAGON_POST_MORPH_HOLD_SECONDS;
function firstPentagonRingWallTime(t,schedule){
 const original=wallTimelineTime(t,schedule);
 const first=Array.isArray(schedule)&&schedule.length>=2&&
  schedule[0][0]===0&&schedule[0][1]===6&&
  schedule[1][0]===20&&schedule[1][1]===5;
 if(!first||t<=FIRST_PENTAGON_RING_RESUME_TIME)return original;
 const resumed=wallTimelineTime(FIRST_PENTAGON_RING_RESUME_TIME,schedule);
 return resumed+(t-FIRST_PENTAGON_RING_RESUME_TIME)*FIRST_PENTAGON_RING_APPROACH_SPEED;
}
function shapeStateAt(t,schedule,duration=MORPH_SECONDS){
 if(!Array.isArray(schedule)||!schedule.length)return {from:6,to:6,progress:1};
 let index=0;
 for(let i=1;i<schedule.length;i++)if(schedule[i][0]<=t)index=i;else break;
 const to=schedule[index][1],from=index?schedule[index-1][1]:to;
 return {from,to,progress:index?Math.max(0,Math.min(1,(t-schedule[index][0])/duration)):1};
}
function wallVisualPoly(w,fromSides=w.sides||6,toSides=fromSides,progress=1){
 if(w.hardPanel)return w.renderPoly;
 if(w.mixedStart!==undefined){
  const u=progress*progress*(3-2*progress),inner=Math.max(0,w.r),outer=Math.max(inner,w.r+w.thickness);
  const a=MIXED_TRANSITION.unitAt(fromSides,w.mixedStart),b=MIXED_TRANSITION.unitAt(fromSides,w.mixedEnd);
  const c=MIXED_TRANSITION.unitAt(toSides,w.mixedStart),d=MIXED_TRANSITION.unitAt(toSides,w.mixedEnd);
  return [[a,c,inner],[b,d,inner],[b,d,outer],[a,c,outer]].map(([x,y,r])=>[x[0]*r*(1-u)+y[0]*r*u,x[1]*r*(1-u)+y[1]*r*u]);
 }
 const src=w.sides||6,from=fromSides||src,to=toSides||from;
 // The four actors at the first 6->5 passage use consistent side indices
 // throughout the morph; all other waves use the original sector mapping.
 const oldSector=Number.isInteger(w.fromSector)?w.fromSector:
  Math.max(0,Math.min(from-1,Math.floor((w.sector+.5)*from/src)));
 const newSector=Number.isInteger(w.toSector)?w.toSector:
  Math.max(0,Math.min(to-1,Math.floor((w.sector+.5)*to/src)));
 const blend=Math.max(0,Math.min(1,progress));
 const u=blend*blend*(3-2*blend);
 const inside=Math.max(0,w.r),outside=Math.max(inside,w.r+(w.thickness||30));
 const point=(sides,sector,r)=>{const angle=sector*TAU/sides;return [Math.cos(angle)*r,Math.sin(angle)*r];};
 const vertex=(oldIdx,newIdx,r)=>{
  const a=point(from,oldIdx,r),b=point(to,newIdx,r);
  return [a[0]*(1-u)+b[0]*u,a[1]*(1-u)+b[1]*u];
 };
 return [vertex(oldSector,newSector,inside),vertex(oldSector+1,newSector+1,inside),
  vertex(oldSector+1,newSector+1,outside),vertex(oldSector,newSector,outside)];
}
const profiles=typeof module!=='undefined'?require('./stage-profiles.js'):(root.StageProfiles||[]);
const levels=[['HEXAGON','HARD',32,220],['HEXAGONER','HARDER',120,250],['HEXAGONEST','HARDEST',285,290],['HEXAGON','HARDESTER',190,300],['HEXAGONER','HARDESTEST',225,335],['HEXAGONEST','HARDESTESTEST',0,370],['RANDOM HEXAGON','CHAOTIC',265,326]];
const wrap=a=>(a%TAU+TAU)%TAU;
function intersect(a,b){for(const p of [a,b])for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length],axis=[p[i][1]-q[1],q[0]-p[i][0]];const aa=a.map(v=>v[0]*axis[0]+v[1]*axis[1]),bb=b.map(v=>v[0]*axis[0]+v[1]*axis[1]);if(Math.max(...aa)<Math.min(...bb)||Math.max(...bb)<Math.min(...aa))return false}return true}
function wallPoly(r,sector,thickness=30,sides=6){
 // A wave can travel past the center before its recorded lifetime expires.
 // Negative radii used to fold sectors across the origin, causing twisted
 // wall polygons and collision ghosts. Clip the radial interval to zero.
 const inner=Math.max(0,r),outer=Math.max(inner,r+thickness),step=TAU/sides,a=sector*step,b=a+step;
 return [[Math.cos(a)*inner,Math.sin(a)*inner],[Math.cos(b)*inner,Math.sin(b)*inner],[Math.cos(b)*outer,Math.sin(b)*outer],[Math.cos(a)*outer,Math.sin(a)*outer]];
}
function playerPoly(angle,lean=0){const a=angle+lean,c=Math.cos(a),s=Math.sin(a),x=Math.cos(angle)*66,y=Math.sin(angle)*66;return [[7,0],[-3.5,-6.0621778265],[-3.5,6.0621778265]].map(([u,v])=>[x+u*c-v*s,y+u*s+v*c])}

// Recorded connected walls may be concave. SAT is only valid for the old convex sectors.
function polygonOverlap(a,b,holes=[]){
 const inside=(p,poly)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
 const x=poly[i],y=poly[j];if((x[1]>p[1])!==(y[1]>p[1])&&p[0]<(y[0]-x[0])*(p[1]-x[1])/(y[1]-x[1])+x[0])hit=!hit;}return hit;};
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const segment=(a,b,c,d)=>{if(Math.max(a[0],b[0])<Math.min(c[0],d[0])||Math.max(c[0],d[0])<Math.min(a[0],b[0])||Math.max(a[1],b[1])<Math.min(c[1],d[1])||Math.max(c[1],d[1])<Math.min(a[1],b[1]))return false;return cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0;};
 if(a.some(v=>inside(v,b)&&!holes.some(h=>inside(v,h)))||inside(b[0],a))return true;
 for(const ring of [b,...holes])for(let i=0;i<a.length;i++)for(let j=0;j<ring.length;j++)if(segment(a[i],a[(i+1)%a.length],ring[j],ring[(j+1)%ring.length]))return true;
 return false;
}

/** All six stages use the stage-one rigid, constant-speed wall trajectory. */
function observedWaveRadius(w,time){
 return w.r-w.speed*(time-w.start);
}

// Previously accepted first-ring sectors, retained only until game time 18s.
// Their identifiers remain stable when the observed video sectors take over.
const FIRST_PENTAGON_RING_SECTORS=Object.freeze({144:0,145:3,146:4,147:5});
// Measured sector-1 gap was unreachable at 20.88s: previously-survivable
// headings were 222..359deg, while the new hole jumped to 6..139deg.
// Correct only the first ring after its offscreen 18s handoff: adjacent
// outgoing hexagon openings 4+5 merge into pentagon opening 4.
const FIRST_PENTAGON_REACHABLE_SECTORS=Object.freeze({144:0,145:1,146:2,147:3});
function fastIntersect(a,b){
 for(let shape=0;shape<2;shape++){
  const p=shape?b:a;
  for(let i=0;i<p.length;i++){
   const next=p[(i+1)%p.length],x=p[i][1]-next[1],y=next[0]-p[i][0];
   let amin=Infinity,amax=-Infinity,bmin=Infinity,bmax=-Infinity;
   for(let j=0;j<a.length;j++){const v=a[j][0]*x+a[j][1]*y;if(v<amin)amin=v;if(v>amax)amax=v;}
   for(let j=0;j<b.length;j++){const v=b[j][0]*x+b[j][1]*y;if(v<bmin)bmin=v;if(v>bmax)bmax=v;}
   if(amax<bmin||bmax<amin)return false;
  }
 }
 return true;
}
function updateMixedPoly(w,from,to,progress){
 const key=from*10+to;
 if(w._shape===key&&w._radius===w.r&&w._progress===progress)return;
 if(w._shape!==key){
  w._from=[...MIXED_TRANSITION.unitAt(from,w.mixedStart),...MIXED_TRANSITION.unitAt(from,w.mixedEnd)];
  w._to=[...MIXED_TRANSITION.unitAt(to,w.mixedStart),...MIXED_TRANSITION.unitAt(to,w.mixedEnd)];
 }
 w._shape=key;w._radius=w.r;w._progress=progress;
 const u=progress*progress*(3-2*progress),inner=Math.max(0,w.r),outer=Math.max(inner,w.r+w.thickness);
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(let i=0;i<4;i++){
  const k=i===1||i===2?2:0,r=i<2?inner:outer,p=w.renderPoly[i];
  p[0]=w._from[k]*r*(1-u)+w._to[k]*r*u;
  p[1]=w._from[k+1]*r*(1-u)+w._to[k+1]*r*u;
  if(p[0]<minX)minX=p[0];if(p[0]>maxX)maxX=p[0];
  if(p[1]<minY)minY=p[1];if(p[1]>maxY)maxY=p[1];
 }
 w.minX=minX;w.maxX=maxX;w.minY=minY;w.maxY=maxY;
 // A fully merged edge has no painted area and must not leave a radial
 // collision line behind after its two corner tracks become identical.
 const a=w.renderPoly[0],b=w.renderPoly[1],c=w.renderPoly[2];
 w.collapsed=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))<1e-10;
}
function rememberImpact(game,player,w,poly){
 if(game.death)return;
 const center=[Math.cos(game.angle)*66,Math.sin(game.angle)*66];let contact=center,best=Infinity;
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],x=b[0]-a[0],y=b[1]-a[1],den=x*x+y*y;
  const u=den?Math.max(0,Math.min(1,((center[0]-a[0])*x+(center[1]-a[1])*y)/den)):0;
  const p=[a[0]+x*u,a[1]+y*u],d=(p[0]-center[0])**2+(p[1]-center[1])**2;if(d<best){best=d;contact=p;}
 }
 game.death={time:game.time,angle:game.angle,wallId:w.id,player:player.map(p=>p.slice()),wall:poly.map(p=>p.slice()),holes:(w.holes||[]).map(r=>r.map(p=>p.slice())),contact};
}
function observedPlayerHit(game,p,w){
 const batch=game.timeline?.mode==='batched-wall-waves',poly=w.points||wallVisualPoly(w,batch?game.fromSides:w.sides,batch?game.sides:w.sides,batch?game.morph:1);
 const hit=w.points?polygonOverlap(p,poly,w.holes):intersect(p,poly);
 if(hit)rememberImpact(game,p,w,poly);return hit;
}
function mixedPlayerHit(game,p){
 const minX=Math.min(p[0][0],p[1][0],p[2][0]),maxX=Math.max(p[0][0],p[1][0],p[2][0]);
 const minY=Math.min(p[0][1],p[1][1],p[2][1]),maxY=Math.max(p[0][1],p[1][1],p[2][1]);
 for(const w of game.walls){
  if(w.renderPoly){
   if(w.collapsed)continue;
   if(w.maxX<minX||w.minX>maxX||w.maxY<minY||w.minY>maxY)continue;
   if(fastIntersect(p,w.renderPoly)){rememberImpact(game,p,w,w.renderPoly);return true;}
  }else{const poly=wallVisualPoly(w,game.fromSides,game.sides,game.morph);if(intersect(p,poly)){rememberImpact(game,p,w,poly);return true;}}
 }
 return false;
}
function normalPatternTime(time,data){
 const knots=data?.clockKnots;if(!knots)return time;
 for(let i=1;i<knots.length;i++)if(time<=knots[i][0]){
  const a=knots[i-1],b=knots[i],u=Math.max(0,Math.min(1,(time-a[0])/(b[0]-a[0])));
  const ease=u*u*(3-2*u);
  return time+(a[1]-a[0])*(1-ease)+(b[1]-b[0])*ease;
 }
 return time;
}
class Game{
 constructor(level=0,timeline=null){this.level=level;this.profile=profiles[level];this.timeline=timeline&&typeof timeline==='object'?stabilizeTimeline(level,timeline):null;this.timelineEnded=false;this.time=0;this.angle=-Math.PI/2;this.rotation=0;this.rotationSpeed=.9;this.playerLean=0;this.sides=6;this.fromSides=6;this.morph=1;this.pendingSides=6;this.shapeWait=false;this.zoom=1;this.tilt=0;this.walls=[];this.next=0.08;this.dead=false;this.lastGap=4;this.pattern=0;this.rings=0;this.completed=false;this.teleport=null;this.teleportCooldown=0;this.controlMode=1;this.stepEffect=null;this.doubleStepReady=false;this.randomAlignedSides=6;if(level===6&&this.timeline?.kind==='mixed-pattern')this.tilt=this.timeline.tiltEvents[0][1]}
 get playerSpeed(){return PLAYER_SPEED_BY_LEVEL[this.level]??PLAYER_SPEED}
 get bpm(){return [130,140,150,150,160,170,145][this.level]}
 get speed(){return levels[this.level][3]+Math.min(this.time/60,1)*18+(this.completed&&this.level<3?65:0)}
 get targetSides(){if(this.level===6)return this.timeline?shapeStateAt(normalPatternTime(this.time,this.timeline),this.timeline.shapeSchedule).to:6;if(this.profile&&this.time<60){const schedule=this.profile.shapeSchedule;for(let i=schedule.length-1;i>=0;i--)if(this.time>=schedule[i][0])return schedule[i][1]}const phase=Math.floor((this.time%60)/10);return [[6,6,5,6,4,6],[6,5,6,4,6,5],[6,6,4,6,5,6]][this.level%3][phase]}
 sampleWalls(){
 const data=this.timeline;if(!data)return;
 if(this.level===6&&data.kind==='mixed-pattern'){
  const shape=shapeStateAt(this.time,data.shapeSchedule,data.morphSeconds);
  if(shape.progress!==this.morph||shape.from!==this.fromSides||shape.to!==this.sides){
  // The player rides the wall mesh. Discrete modes interpolate into a
  // surviving cell center instead of ending on a merged, dangerous vertex.
  const track=MIXED_TRANSITION.trackAtAngle(this.fromSides,this.sides,this.morph,this.angle);
  if(this.controlMode!==1){
   if(!this.morphPlayerTrack||shape.progress<this.morph||shape.from!==this.fromSides||shape.to!==this.sides){
    const final=MIXED_TRANSITION.angleAt(shape.to,shape.to,1,track);
    const sector=Math.floor(wrap(final)/(TAU/shape.to));
    this.morphPlayerTrack={a:track,b:MIXED_TRANSITION.sectorT(shape.to,sector)};
   }
   const u=shape.progress*shape.progress*(3-2*shape.progress),ride=this.morphPlayerTrack;
   this.angle=wrap(MIXED_TRANSITION.angleAt(shape.from,shape.to,shape.progress,ride.a+(ride.b-ride.a)*u));
   if(shape.progress>=1)this.morphPlayerTrack=null;
  }else this.angle=wrap(MIXED_TRANSITION.angleAt(shape.from,shape.to,shape.progress,track));
  }
  this.randomAlignedSides=shape.to;this.fromSides=shape.from;this.sides=shape.to;this.morph=shape.progress;
  const clock=MIXED_TRANSITION.clockAt(this.time,data.shapeSchedule);this.wallMotionTime=clock;
  this.wallFrame=Math.floor(this.time*data.sampleRate);this.recordedCamera=null;
  if(!this.mixedActors){
   this.mixedActors=data.waves.map(w=>{
    const actor=(sector,mixedStart,mixedEnd,part,band='main',offset=0,thickness=w.thickness)=>({
     id:w.id+':'+sector+':'+band+':'+part,waveId:w.id,sector,sides:w.sides,r:w.r,thickness,band,offset,mixedStart,mixedEnd,
     renderPoly:[[0,0],[0,0],[0,0],[0,0]],_shape:-1
    });
    const actors=w.sectors.flatMap(sector=>MIXED_TRANSITION.panels(w.sides,sector).map(([a,b],part)=>actor(sector,a,b,part)));
    for(const rim of w.smallWalls||[]){
     for(const [part,[a,b]] of MIXED_TRANSITION.panels(w.sides,rim.sector).entries())actors.push(actor(rim.sector,a,b,part,rim.band,rim.offset,rim.thickness));
    }
    return {...w,spawnRadius:w.r,actors};
   });
   this.waves=[];
  }
  // Reuse wave/actor arrays and polygons at all physics substeps. Formerly
  // filter/map/spread/flatMap rebuilt every object up to 240 times a second.
  this.waves.length=0;this.walls.length=0;
  for(const wave of this.mixedActors){
   if(clock<wave.start||clock>=wave.end)continue;
   wave.r=wave.spawnRadius-wave.speed*(clock-wave.start);this.waves.push(wave);
   for(const w of wave.actors){
    w.r=wave.r+w.offset;updateMixedPoly(w,shape.from,shape.to,shape.progress);this.walls.push(w);
   }
  }
  return;
 }
 if(data.mode==='rigid-observed-tracks'||data.mode==='batched-wall-waves'){
  const position=Math.max(0,Math.min(data.camera.length-1,this.time*data.sampleRate)),index=Math.floor(position),u=position-index;
  const a=data.camera[index],b=data.camera[Math.min(index+1,data.camera.length-1)];
  this.wallFrame=index;this.recordedCamera=a.map((v,k)=>v+(b[k]-v)*u);
  if(data.mode==='batched-wall-waves'){
   const shape=shapeStateAt(this.time,data.shapeSchedule);
   this.fromSides=shape.from;this.sides=shape.to;this.morph=shape.progress;
   const wallTime=wallTimelineTime(this.time,data.shapeSchedule);
   this.wallMotionTime=wallTime;
   const ringTime=this.level===0?firstPentagonRingWallTime(this.time,data.shapeSchedule):wallTime;
   const actorClock=w=>this.level===0&&w.id>=144&&w.id<=147?ringTime:wallTime;
   // Recompute each actor's lifetime from the SAME clock as its radius:
   // slowing the first ring without this would make it disappear mid-screen.
   this.waves=data.waves.filter(w=>{
    const t=actorClock(w);return t>=w.start&&t<w.end;
   }).map(w=>({...w,r:observedWaveRadius(w,actorClock(w))}));
   // Protect the exact 0-18s timeline. After the four first-ring actors
   // have traveled wholly offscreen, map their sides to a reachable opening.
   // Their IDs, positions, thickness and lifetime never change.
   const firstRing=this.level===0?FIRST_PENTAGON_RING_SECTORS:null;
   this.walls=this.waves.flatMap(w=>{
    // Stage 1 at ~24.0s: two overlapping, video-traced side-2 fragments
    // (173 and 178) squeeze the only pentagon escape down to a razor gap.
    // Suppress JUST these duplicate side-2 fragments, preserving side 1+2
    // as one wide connected passage. Draw and collision use this same list.
    // The wall tracks are still present in the unmodified source JSON.
    if(this.level===0&&[168,173,175,178].includes(w.id))return [];
    // Stage 5 around 30.5s: remove only the two staggered flank walls
    // (source IDs 304 in sector 0, 307 in sector 4). Stable actor IDs
    // ensure no time-triggered flicker; render and hitboxes stay identical.
    if(this.level===4&&(w.id===304||w.id===307))return [];
    if(firstRing&&w.id>=144&&w.id<=149){
     const baselineSector=firstRing[w.id];
     if(baselineSector===undefined)return []; // duplicate video observations
     const handedOff=this.time>=18;
     const passageSector=FIRST_PENTAGON_REACHABLE_SECTORS[w.id];
     return [{id:w.id+':'+baselineSector,waveId:w.id,
      sector:handedOff?passageSector:baselineSector,
      sides:handedOff?w.sides:6,r:w.r,thickness:w.thickness,
      ...(handedOff?{fromSector:passageSector,toSector:passageSector}:{})}];
    }
    // The 32s square-ring recording (IDs 239–264) overlays sectors 1 and 2
    // from consecutive traces, sealing a human-reachable exit. Keep 0 and 3,
    // and leave a contiguous two-sector passage. Filter by stable wall ID
    // and sector (NOT display time), so a visible wall never pops at 31.5/33.5.
    return w.sectors.filter(sector=>{
     if(this.level===0&&w.id>=239&&w.id<=264&&(sector===1||sector===2))return false;
     // Stage 5, from the wall group that reaches the player around 30s:
     // adjacent sector-2/3 walls from successive recording fragments
     // force a turn faster than the player's 7deg/frame maximum (~35s).
     // Keep one CONNECTED two-sector escape throughout all later waves.
     // Actor-ID-based filtering affects visuals and collision identically,
     // never switches sectors as walls cross the player's orbit and leaves
     // stages 1–4, 6 and stage 5's opening entirely unchanged.
     if(this.level===4&&w.id>=300&&(sector===2||sector===3))return false;
     return true;
    }).map(sector=>({
     id:w.id+':'+sector,waveId:w.id,sector,sides:w.sides,
     r:w.r,thickness:w.thickness
    }));
   });
   // One simple bonus dodge in stage 5's early quiet section. One sector
   // only; the other five directions remain open. Born beyond the viewport,
   // moving continuously into the hidden core, without modifying video data.
   if(this.level===4&&this.time>=6.05){
    const r=760-320*(this.time-6.05),thickness=36;
    if(r+thickness>26)this.walls.push({
     id:'stage5-bonus-early:4',waveId:'stage5-bonus-early',
     sector:4,sides:6,r,thickness
    });
   }
  }else this.walls=data.walls.filter(w=>this.time>=w.start&&this.time<w.end).map(w=>({...w,r:w.r-w.speed*(this.time-w.start)}));
  return;
 }
 const index=Math.min(data.frames.length-1,Math.floor((this.time+1e-9)*data.sampleRate));
 if(index===this.wallFrame)return;
 this.wallFrame=index;const frame=data.frames[index];this.recordedCamera=frame.camera;
 this.walls=frame.walls.map(([id,points,holes=[]])=>({id,points,holes}));
 }


 // Mode 1 preserves the accepted continuous rotation exactly.
 // Mode 2 advances one whole CURRENT polygon sector per discrete input;
 // sector centers stay aligned when stage geometry changes.
 setControlMode(mode){
  this.controlMode=mode===3?3:mode===2?2:1;
  this.doubleStepReady=false;
  this.morphPlayerTrack=null;
  this.stepEffect=null;
  this.randomAlignedSides=this.sides;
  this.directSides=this.sides;
  if(this.controlMode===2||this.controlMode===3){
   const sides=Math.max(3,this.sides||6),step=TAU/sides;
   this.angle=wrap((Math.round(this.angle/step-.5)+.5)*step);
   this.playerLean=0;
  }
 }
 sectorAngle(sector,sides=this.sides){
  return this.level===6&&this.timeline?.kind==='mixed-pattern'?wrap(MIXED_TRANSITION.angleAt(this.fromSides,this.sides,this.morph,MIXED_TRANSITION.sectorT(sides,sector))):(sector+.5)*TAU/sides;
 }
 currentSector(){
  let best=0,distance=Infinity;
  for(let i=0;i<this.sides;i++){const d=Math.abs(wrap(this.sectorAngle(i)-this.angle+Math.PI)-Math.PI);if(d<distance){distance=d;best=i}}
  return best;
 }
 armDoubleStep(){
  if(this.controlMode!==2||this.dead||this.timelineEnded)return false;
  // Arming does not teleport or move the player. A single next direction
  // press consumes the bonus, even if the activation key remains held.
  this.doubleStepReady=true;
  return true;
 }
 stepSector(direction){
  if(this.controlMode!==2||this.dead||this.timelineEnded||!direction)return false;
  const sides=Math.max(3,this.sides||6),step=TAU/sides;
  // After snapping, derive the containing sector rather than rounding a
  // half-integer: floating-point ties at pentagon/square centers can jump
  // by TWO cells when changing direction.
  const current=this.level===6&&this.timeline?.kind==='mixed-pattern'?this.currentSector():Math.floor(wrap(this.angle)/step+1e-9);
  const from=this.angle;
  // Exactly one two-sector move per bonus activation.
  const count=this.doubleStepReady?2:1;
  this.doubleStepReady=false;
  const to=this.sectorAngle((current+Math.sign(direction)*count+sides)%sides);
  this.angle=to;
  if(this.level===6&&this.timeline?.kind==='mixed-pattern'&&this.morph<1){const t=MIXED_TRANSITION.sectorT(sides,(current+Math.sign(direction)*count+sides)%sides);this.morphPlayerTrack={a:t,b:t};}
  this.playerLean=0;
  // Only a temporary VISUAL echo of an instantaneous position change:
  // the real hitbox remains at this.angle, never in the animation.
  this.stepEffect={from,to,direction:Math.sign(direction),count,age:0,duration:count===2?.30:.23};
  return true;
 }
 // Mode 3 jumps only to the explicitly labelled current polygon sector.
 selectSector(sector){
  const sides=Math.max(3,this.sides||6);
  if(this.controlMode!==3||this.dead||this.timelineEnded||!Number.isInteger(sector)||sector<0||sector>=sides)return false;
  const from=this.angle,to=this.sectorAngle(sector);
  let turn=wrap(to-from+Math.PI)-Math.PI;
  this.angle=to;this.playerLean=0;
  if(this.level===6&&this.timeline?.kind==='mixed-pattern'&&this.morph<1){const t=MIXED_TRANSITION.sectorT(sides,sector);this.morphPlayerTrack={a:t,b:t};}
  if(Math.abs(turn)>1e-9)this.stepEffect={from,to,direction:Math.sign(turn),count:Math.abs(turn)/(TAU/sides),age:0,duration:.23};
  const p=playerPoly(to),batch=this.timeline?.mode==='batched-wall-waves';
  if(this.level===6&&this.timeline?.kind==='mixed-pattern'?mixedPlayerHit(this,p):this.walls.some(w=>observedPlayerHit(this,p,w)))this.dead=true;
  return true;
 }
 // The player changes position instantly; only the decorative trail animates.
 // Keep a harmless no-op for any old callers; half-turn is disabled.
 teleportHalfTurn(){return false;}
 update(dt,input=0){if(this.dead||this.timelineEnded)return;const steps=Math.max(1,Math.ceil(dt/(1/240))),h=dt/steps;for(let n=0;n<steps;n++){this.teleportCooldown=Math.max(0,this.teleportCooldown-h);if(this.stepEffect){this.stepEffect.age+=h;if(this.stepEffect.age>=this.stepEffect.duration)this.stepEffect=null;}if(this.teleport){this.teleport.age+=h;if(this.teleport.age>=this.teleport.duration)this.teleport=null;}this.time+=h;if(this.timeline&&this.time>=this.timeline.duration){this.time=this.timeline.duration;this.completed=true;this.timelineEnded=true;break;}this.playerLean+=(input*.6-this.playerLean)*(1-Math.exp(-h/(input?.055:.085)));this.completed=this.time>=60;if(this.controlMode===1)this.angle=wrap(this.angle+input*this.playerSpeed*h);const beat=this.time*this.bpm/60;const direction=Math.floor(beat/16)%2?-1:1;let target=direction*(.9+this.level*.19)*(1+.15*Math.sin(beat*Math.PI/16));
if(this.level===6&&this.timeline?.kind==='mixed-pattern'){
 // New target every few seconds, changing direction unpredictably, with
 // amplitude growing from gentle to strong as the level approaches 60s.
 for(const [at,rate] of this.timeline.spinEvents||[]){
  if(at>this.time)break;
  target=rate;
 }
 this.rotationSpeed=target;
}else this.rotationSpeed+=(target-this.rotationSpeed)*Math.min(1,h*7);
this.rotation+=this.rotationSpeed*h;if(!(this.level===6&&this.timeline?.kind==='mixed-pattern')){this.pendingSides=this.targetSides;
this.shapeWait=this.pendingSides!==this.sides;
if(this.shapeWait&&(this.profile&&this.time<60||this.walls.length===0)){this.fromSides=this.sides;this.sides=this.pendingSides;this.morph=0;this.lastGap=Math.floor(wrap(this.angle)/TAU*this.sides);this.shapeWait=false}
this.morph=Math.min(1,this.morph+h/0.45);}
const phase=beat%1,accent=Math.exp(-phase*10);const targetZoom=1+accent*.075+.045*Math.sin(beat*Math.PI/8);this.zoom+=(targetZoom-this.zoom)*Math.min(1,h*32);
let tiltTarget=Math.min(1,Math.max(0,this.time-1))*.24*Math.sin(beat*Math.PI/16)*Math.sin(Math.min(this.time/4,1)*Math.PI/2);
if(this.level===6&&this.timeline?.kind==='mixed-pattern'){
 tiltTarget=this.timeline.tiltEvents[0][1];
 for(const [at,tilt]of this.timeline.tiltEvents){if(at>this.time)break;tiltTarget=tilt;}
}
this.tilt+=(tiltTarget-this.tilt)*Math.min(1,h*(this.level===6?2.4:3));
if(this.timeline)this.sampleWalls();else for(const w of this.walls)w.r-=this.speed*h;
if(this.controlMode===3&&this.level!==6&&this.directSides!==this.sides){
 const step=TAU/this.sides;this.angle=wrap((Math.floor(wrap(this.angle)/step)+.5)*step);this.directSides=this.sides;
}
const p=playerPoly(this.angle,this.playerLean);
if(this.level===6&&this.timeline?.kind==='mixed-pattern'?mixedPlayerHit(this,p):this.walls.some(w=>observedPlayerHit(this,p,w))){this.dead=true;break}
if(!this.timeline)this.walls=this.walls.filter(w=>w.r+(w.thickness||30)>50)}}
}
const API={fastIntersect,normalPatternTime,polygonOverlap,Game,PLAYER_SPEED,PLAYER_SPEED_BY_LEVEL,ORIGINAL_TICK_RATE,ORIGINAL_ARROW_DEGREES_PER_TICK,levels,wallPoly,playerPoly,intersect,wrap,observedWaveRadius,wallVisualPoly,shapeStateAt,stabilizeTimeline,hiddenWallEnd,HIDDEN_WALL_OUTER_RADIUS,wallTimelineTime,WALL_MORPH_HOLD_SECONDS,WALL_MORPH_RECOVERY_SECONDS,MORPH_SECONDS,FIRST_PENTAGON_POST_MORPH_HOLD_SECONDS,FIRST_PENTAGON_SAFE_SPEED_UNTIL_SECONDS,FIRST_PENTAGON_DELAYED_RECOVERY_SECONDS,FIRST_PENTAGON_RING_APPROACH_SPEED,FIRST_PENTAGON_RING_RESUME_TIME,firstPentagonRingWallTime};if(typeof module!=='undefined')module.exports=API;else root.HexEngine=API;
})(typeof window!=='undefined'?window:globalThis);

