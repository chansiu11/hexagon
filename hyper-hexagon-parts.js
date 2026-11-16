/* HYPER HEXAGON 4-2: film-derived continuous-dodge phrases.
 * Requires two independent 60fps HXRF recordings and measured cut manifest.
 * A cut is NOT a wall deletion: previous visible actors continue from the old
 * source even when an unrelated recorded phrase starts. The game clock is
 * monotonic across 60s. Original video-engine spawn commands are unknown.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HyperHexagonParts=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const IDS=['1595','1596'], FPS=60,RATE=25/24, TAU=Math.PI*2;
 const SLOTS=48,STEP=.12,STEPS=9,ORBIT=66,MAX_TAIL=1.55;
 const wrap=a=>((a%TAU)+TAU)%TAU;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 const indexAngle=a=>Math.floor(wrap(a)/TAU*SLOTS)%SLOTS;
 function rng(seed){let x=(Number(seed)>>>0)||0x9e3779b9;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
 function inside(x,y,ring){
  let result=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
   const [ax,ay]=ring[i],[bx,by]=ring[j];
   if(Math.abs((bx-ax)*(y-ay)-(by-ay)*(x-ax))<1e-7&&
    x>=Math.min(ax,bx)-1e-6&&x<=Math.max(ax,bx)+1e-6&&
    y>=Math.min(ay,by)-1e-6&&y<=Math.max(ay,by)+1e-6)return true;
   if((ay>y)!==(by>y)&&x<ax+(y-ay)*(bx-ax)/(by-ay))result=!result;
  }
  return result;
 }
 function blocked(frame,x,y){return frame.walls.some(w=>inside(x,y,w.points)&&!(w.holes||[]).some(h=>inside(x,y,h)));}
 const circles=Array.from({length:SLOTS},(_,i)=>{
  const a=(i+.5)*TAU/SLOTS;return [ORBIT*Math.cos(a),ORBIT*Math.sin(a)];
 });
 function mask(frame,filter=null){
  const walls=filter?frame.walls.filter(w=>filter.has(w.id)):frame.walls;
  const result=new Uint8Array(SLOTS);
  for(let i=0;i<SLOTS;i++){
   const [x,y]=circles[i];
   result[i]=walls.some(w=>inside(x,y,w.points)&&!(w.holes||[]).some(h=>inside(x,y,h)))?1:0;
  }
  return result;
 }
 // At a join, orbit-only signatures can falsely match even when large
 // incoming walls pop across the outer screen. Sample four actual radii.
 const RADII=[ORBIT,108,166,232];
 function radialSignature(frame){
  const out=new Uint8Array(SLOTS*RADII.length);
  for(let ring=0;ring<RADII.length;ring++)for(let k=0;k<SLOTS;k++){
   const a=(k+.5)*TAU/SLOTS;
   out[ring*SLOTS+k]=blocked(frame,RADII[ring]*Math.cos(a),RADII[ring]*Math.sin(a))?1:0;
  }
  return out;
 }
 function radialMismatch(oldFrame,newFrame,oldShift,newShift){
  const oldBins=Math.round(oldShift/TAU*SLOTS),newBins=Math.round(newShift/TAU*SLOTS);
  const weights=[3,2,2,1];let differing=0;
  for(let r=0;r<RADII.length;r++)for(let k=0;k<SLOTS;k++){
   const pos=r*SLOTS;
   if(oldFrame[pos+(k-oldBins+SLOTS*3)%SLOTS]!==newFrame[pos+(k-newBins+SLOTS*3)%SLOTS])
    differing+=weights[r];
  }
  return differing/(SLOTS*weights.reduce((a,b)=>a+b,0));
 }
 function at(replay,start,t,end=replay.frames.length-1){
  return clamp(start+Math.round(t*FPS/replay.gameRate),0,end);
 }
 function masks(replay,from,to,tail=false){
  const ids=tail?new Set(replay.frames[from].walls.map(w=>w.id)):null;
  return Array.from({length:STEPS},(_,i)=>{
   const j=at(replay,from,i*STEP,tail?replay.frames.length-1:to);
   return mask(replay.frames[j],ids);
  });
 }
 function maxRadius(w){let v=0;for(const [x,y] of w.points)v=Math.max(v,Math.hypot(x,y));return v;}
 function incomingDelay(replay,from,to){
  const initial=new Set(replay.frames[from].walls.map(w=>w.id));
  const upper=Math.min(to,at(replay,from,1.15));
  for(let i=from+1;i<=upper;i++){
   const newOuter=replay.frames[i].walls.some(w=>!initial.has(w.id)&&maxRadius(w)>180);
   if(newOuter)return(i-from)*replay.gameRate/FPS;
  }
  return Infinity;
 }
 function makeBank(recordings,manifest){
  if(!manifest||manifest.frameRate!==FPS||Math.abs(manifest.gameRate-RATE)>.03)
   throw Error('HYPER 4-2 measured 60fps cut manifest missing');
  const byId={},all=[],pre=[],post=[];
  for(const id of IDS){
   const replay=recordings?.[id],meta=manifest.sources?.[id];
   if(!replay||!meta||!Array.isArray(replay.frames)||replay.fps!==FPS||
      replay.frames.length!==meta.frames||!Array.isArray(meta.cuts))
    throw Error('HYPER 4-2 independent source frame/count mismatch: '+id);
   if(meta.cuts[0]!==0||meta.cuts.at(-1)!==replay.frames.length-1)
    throw Error('HYPER 4-2 source chronology incomplete: '+id);
   if(!meta.cuts.includes(manifest.boundaryFrame))
    throw Error('HYPER 4-2 missing intact 60s boundary: '+id);
   for(let i=0;i<meta.cuts.length-1;i++){
    const from=meta.cuts[i],to=meta.cuts[i+1];
    if(!Number.isInteger(from)||!Number.isInteger(to)||to<=from||to-from<50)
     throw Error('HYPER 4-2 invalid dodge phrase '+id+':'+i);
    const first=replay.frames[from],last=replay.frames[to];
    const p={id:id+'-'+String(i).padStart(2,'0'),source:id,from,to,index:i,
     first,last,sideIn:first.sides,sideOut:last.sides,
     duration:(to-from)/FPS*replay.gameRate,
     filmedStart:from/FPS*replay.gameRate,epoch:from<manifest.boundaryFrame?0:1};
    p.entryRadial=radialSignature(first);p.exitRadial=radialSignature(last);
    p.entry=masks(replay,from,to);
    p.tail=masks(replay,to,replay.frames.length-1,true);
    p.arrivalDelay=incomingDelay(replay,from,to);
    Object.freeze(p);all.push(p);byId[p.id]=p;
    (p.epoch===0?pre:post).push(p);
   }
  }
  if(!pre.some(p=>p.source==='1595')||!pre.some(p=>p.source==='1596')||
     !post.some(p=>p.source==='1595')||!post.some(p=>p.source==='1596'))
    throw Error('HYPER 4-2 must represent both films in both epochs');
  return {all,pre,post,byId,recordings,manifest};
 }
 function turn(points,a,scale=1){
  const c=Math.cos(a)*scale,s=Math.sin(a)*scale;
  return points.map(([x,y])=>[x*c-y*s,x*s+y*c]);
 }
 function mismatch(a,b,shift){let miss=0;
  for(let j=0;j<SLOTS;j++)if(a[j]!==b[(j-shift+SLOTS)%SLOTS])miss++;
  return miss/SLOTS;
 }
 function isSafe(oldMasks,newMasks,playerAngle,playerSpeed,oldShift,newShift){
  // Discrete, conservative 48-angle state-space search: all intermediate
  // positions must be reachable by the stage's actual max angular velocity.
  const oldBin=Math.round(oldShift/TAU*SLOTS),newBin=Math.round(newShift/TAU*SLOTS);
  const start=indexAngle(playerAngle);
  if(oldMasks[0][(start-oldBin+SLOTS)%SLOTS]||newMasks[0][(start-newBin+SLOTS)%SLOTS])return false;
  let states=new Set([start]);
  const maxStep=Math.floor((playerSpeed*STEP)/TAU*SLOTS);
  if(maxStep<1)throw Error('HYPER 4-2 angle mask resolution incompatible with player speed');
  for(let t=1;t<STEPS;t++){
   const upcoming=new Set();
   for(const prior of states)for(let k=-maxStep;k<=maxStep;k++){
    const dest=(prior+k+SLOTS)%SLOTS;
    if(!oldMasks[t][(dest-oldBin+SLOTS)%SLOTS] &&
       !newMasks[t][(dest-newBin+SLOTS)%SLOTS])upcoming.add(dest);
   }
   if(!upcoming.size)return false;
   states=upcoming;
  }
  return true;
 }
 function palette(replay,sourceFrame){
  const pal=replay.palette;if(!pal?.colors?.length)return null;
  return pal.colors[clamp(Math.floor(sourceFrame/replay.fps*pal.fps),0,pal.colors.length-1)];
 }
 function extrapolate(w,elapsed){
  // Last-resort tracking bridge on contour split/merge: extrapolate inward,
  // at most 0.18s. Do NOT create a wall or retain a vanished actor forever.
  const vx=clamp(w.estimatedVelocity?.[0]||0,-350,350);
  const vy=clamp(w.estimatedVelocity?.[1]||0,-350,350);
  const shift=ring=>ring.map(([x,y])=>[x+vx*elapsed,y+vy*elapsed]);
  return {...w,points:shift(w.points),holes:(w.holes||[]).map(shift)};
 }
 class Session{
  constructor(recordings,manifest,options={}){
   this.bank=makeBank(recordings,manifest);
   this.recordings=recordings;this.kind='parts';this.id='hyper-hexagon-4-2';this.fps=FPS;
   this.seed=finite(options.seed)?options.seed:Date.now();this.random=rng(this.seed);
   this.speed=finite(options.playerSpeed)&&options.playerSpeed>0?options.playerSpeed:8.5;
   const beginnings=this.bank.all.filter(p=>p.from===0);
   this.current=beginnings.find(p=>p.source===options.firstSource)||beginnings[Math.floor(this.random()*beginnings.length)];
   this.source=this.current.source;this.sourceFrame=0;this.replayFrame=0;
   this.start=0;this.shift=0;this.cameraOffset=0;this.runId=1;this.nextRunId=2;
   this.epoch=0;this.activePart=this.current.id;this.transitions=0;this.history=[{at:0,part:this.current.id,source:this.source,epoch:0}];
   this.lastTime=0;this.last=null;this.colors=null;this.carry=[];this.ended=false;
   this.maxObservedGap=0;this._emptySince=0;this.maxSpawnGap=0;
   this.lastArrival=0;this.outerArrivalEvents=0;this._seenNew=new Set();
   this.unsafeSeams=0;this.fallbacks=0;this.rejected=0;
  }
  choose(now,playerAngle){
   const outgoing=this.current;
   const pool=now>=60?this.bank.post:this.bank.pre;
   const options=[];
   // Preserve the current filmed source's geometry until the old phrase ends.
   const oldMasks=outgoing.tail;
   for(const next of pool){
    if(next.sideIn!==outgoing.sideOut||next.from===0)continue;
    if(next.id===outgoing.id)continue;
    const sameNeighbor=next.source===outgoing.source&&next.from===outgoing.to;
    // Each prospective entry must bring a new visible outside wall within 1s.
    // The matched source neighbor can stay if there is no safer compatible cut.
    if(!sameNeighbor&&next.arrivalDelay>1.0)continue;
    for(let step=0;step<next.sideIn;step++){
     const lane=sameNeighbor?this.shift:step*TAU/next.sideIn;
     if(sameNeighbor&&step!==0)continue;
     if(!isSafe(oldMasks,next.entry,playerAngle,this.speed,this.shift,lane))continue;
     const mismatchScore=radialMismatch(outgoing.exitRadial,next.entryRadial,this.shift,lane);
     if(!sameNeighbor&&mismatchScore>.43)continue;
     const recent=this.history.slice(-6).filter(h=>h.part===next.id).length;
     const other=next.source!==outgoing.source;
     const visualPenalty=mismatchScore*3.5;
     const entryDelay=Number.isFinite(next.arrivalDelay)?next.arrivalDelay:1.5;
     const score=visualPenalty+recent*.5+entryDelay*.15-(other?.48:0)-(sameNeighbor?.12:0);
     options.push({part:next,shift:lane,score,other,contiguous:sameNeighbor,mismatch:mismatchScore});
    }
   }
   if(options.length){
    options.sort((a,b)=>a.score-b.score);
    const top=options.slice(0,Math.min(7,options.length));
    // Prefer the alternative filmed source whenever the motion is equally safe.
    const alternatives=top.filter(o=>o.other);
    const pickFrom=alternatives.length&&this.random()<.72?alternatives:top;
    let total=pickFrom.reduce((n,o)=>n+Math.exp(-2*o.score),0);
    let choose=this.random()*total;
    for(const o of pickFrom){choose-=Math.exp(-2*o.score);if(choose<=0)return o;}
    return pickFrom.at(-1);
   }
   // Do not mask the absence of an actually reachable connection.
   // An adjacent *original chronological* frame maintains the original film
   // but is marked unverified when the ship is in a blocked source lane.
   const neighbor=this.bank.all.find(p=>p.source===outgoing.source&&p.from===outgoing.to);
   if(neighbor&&neighbor.sideIn===outgoing.sideOut){
    this.fallbacks++;return {part:neighbor,shift:this.shift,contiguous:true,fallback:true,score:Infinity};
   }
   this.unsafeSeams++;this.ended=true;
   return null;
  }
  cross(now,playerAngle){
   const prev=this.current,deadline=this.start+prev.duration;
   const chosen=this.choose(deadline,playerAngle);
   if(!chosen)return;
   // Use the exact cut frame rather than the last rendered sub-frame.
   // Otherwise each cut introduces a small camera snap at 60fps.
   const oldCamera=prev.last.angle+this.cameraOffset;
   // Contiguous raw-source segments maintain the exact same wall ID and run.
   if(!chosen.contiguous){
    const visible=new Set(prev.last.walls.map(w=>w.id));
    this.carry.push({source:prev.source,frame:prev.to,ids:visible,
      worldShift:this.shift,oldCamera,created:deadline,runId:this.runId,
      lastActors:new Map(prev.last.walls.map(w=>[w.id,w]))});
    this.runId=this.nextRunId++;
   }
   this.carry=this.carry.filter(x=>deadline-x.created<MAX_TAIL);
   this.current=chosen.part;this.start=deadline;
   this._joinedNewSource=!chosen.contiguous;
   this.shift=chosen.shift;
   this.cameraOffset=oldCamera-this.current.first.angle;
   this.source=this.current.source;this.activePart=this.current.id;this.transitions++;
   this.history.push({at:deadline,part:this.activePart,source:this.source,
    epoch:deadline>=60?1:0,contiguous:!!chosen.contiguous,
    fallback:!!chosen.fallback,score:chosen.score});
  }
  tailWalls(c,seconds,currentCamera,currentZoom){
   const film=this.recordings[c.source];
   const k=at(film,c.frame,seconds);
   const frame=film.frames[k];
   const inFilm=new Map(frame.walls.map(w=>[w.id,w]));
   const drift=frame.angle+c.oldCamera-film.frames[c.frame].angle-currentCamera;
   const scale=frame.zoom/currentZoom;
   const output=[];
   for(const id of c.ids){
    let w=inFilm.get(id);
    if(!w&&seconds<.18&&c.lastActors.has(id))w=extrapolate(c.lastActors.get(id),seconds);
    if(!w)continue;
    const rotate=ring=>turn(ring,drift+c.worldShift,scale);
    const points=rotate(w.points);
    // Retire the old actor only after its observed/extrapolated lifetime ends.
    if(points.every(([x,y])=>x*x+y*y<35*35))continue;
    output.push({...w,id:c.runId+':'+id,points,
      holes:(w.holes||[]).map(rotate)});
   }
   return output;
  }
  sample(seconds,playerAngle=TAU/12){
   if(!finite(seconds)||seconds<0)throw RangeError('HYPER 4-2 invalid game time');
   if(seconds+1e-8<this.lastTime)throw RangeError('HYPER 4-2 source time cannot rewind');
   // Exactly at 60 seconds, finish the currently playing pre-60 phrase
   // *at its real filmed frame*, not at a made-up wall state. Continue its
   // still-visible actors via the outgoing tail while selecting a post-60
   // phrase. The source manifest itself stays chronological and intact.
   if(seconds>=60&&this.current.epoch===0&&this.start<60&&
      this.start+this.current.duration>60){
    const old=this.current,film=this.recordings[old.source];
    const to=at(film,old.from,60-this.start,old.to);
    if(to>old.from){
     const cut={...old,id:old.id+'@60',to,last:film.frames[to],
      duration:60-this.start,tail:masks(film,to,film.frames.length-1,true),
      exitRadial:radialSignature(film.frames[to])};
     this.bank.byId[cut.id]=cut;this.current=cut;
    }
   }
   let guard=0;
   while(!this.ended&&seconds>=this.start+this.current.duration-1e-9){
    this.cross(seconds,playerAngle);
    if(++guard>1000)throw Error('HYPER 4-2 phrase transition loop');
   }
   const local=clamp(seconds-this.start,0,this.current.duration);
   const film=this.recordings[this.current.source];
   const k=at(film,this.current.from,local,this.current.to);
   const frame=film.frames[k],camera=frame.angle+this.cameraOffset;
   const rotate=ring=>turn(ring,this.shift);
   const admission=this._joinedNewSource?clamp(local/.14,0,1):1;
   const walls=frame.walls.map(w=>({...w,id:this.runId+':'+w.id,
    points:rotate(w.points),holes:(w.holes||[]).map(rotate),opacity:admission}));
   const ongoing=[];
   for(const carry of this.carry){
    const elapsed=seconds-carry.created;
    if(elapsed<0||elapsed>MAX_TAIL)continue;
    const residual=this.tailWalls(carry,elapsed,camera,frame.zoom);
    walls.push(...residual);
    if(residual.length)ongoing.push(carry);
   }
   this.carry=ongoing;
   this.source=this.current.source;this.sourceFrame=k;
   this.replayFrame=k;this.activePart=this.current.id;
   this.epoch=seconds<60?0:1;
   this.colors=palette(film,k);
   // Smooth RGB seams for 0.16s. Geometry and actor identity are unchanged.
   if(this.transitions&&seconds-this.start<.16&&this.colors){
    const before=this.history.at(-2);
    const previous=before&&this.bank.byId[before.part];
    const oldFilm=previous&&this.recordings[previous.source];
    const oldColor=oldFilm&&palette(oldFilm,previous.to);
    if(oldColor){const f=clamp((seconds-this.start)/.16,0,1);
     this.colors=this.colors.map((v,i)=>Math.round(oldColor[i]*(1-f)+v*f));}
   }
   const delta=Math.max(0,seconds-this.lastTime);
   this._emptySince=walls.length?0:this._emptySince+delta;
   this.maxObservedGap=Math.max(this._emptySince,this.maxObservedGap);
   // Arrival proxy: new source actors crossing/appearing outside radius 180.
   // Not a reconstruction of off-screen original spawn commands.
   let arriving=false;
   for(const wall of walls){
    if(this._seenNew.has(wall.id))continue;
    this._seenNew.add(wall.id);
    if(maxRadius(wall)>180)arriving=true;
   }
   if(arriving){this.outerArrivalEvents++;this.maxSpawnGap=Math.max(this.maxSpawnGap,seconds-this.lastArrival);this.lastArrival=seconds;}
   this.lastTime=seconds;
   this.last={walls,angle:camera,zoom:frame.zoom,sides:frame.sides,
      replayFrame:k,source:this.source,partId:this.activePart};
   return this.last;
  }
 }
 return Object.freeze({FPS,RATE,makeBank,Session,create:(recordings,manifest,opts)=>new Session(recordings,manifest,opts),
  inside,blocked,mask,isSafe,incomingDelay,radialSignature,radialMismatch});
});