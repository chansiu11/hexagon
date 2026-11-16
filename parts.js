/* HEXAGON, 1-3: video-grounded connected avoidance phrases.
 * No old wave generators. All contours, speeds and camera paths are taken
 * from the two independent 20fps reference traces from task 1-2.
 * Only the ORDER of full filmed phrases is randomized.
 * The seams are selected where near-core wall occupancy was low and the
 * recorded core shape was stable, NOT at arbitrary 60s or wall crossings.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HexParts=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const TAU=Math.PI*2;
 const FPS=20;
 const CUTS=Object.freeze({
  '1595':[0,97,206,297,432,506,595,679,758,878,958,1045,1158,1259,1346,1499,1600,1720,1846,1942,2051,2202,2300,2395,2507,2630,2740,2834,2935,3042,3102,3208,3360,3532],
  '1596':[0,98,208,317,434,570,711,772,894,1029,1142,1250,1407,1497,1588,1679,1779,1850,1936,2037,2206]
 });
 const wrap=n=>((n%TAU)+TAU)%TAU;
 const finite=n=>Number.isFinite(n)&&typeof n==='number';
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const lerp=(a,b,t)=>a+(b-a)*t;
 const shapeRings=[82,104,138,190,255];
 const SIGN_N=36;
 const MAX_BRIDGE=.27;
 function pointInside(x,y,vertices){
  let inside=false;
  for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){
   const a=vertices[i],b=vertices[j];
   if((a[1]>y)!==(b[1]>y)&&x<a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]))inside=!inside;
   const dx=b[0]-a[0],dy=b[1]-a[1];
   if(Math.abs(dx*(y-a[1])-dy*(x-a[0]))<1e-8&&
    x>=Math.min(a[0],b[0])-1e-8&&x<=Math.max(a[0],b[0])+1e-8&&
    y>=Math.min(a[1],b[1])-1e-8&&y<=Math.max(a[1],b[1])+1e-8)return true;
  }
  return inside;
 }
 function occupied(frame,x,y){
  for(const w of frame.walls){
   if(w.opacity!==undefined&&w.opacity<.5)continue;
   if(pointInside(x,y,w.points)&&!(w.holes||[]).some(h=>pointInside(x,y,h)))return true;
  }
  return false;
 }
 function mask(frame){
  const result=new Uint8Array(SIGN_N*shapeRings.length);
  for(let r=0;r<shapeRings.length;r++){
   const radius=shapeRings[r];
   for(let a=0;a<SIGN_N;a++){
    const angle=TAU*a/SIGN_N;
    result[r*SIGN_N+a]=occupied(frame,Math.cos(angle)*radius,Math.sin(angle)*radius)?1:0;
   }
  }
  return result;
 }
 function distMasks(oldM,newM,shiftSectors,sides){
  let diff=0,total=0;
  const shift=shiftSectors*SIGN_N/sides;
  for(let r=0;r<shapeRings.length;r++){
   const weight=r<3?1.8:1;
   for(let i=0;i<SIGN_N;i++){
    const target=wrapIndex(Math.round(i-shift),SIGN_N);
    diff+=weight*Math.abs(oldM[r*SIGN_N+i]-newM[r*SIGN_N+target]);
    total+=weight;
   }
  }
  return diff/total;
 }
 function wrapIndex(v,mod){return ((v%mod)+mod)%mod;}
 function seedRandom(seed){
  let state=(Number(seed)>>>0)||0x6a09e667;
  return ()=>{state^=state<<13;state^=state>>>17;state^=state<<5;
   return (state>>>0)/4294967296;};
 }
 function makeBank(recordings){
  if(!recordings||!recordings['1595']||!recordings['1596'])throw new Error('Both source-video traces required');
  const bank=[],byId={};
  for(const id of ['1595','1596']){
   const replay=recordings[id],cuts=CUTS[id];
   if(!replay.frames||replay.frames.length!==cuts[cuts.length-1]+1)
    throw new Error('Source '+id+' does not match separately measured part boundaries');
   byId[id]=replay;
   for(let i=0;i<cuts.length-1;i++){
    const from=cuts[i],to=cuts[i+1],first=replay.frames[from],last=replay.frames[to];
    const sourceTime=replay.gameStartOffset+from/FPS*replay.gameRate;
    const part={id:id+'-'+String(i).padStart(2,'0'),source:id,from,to,
     duration:(to-from)/FPS*replay.gameRate,epoch:sourceTime<60?0:1,
     sideIn:first.sides,sideOut:last.sides,
     first,last,entrySignature:mask(first),exitSignature:mask(last),
     sourceStartTime:sourceTime};
    Object.freeze(part);bank.push(part);
   }
  }
  return {bank,recordings:byId,pre:bank.filter(p=>p.epoch===0),post:bank.filter(p=>p.epoch===1)};
 }
 function pathInterpolate(a,b,t){
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||a.length>44)return t<.5?a:b;
  if(t<=0)return a;if(t>=1)return b;
  // OpenCV can choose a different first contour vertex for the same wall.
  // Find cyclic alignment once per new sample, cached by both polygon arrays.
  let cache=pathInterpolate._cache;
  if(!cache){cache=new WeakMap();pathInterpolate._cache=cache;}
  let shifts=cache.get(a);
  if(!shifts){shifts=new WeakMap();cache.set(a,shifts);}
  let shift=shifts.get(b);
  if(shift===undefined){
   const n=a.length;
   let best=Infinity,match=0;
   for(let k=0;k<n;k++){
    let s=0;
    for(let i=0;i<n;i++){
     const v=a[i],w=b[(i+k)%n];
     s+=(v[0]-w[0])**2+(v[1]-w[1])**2;
    }
    if(s<best){best=s;match=k;}
   }
   shift=match;shifts.set(b,shift);
  }
  return a.map((p,i)=>[lerp(p[0],b[(i+shift)%a.length][0],t),
   lerp(p[1],b[(i+shift)%a.length][1],t)]);
 }
 function interpolateFrame(a,b,fraction){
  const t=clamp(fraction,0,1);
  if(t<=1e-7||a===b)return a;
  const next=new Map(b.walls.map(w=>[w.id,w]));
  const used=new Set(),walls=[];
  for(const wa of a.walls){
   const wb=next.get(wa.id);
   if(wb){
    used.add(wb.id);
    const holes=wa.holes.length===wb.holes.length?
     wa.holes.map((h,i)=>pathInterpolate(h,wb.holes[i],t)):wa.holes;
    walls.push({id:wa.id,points:pathInterpolate(wa.points,wb.points,t),holes,opacity:1});
   }else if(t<.5)walls.push(wa);
  }
  if(t>=.5)for(const wb of b.walls)if(!used.has(wb.id))walls.push(wb);
  return {angle:lerp(a.angle,b.angle,t),zoom:lerp(a.zoom,b.zoom,t),
   sides:t<.5?a.sides:b.sides,walls};
 }
 function at(part,recordings,elapsed,tail=false){
  const replay=recordings[part.source];
  const last=tail?Math.min(replay.frames.length-1,part.to+10):part.to;
  const position=part.from+clamp(elapsed*FPS/replay.gameRate,0,last-part.from);
  const i=Math.min(last,Math.max(part.from,Math.floor(position+1e-9)));
  const j=Math.min(last,i+1);
  const t=position-i;
  return {index:i,frame:interpolateFrame(replay.frames[i],replay.frames[j],t),
   sourceTime:replay.gameStartOffset+i/FPS*replay.gameRate};
 }
 function paletteAt(replay,index){
  const pal=replay.palette;
  if(!pal||!Array.isArray(pal.colors)||!pal.colors.length)return null;
  return pal.colors[clamp(Math.floor(index/FPS*pal.fps),0,pal.colors.length-1)];
 }
 function canOccupy(replay,part,offset,oldPlayer){
  const sides=part.sideIn;
  const newAngle=wrap(oldPlayer-offset);
  const x=Math.cos(newAngle)*66,y=Math.sin(newAngle)*66;
  for(let k=0;k<=5;k++){
   const fr=replay.frames[Math.min(part.from+k,part.to)];
   if(occupied(fr,x,y))return false;
  }
  return true;
 }
 class Session {
  constructor(recordings,options={}){
   const collection=makeBank(recordings);
   this.bank=collection.bank;this.recordings=collection.recordings;
   this.pre=collection.pre;this.post=collection.post;
   this.id='random-parts';this.kind='parts';this.fps=FPS;
   this.seed=Number.isFinite(+options.seed)?Number(options.seed):Date.now();
   this.random=seedRandom(this.seed);
   this.used=[];this.history=[];this.transitions=0;
   this.start=0;this.currentOffset=0;this.last=null;this.bridge=null;
   const first=this.bank.filter(p=>p.from===0);
   const startSource=options.firstSource;
   this.current=first.find(p=>p.source===startSource)||first[Math.floor(this.random()*first.length)];
   this.source=this.current.source;this.sourceFrame=this.current.from;
   this.activePart=this.current.id;this.epoch=0;this.colors=null;
   this.history.push({at:0,part:this.current.id,source:this.source,epoch:0});
  }
  choose(time,oldCamera,oldPlayer){
   const sides=this.current.sideOut;
   const candidates=(time>=60?this.post:this.pre).filter(p=>p.sideIn===sides);
   if(!candidates.length)throw new Error('No compatible filmed part after time '+time+' sides '+sides);
   const ranked=[];
   const outMask=this.current.exitSignature;
   for(const part of candidates){
    const replay=this.recordings[part.source];
    let best=null;
    // Rotations align sector geometry, without rotating the player's
    // on-screen position. Camera phase is counter-offset automatically.
    for(let step=0;step<sides;step++){
     const shift=step*TAU/sides;
     if(!canOccupy(replay,part,shift,oldPlayer))continue;
     const continuity=distMasks(outMask,part.entrySignature,step,sides);
     // Avoid only ever playing the same video or neighboring phrase.
     const recent=this.used.slice(-4).includes(part.id)?1.0:0;
     const same=part.id===this.current.id?2:0;
     const streak=this.current.source===part.source?.06:0;
     const score=continuity*4+recent+same+streak;
     if(!best||score<best.score)best={part,step,shift,score};
    }
    if(best)ranked.push(best);
   }
   if(!ranked.length){
    // Invalid transition: keep the original contiguous footage as a safety
    // fallback instead of allowing an impossible full-circle wall.
    const sourceCandidates=candidates.filter(p=>p.source===this.current.source&&p.from===this.current.to);
    const safe=sourceCandidates[0]||candidates[0];
    return {part:safe,step:0,shift:0,score:Infinity,fallback:true};
   }
   ranked.sort((a,b)=>a.score-b.score);
   // Randomness is limited to the *compatible* top choices; no fake patterns.
   const top=ranked.slice(0,Math.min(4,ranked.length));
   let weights=top.map((_,i)=>1/(1.4+i*1.5));
   let draw=this.random()*weights.reduce((a,b)=>a+b,0),result=top[0];
   for(let i=0;i<top.length;i++){draw-=weights[i];if(draw<=0){result=top[i];break;}}
   return result;
  }
  sample(seconds,playerAngle=TAU/12){
   if(!finite(seconds)||seconds<0)throw new RangeError('Invalid game time');
   // A simulated tick crosses a seam exactly once; source clip durations
   // (4–9s) and accumulated game seconds remain independent.
   let correction=0;
   while(seconds>=this.start+this.current.duration-1e-8){
    if(this.history.length>1000)throw new RangeError('Unexpected session segment count');
    const boundary=this.start+this.current.duration;
    const previous=this.current,previousOffset=this.currentOffset;
    const lastCamera=previous.last.angle+previousOffset;
    const choice=this.choose(boundary,lastCamera,playerAngle+correction);
    const next=choice.part;
    this.bridge={part:previous,offset:previousOffset,start:boundary,until:boundary+MAX_BRIDGE};
    this.start=boundary;this.current=next;this.currentOffset=lastCamera-next.first.angle+choice.shift;
    // When the camera is rotated by k sides, counter-rotate the local ship
    // by k sides, keeping its visible position unchanged.
    correction-=choice.shift;
    this.transitions++;
    this.used.push(previous.id);
    if(this.used.length>8)this.used.shift();
    this.source=next.source;this.activePart=next.id;this.epoch=boundary<60?0:1;
    this.history.push({at:boundary,part:next.id,source:this.source,epoch:this.epoch,
     score:choice.score,rotation:choice.shift});
   }
   const info=at(this.current,this.recordings,seconds-this.start);
   const frame=info.frame;
   const camera=frame.angle+this.currentOffset;
   let walls=frame.walls;
   const bridge=this.bridge;
   if(bridge&&seconds<bridge.until){
    const opacity=clamp((seconds-bridge.start)/MAX_BRIDGE,0,1);
    const tail=at(bridge.part,this.recordings,
     bridge.part.duration+(seconds-bridge.start),true);
    // Full-strength wall corridors are never overlapped. At seam frames,
    // both outgoing and incoming fields are visible, but transient fade
    // fragments cannot trigger invisible-wall death.
    walls=[...tail.frame.walls.map(w=>({...w,id:bridge.part.id+':'+w.id,
      opacity:1-opacity})),...walls.map(w=>({...w,id:this.current.id+':'+w.id,opacity}))];
   }else if(bridge)this.bridge=null;
   this.sourceFrame=info.index;
   this.colors=paletteAt(this.recordings[this.current.source],info.index);
   this.sourceTime=info.sourceTime;
   this.activePart=this.current.id;
   this.epoch=seconds<60?0:1;
   this.last={angle:camera,sides:frame.sides,zoom:frame.zoom,walls,
    replayFrame:info.index,partId:this.current.id,source:this.current.source,
    playerAngleDelta:correction};
   return this.last;
  }
 }
 function create(recordings,options){return new Session(recordings,options);}
 return Object.freeze({CUTS,create,makeBank,Session,mask,distMasks,pointInside});
});