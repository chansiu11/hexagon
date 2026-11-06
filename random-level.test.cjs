'use strict';
const assert=require('node:assert/strict');
const {Game,levels,normalPatternTime,wallVisualPoly,playerPoly,intersect,wrap,PLAYER_SPEED}=require('./engine');
const R=require('./random-waves');
const source=require('./assets/timelines/waves-stage-0.json');
const T=Math.PI*2,N=180,FPS=60,FRAMES=60*FPS;
assert.equal(levels.length,7);
const representatives=new Map();
for(let seed=1;seed<=100;seed++){
 const d=R.create(seed);assert.deepEqual(d,R.create(seed));
 assert.equal(d.kind,'normal-pattern');assert.strictEqual(d.normalTimeline,source);
 assert.strictEqual(d.waves,source.waves,'reuse normal source order and geometry rather than new random rings');
 assert.deepEqual(d.shapeSchedule,source.shapeSchedule);
 representatives.set(d.musicTrack.index,seed);
 assert(d.clockKnots.length>25,'major normal wall arrivals need real music-beat anchors');
 for(let i=1;i<d.clockKnots.length;i++){
  const a=d.clockKnots[i-1],b=d.clockKnots[i];
  assert(b[0]>a[0]&&b[1]>a[1]);
  assert(Math.abs((b[1]-b[0])-(a[1]-a[0]))<=.15*(b[0]-a[0])+1e-8);
  if(i<d.clockKnots.length-1){
   const beat=(b[0]-d.musicTrack.phase)/(30/d.musicTrack.bpm);
   assert(Math.abs(beat-Math.round(beat))<1e-8,'arrival anchor must be on the chosen song eighth-note grid');
  }
 }
 for(let i=0;i<=600;i++){
  const t=i/10,dt=1e-4;
  assert(Math.abs(normalPatternTime(t,d)-t)<.13,'normal pattern timing stays recognizable');
  if(t>0&&t<60){const speed=(normalPatternTime(t+dt,d)-normalPatternTime(t-dt,d))/(2*dt);assert(speed>.774&&speed<1.226,'music clock must remain smooth and physically bounded')}
 }
}
assert.equal(representatives.size,3,'seeded random attempts must cover all three songs');
// Circumcircle plus angular-grid margin contains every player lean and
// every intermediate point of a continuous two-degree movement sample.
function circleHits(angle,poly,radius=8.4){
 const x=Math.cos(angle)*66,y=Math.sin(angle)*66;let inside=true,sign=0;
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1];
  const cross=dx*(y-a[1])-dy*(x-a[0]);
  if(Math.abs(cross)>1e-8){if(sign&&Math.sign(cross)!==sign)inside=false;sign=Math.sign(cross)}
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));
  if(Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t)<=radius)return true;
 }
 return inside;
}
function polygons(game){return game.walls.filter(w=>w.r<125&&w.r+w.thickness>50).map(w=>wallVisualPoly(w,game.fromSides,game.sides,game.morph))}
for(const [track,seed] of representatives){
 const data=R.create(seed),g=new Game(6,data),normal=new Game(0,source);
 const continuousParents=[],discreteParents=[],discreteMoves=[];
 let reachable=new Uint8Array(N);reachable[135]=1;
 let stepped=new Uint8Array(6*12);stepped[4*12]=1;
 let priorSides=6,priorNear=[],minimum=N;
 for(let f=0;f<FRAMES;f++){
  const time=(f+1)/FPS;g.time=time;g.sampleWalls();
  normal.time=normalPatternTime(time,data);normal.sampleWalls();
  const expected=normal.walls.filter(w=>!R.OMITTED_ACTORS.includes(w.waveId)).map(w=>({...w,r:26+(w.r-26)*R.RADIAL_GAIN,thickness:w.thickness*R.RADIAL_GAIN}));
  assert.deepEqual(g.walls,expected,'normal actor IDs, sectors, order, morph and accelerated radial motion must match');
  const near=polygons(g),union=[...priorNear,...near];
  const free=Array.from({length:N},(_,a)=>union.every(poly=>!circleHits(a*T/N,poly)));
  const next=new Uint8Array(N),parents=new Int16Array(N).fill(-1);
  for(let a=0;a<N;a++)if(free[a])for(let d=-3;d<=3;d++){
   const prev=(a-d+N)%N;if(!reachable[prev])continue;
   let clear=true;for(let k=0;k<=Math.abs(d);k++)if(!free[(prev+Math.sign(d)*k+N)%N]){clear=false;break}
   if(clear){next[a]=1;parents[a]=prev;break}
  }
  assert(next.some(Boolean),'mode 1 needs a swept reachable path for '+data.musicTrack.key+' at '+time);
  minimum=Math.min(minimum,next.reduce((a,b)=>a+b,0));
  continuousParents.push(parents);reachable=next;
  const step=T/g.sides,nextStepped=new Uint8Array(g.sides*12),sp=new Int16Array(g.sides*12).fill(-1),sm=new Int8Array(g.sides*12);
  for(let k=0;k<stepped.length;k++)if(stepped[k]){
   const a=(Math.floor(k/12)+.5)*T/priorSides,cooldown=Math.max(0,k%12-1);
   for(let move of cooldown?[0]:[-1,0,1]){
    let angle=wrap(a+move*T/priorSides);
    const oldPlayer=playerPoly(angle);
    if(priorNear.some(p=>intersect(oldPlayer,p)))continue;
    if(g.sides!==priorSides)angle=wrap((Math.floor(angle/step)+.5)*step);
    if(near.some(p=>intersect(playerPoly(angle),p)))continue;
    const sector=Math.floor(angle/step+1e-9),key=sector*12+(move?11:cooldown);
    nextStepped[key]=1;sp[key]=k;sm[key]=move;
   }
  }
  assert(nextStepped.some(Boolean),'mode 2 needs spaced discrete landings for '+data.musicTrack.key+' at '+time);
  discreteParents.push(sp);discreteMoves.push(sm);stepped=nextStepped;priorSides=g.sides;priorNear=near;
 }
 let a=reachable.findIndex(Boolean),k=stepped.findIndex(Boolean);
 const headings=new Int16Array(FRAMES+1),moves=new Int8Array(FRAMES);headings[FRAMES]=a;
 for(let f=FRAMES-1;f>=0;f--){a=continuousParents[f][a];headings[f]=a;moves[f]=discreteMoves[f][k];k=discreteParents[f][k]}
 for(const mode of [1,2]){
  const run=new Game(6,data);run.setControlMode(mode);let maxEarlyTilt=0,maxLateTilt=0,changes=0;
  for(let f=0;f<FRAMES;f++){
   let input=0;
   if(mode===1){const delta=((headings[f+1]-headings[f]+N*1.5)%N)-N/2;input=delta*T/N/(PLAYER_SPEED/FPS)}
   else if(moves[f]){assert(run.stepSector(moves[f]));changes++}
   run.update(1/FPS,input);
   assert(!run.dead,'actual Game.update collision replay failed: '+data.musicTrack.key+' mode '+mode+' at '+run.time);
   if(run.time<10)maxEarlyTilt=Math.max(maxEarlyTilt,Math.abs(run.tilt));
   if(run.time>45)maxLateTilt=Math.max(maxLateTilt,Math.abs(run.tilt));
  }
  assert(run.completed&&run.timelineEnded);assert.equal(maxEarlyTilt,0);assert(maxLateTilt>.08);
  if(mode===2)assert(changes>20,'normal patterns must require frequent deliberate movement');
 }
 // Teleport must use the same morphing polygons as the drawn normal actors.
 for(const time of [19.9,20.2,26.9,36.4,43.2,49.8,55.4])for(let i=0;i<12;i++){
  const run=new Game(6,data);run.time=time;run.sampleWalls();run.angle=i*T/12;
  const expected=run.walls.some(w=>intersect(playerPoly(wrap(run.angle+Math.PI)),wallVisualPoly(w,run.fromSides,run.sides,run.morph)));
  run.teleportHalfTurn();assert.equal(run.dead,expected);
 }
 console.log('PASS '+data.musicTrack.key+': normal walls, beat clock, both real 60s collision replays; minimum '+minimum+'/'+N+' reachable angles');
}
console.log('PASS 100 seeds, all three music tracks, fixed normal patterns, unchanged source and physically playable music synchronization');
