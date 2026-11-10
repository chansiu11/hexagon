/* Independent HARD rules reconstructed from the three supplied recordings.
 * No video-frame wall tracks or source-wall-ID repairs are used here.
 * See HARD-REFERENCE-ANALYSIS.md for measured facts and remaining estimates. */
(function(root){'use strict';
const E=typeof module!=='undefined'?require('./engine'):root.HexEngine;
const M=typeof module!=='undefined'?require('./mixed-transition'):root.HexMixedTransition;
const MOTION=typeof module!=='undefined'?require('./hard-motion'):root.HexHardMotion;
const VIDEO=typeof module!=='undefined'?require('./hard-video-parts'):root.HexHardVideoParts;
const TAU=Math.PI*2,MORPH=.18;
function rng(seed){let s=seed>>>0;return ()=>{s=(s+0x6d2b79f5)>>>0;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296}}
function seedNow(){const a=new Uint32Array(1);if(root.crypto?.getRandomValues){root.crypto.getRandomValues(a);return a[0]}return (Date.now()^Math.random()*0xffffffff)>>>0}
const delta=(a,b)=>(b-a+Math.PI*3)%TAU-Math.PI;
function shapeAt(t,s){const shape=E.shapeStateAt(t,s,MORPH);shape.at=0;for(let i=1;i<s.length&&s[i][0]<=t;i++)shape.at=s[i][0];return shape}
// HARD has its own short hold; stage seven retains its .65s clock.
function wallClock(time,schedule){
 let lag=0;
 for(let i=1;i<schedule.length;i++){
  const a=schedule[i][0],elapsed=time-a;if(elapsed<=0)break;
  if(elapsed<=MORPH)return a-lag;
  if(elapsed<MORPH+.18){const u=(elapsed-MORPH)/.18;return a-lag+.18*(u*u*u-.5*u*u*u*u)}
  lag+=MORPH+.09;
 }
 return time-lag;
}
// Invert this stage's wall clock directly. A global binary search used to
// rescan every past morph ~52 times for each generated gate.
function realTimeAtClock(clock,schedule){
 let lag=0;
 for(let i=1;i<schedule.length;i++){
  const a=schedule[i][0],start=a-lag;
  if(clock<=start)return clock+lag;
  if(clock<start+.09){let lo=0,hi=1;for(let j=0;j<32;j++){const u=(lo+hi)/2;if(.18*(u*u*u-.5*u*u*u*u)<clock-start)lo=u;else hi=u}return a+MORPH+.18*(lo+hi)/2}
  lag+=MORPH+.09;
 }
 return clock+lag;
}
function create(seed=seedNow(),duration=3600){
 const shapeRandom=rng(seed^0x9e3779b9),random=rng(seed),pick=n=>Math.floor(random()*n),schedule=[[0,6]],groups=[],waves=[];
 // Initial hexagon lasts approximately twenty game seconds in all clips.
 // Later changes occur at pattern boundaries, not a fixed seconds table.
 let t=21+shapeRandom()*1.3,n=6;
 while(t<duration){n=n===5?(shapeRandom()<.5?4:6):5;schedule.push([t,n]);t+=4.3+shapeRandom()*4.5}
 const at=t=>shapeAt(t,schedule).to;
 const clock=t=>wallClock(t,schedule);
 let impact=2.3,last=null,id=0,group=0,bag=[],recent=[],partBag=[],cohortClearClock=-Infinity;
 const nextClip=()=>{
  if(!partBag.length){partBag=VIDEO.parts.map((_,i)=>i);for(let k=partBag.length-1;k>0;k--){const j=pick(k+1);[partBag[k],partBag[j]]=[partBag[j],partBag[k]]}}
  return VIDEO.parts[partBag.pop()];
 };
 while(impact<duration){
  // A weighted shuffle bag preserves a broad vocabulary without a rigid
  // twelve-family cycle. Common small bars/half-walls/rakes can recur; all
  // families remain available in every bag. These weights are reconstructions,
  // not recovered original RNG probabilities.
  if(!bag.length){
   bag=[0,0,1,1,2,3,3,4,5,6,6,7,8,9,10,11];
   for(let k=bag.length-1;k>0;k--){const j=pick(k+1);[bag[k],bag[j]]=[bag[j],bag[k]]}
   // Include an early broad tunnel, as in the three reference openings.
   if(group===0){const k=bag.indexOf(4),j=bag.length-3;[bag[k],bag[j]]=[bag[j],bag[k]]}
  }
  // Avoid immediate or one-group-separated repeats when the bag permits it;
  // do not force an unchanged sequence between attempts.
  let available=bag.length-1;
  while(available>=0&&recent.includes(bag[available]))available--;
  if(available<0){bag.length=0;continue}
  [bag[available],bag[bag.length-1]]=[bag[bag.length-1],bag[available]];
  const pattern=bag.pop();recent.push(pattern);if(recent.length>2)recent.shift();
  const clip=nextClip(); // 1-3 contiguous, video-observed radial crossing events.
  const groupStart=impact,count=Math.max(pattern===4?2:pattern===6?3:1,clip.events.length),direction=random()<.5?-1:1;
  const lanes=at(impact),base=last?Math.floor(E.wrap(last.safeAngle)/TAU*lanes):pick(lanes);
  let gap=last?(base+(random()<.65?0:random()<.5?1:-1)+lanes)%lanes:base;
  for(let j=0;j<count&&impact<duration;j++){
   n=at(impact);gap=((gap%n)+n)%n;
   const observed=clip.events[Math.min(j,clip.events.length-1)];
   // Retain short source-snippet lane changes and randomly mirror the group.
   if(j){
    if(observed.shift)gap=(gap+direction*observed.shift+n*3)%n;
    else if(pattern===1||pattern===3||pattern===5||pattern===9||pattern===10)gap=(gap+direction+n)%n;
   }
   const speed=MOTION.wallSpeed(impact);
   const thickness=pattern===4?Math.max(110,Math.min(180,observed.width)):
    pattern===11?Math.max(160,Math.min(180,observed.width)):
    pattern===6?18:pattern===0?24+pick(17):Math.max(24,Math.min(135,observed.width));
   const innerExtra=pattern===10?32:0,outerExtra=pattern===10?32:0;
   let safeAngle=(gap+.5)*TAU/n;
   for(let attempt=0;attempt<12;attempt++){
    n=at(impact);gap=Math.floor(E.wrap(safeAngle)/TAU*n)%n;safeAngle=(gap+.5)*TAU/n;
    const before=impact;
    if(last){
     const turn=Math.abs(delta(last.safeAngle,safeAngle));
     const sameExit=last.sides===n&&turn<.02;
     if(sameExit){
      // Dense layers sharing an identical full-cell opening can overlap.
      // The oldest layer is still remembered when the exit later turns.
      impact=Math.max(impact,last.impact+.36);
     }else{
      const clear=realTimeAtClock(cohortClearClock,schedule);
      const changes=schedule.some(([a])=>a>last.impact&&a<=impact);
      const travel=MOTION.CLOCK_RATE*(.16+Math.max(turn/E.PLAYER_SPEED,Math.ceil(turn/(TAU/n)-1e-9)*.18))+(changes?.36:0);
      impact=Math.max(impact,realTimeAtClock(clock(clear+travel)+(73/.60-66+innerExtra)/speed,schedule));
     }
    }
    for(const [a]of schedule.slice(1)){
     if(a<impact-2)continue;if(a>impact+2)break;
     const after=realTimeAtClock(clock(a+MORPH+.18+.10)+(73/.60-66+innerExtra)/speed,schedule);
     if(impact>=a-(66+thickness+outerExtra-59)/speed-.12&&impact<after)impact=after;
    }
    if(Math.abs(impact-before)<1e-9)break;
   }
   // Project the source-observed angular mask onto the current polygon.
   // Actor IDs, radial motion and all morph geometry continue unchanged.
   const relative=Array.from({length:n-1},(_,k)=>k+1);
   let blocked=[...new Set(observed.blocked.map(k=>{
    const p=Math.round((k+.5)*n/observed.sides-.5);
    return Math.max(1,Math.min(n-1,direction===1?p:n-p));
   }))].sort((a,b)=>a-b);
   if(pattern===0)blocked=[1+j%(n-1)]; // Single-cell emphasis.
   if(pattern===6)blocked=relative.filter(k=>(k+j)%2===0); // Thin rakes.
   if(pattern===9)blocked=relative.filter(k=>(k+j)%2===1); // Spokes.
   if(pattern===4||pattern===11)blocked=relative; // Deep, full corridors.
   if(!blocked.length)blocked=[1];
   const sectors=blocked.map(k=>(gap+k)%n).sort((a,b)=>a-b),profiles={};
   for(const sector of sectors){const k=(sector-gap+n)%n;profiles[sector]={thickness:pattern===8?(k%2?thickness:thickness*.45):pattern===11?(k%2?thickness:thickness*.55):thickness,offset:pattern===10?(k%2?-32:32):0}}
   const r=1250,start=clock(impact)-(r-66)/speed;
   const wave={id:id++,group,pattern,partId:clip.id,sourceVideo:clip.source,sourceVideoSeconds:clip.videoSeconds,sides:n,sectors,profiles,innerExtra,outerExtra,safeSector:gap,safeAngle,impact,r,speed,thickness,start,end:start+(r+thickness+outerExtra-26)/speed};
   waves.push(wave);
   const clearClock=clock(impact)+(66+thickness+outerExtra-59)/speed;
   const sameCorridor=last&&last.sides===n&&Math.abs(delta(last.safeAngle,safeAngle))<.02;
   cohortClearClock=sameCorridor?Math.max(cohortClearClock,clearClock):clearClock;
   last=wave;
   const nextEvent=clip.events[Math.min(j+1,clip.events.length-1)];
   // Shorter video-derived intervals make dense nested groups; planner above
   // delays any event that requires more travel/clearance than the player has.
   impact+=Math.max(.36,Math.min(.68,j+1<clip.events.length?nextEvent.dt:.45));
  }
  const spinDirection=random()<.5?-1:1;random(); // Retain the wall RNG stream; magnitude is now time-tiered.
  groups.push({at:groupStart,pattern,partId:clip.id,sourceVideo:clip.source,sourceVideoSeconds:clip.videoSeconds,rate:spinDirection,tilt:(random()-.5)*.65});
  group++;impact+=.08+random()*.14;
 }
 return {mode:'hard-rules',kind:'hard-rules',seed:seed>>>0,duration,shapeSchedule:schedule,morphSeconds:MORPH,waves,groups};
}
class HardGame extends E.Game{
 constructor(data=create()){
  super(0);this.hardMode=true;this.timeline=data;this.profile=null;this._actors=data.waves.map(w=>({...w,actors:w.sectors.flatMap(s=>M.panels(w.sides,s).map(([a,b],i)=>({id:w.id+':'+s+':'+i,waveId:w.id,band:'main',sector:s,sides:w.sides,thickness:w.profiles?.[s]?.thickness??w.thickness,offset:w.profiles?.[s]?.offset||0,mixedStart:a,mixedEnd:b,hardPanel:true,renderPoly:[[0,0],[0,0],[0,0],[0,0]]})))}));
  this._actors.sort((a,b)=>a.start-b.start);this._cursor=0;this._active=[];this._lastClock=-Infinity;this.sampleWalls();
 }
 get targetSides(){return shapeAt(this.time,this.timeline.shapeSchedule).to}
 sectorAngle(s,sides=this.sides){return E.wrap(M.angleAt(this.fromSides,this.sides,this.morph,M.sectorT(sides,s)))}
 sampleWalls(){
  const data=this.timeline;if(!this._actors)return;
  const shape=shapeAt(this.time,data.shapeSchedule),clock=wallClock(this.time,data.shapeSchedule);
  this.fromSides=shape.from;this.sides=shape.to;this.morph=shape.progress;this.morphEventAt=shape.at;this.wallMotionTime=clock;this.wallFrame=Math.floor(this.time*60);
  this.walls.length=0;if(!this.waves)this.waves=[];this.waves.length=0;
  const key=shape.from+':'+shape.to+':'+shape.progress;
  if(this._unitKey!==key){this._unitKey=key;this._units=M.KNOTS.map(t=>M.pointAt(shape.from,shape.to,shape.progress,t))}
  if(clock<this._lastClock){this._cursor=0;this._active.length=0}this._lastClock=clock;
  while(this._cursor<this._actors.length&&this._actors[this._cursor].start<=clock)this._active.push(this._actors[this._cursor++]);
  for(let i=this._active.length-1;i>=0;i--)if(clock>=this._active[i].end)this._active.splice(i,1);
  for(const w of this._active){
   const r=w.r-w.speed*(clock-w.start);this.waves.push(w);
   for(const a of w.actors){
    a.r=r+a.offset;const p=this._units[Math.round(a.mixedStart*6)],q=this._units[Math.round(a.mixedEnd*6)],inner=Math.max(0,a.r),outer=Math.max(inner,a.r+a.thickness);
    const v=a.renderPoly;v[0][0]=p[0]*inner;v[0][1]=p[1]*inner;v[1][0]=q[0]*inner;v[1][1]=q[1]*inner;v[2][0]=q[0]*outer;v[2][1]=q[1]*outer;v[3][0]=p[0]*outer;v[3][1]=p[1]*outer;
    a.collapsed=Math.abs((v[1][0]-v[0][0])*(v[2][1]-v[0][1])-(v[1][1]-v[0][1])*(v[2][0]-v[0][0]))<1e-8;
    this.walls.push(a);
   }
  }
 }
 hit(angle=this.angle){
  const center=E.playerHitPoint(angle);
  return this.walls.find(w=>!w.collapsed&&E.pointInPolygon(center,w.renderPoly));
 }
 die(w){
  if(!w||this.dead)return;
  this.dead=true;
  this.death={time:this.time,angle:this.angle,wallId:w.id,player:E.playerPoly(this.angle),wall:w.renderPoly.map(p=>p.slice()),holes:[],contact:[Math.cos(this.angle)*66,Math.sin(this.angle)*66]};
  // Frame-exact physical impact snapshot, independent of the later death zoom.
  if(this.level===0)this.deathCamera={rotation:this.rotation,zoom:this.zoom,tilt:this.tilt,time:this.time};
 }
 stepSector(d){if(this.controlMode!==2||this.dead||!d)return false;const current=this.currentSector(),count=this.doubleStepReady?2:1,from=this.angle;this.doubleStepReady=false;this.angle=this.sectorAngle((current+Math.sign(d)*count+this.sides)%this.sides);this._ride=null;this.stepEffect={from,to:this.angle,direction:Math.sign(d),count,age:0,duration:.23};this.die(this.hit());return true}
 selectSector(s){if(this.controlMode!==3||this.dead||s<0||s>=this.sides||!Number.isInteger(s))return false;const from=this.angle;this._ride=null;this.angle=this.sectorAngle(s);this.stepEffect={from,to:this.angle,direction:Math.sign(delta(from,this.angle)),count:1,age:0,duration:.23};this.die(this.hit());return true}
 teleportHalfTurn(){return false}
 update(dt,input=0){
  if(this.dead||this.timelineEnded)return;
  const steps=Math.max(1,Math.ceil(dt*240)),h=dt/steps,clockStep=h*MOTION.CLOCK_RATE;
  for(let i=0;i<steps;i++){
   if(this.controlMode===1&&input){
    const from=this.angle,to=E.wrap(from+input*this.playerSpeed*h);
    // A side face blocks lateral movement. Only a wall advancing into the
    // fixed orbit is fatal. Binary clipping avoids penetrating the side.
    if(!this.hit(to))this.angle=to;else{let lo=0,hi=1;for(let k=0;k<12;k++){const u=(lo+hi)/2;if(this.hit(E.wrap(from+input*this.playerSpeed*h*u)))hi=u;else lo=u}this.angle=E.wrap(from+input*this.playerSpeed*h*lo)}
   }
   const track=M.trackAtAngle(this.fromSides,this.sides,this.morph,this.angle),oldTo=this.sides,oldProgress=this.morph;
   this.time=Math.min(this.time+clockStep,this.timeline.duration);this.sampleWalls();
   if(this.morph!==oldProgress||this.sides!==oldTo){
    if(this.controlMode===1)this.angle=E.wrap(M.angleAt(this.fromSides,this.sides,this.morph,track));
    else{
     if(!this._ride||oldTo!==this.sides)this._ride={a:track,b:M.sectorT(this.sides,Math.floor(E.wrap(M.angleAt(this.sides,this.sides,1,track))/TAU*this.sides))};
     const u=this.morph*this.morph*(3-2*this.morph);this.angle=E.wrap(M.angleAt(this.fromSides,this.sides,this.morph,this._ride.a+(this._ride.b-this._ride.a)*u));if(this.morph===1)this._ride=null;
    }
   }
   this.teleportCooldown=Math.max(0,this.teleportCooldown-h);
   for(const key of ['teleport','stepEffect'])if(this[key]){this[key].age+=h;if(this[key].age>=this[key].duration)this[key]=null}
   let event=this.timeline.groups[0];for(const g of this.timeline.groups){if(g.at>this.time)break;event=g}
   this.rotationSpeed=Math.sign(event.rate)*MOTION.spinRate(this.time)*MOTION.CLOCK_RATE;this.rotation+=this.rotationSpeed*h;
   this.tilt=Math.acos(MOTION.viewState(this.time,this.timeline.groups).compression);
   this.zoom=MOTION.zoomAt(this.time);
   this.playerLean=0;this.completed=this.time>=60;this.die(this.hit());if(this.dead)break;
   if(this.time>=this.timeline.duration){this.timelineEnded=true;break}
  }
 }
}
function palette(t){const phase=t%3.1/3.1,hue=t<60?2+48*(.5-.5*Math.cos(phase*TAU)):180+58*(.5-.5*Math.cos(phase*TAU));return [hue,90,[12,20,53]]}
const API={create,HardGame,palette,shapeAt,realTimeAtClock,wallClock,MORPH_SECONDS:MORPH};if(typeof module!=='undefined')module.exports=API;else root.HexHardMode=API;
})(typeof window!=='undefined'?window:globalThis);
