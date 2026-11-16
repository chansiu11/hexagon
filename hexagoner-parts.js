/* HEXAGONER task 2-2: source-only connected dodge phrases.
 * No previous HEXAGONER generators or stage-zero pattern data are used.
 * Each phrase is a complete chronological portion of a single independently
 * vector-traced source film. Camera is aligned on entering a new phrase.
 * The outgoing actors already visible at a cut retain IDs, geometry and
 * collision until their filmed continuation leaves the core. No hard reset
 * is performed at game time 60s; part eligibility only changes at a seam.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HexagonerParts=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const TAU=Math.PI*2, FPS=20, ORBIT=66, PLAYER_SPEED=8.2;
 const CUTS=Object.freeze({
  '1595':Object.freeze([0,106,226,312,418,530,603,715,825,931,1032,1153,1261,1390,1493,1620,1718,1836,1940]),
  '1596':Object.freeze([0,124,226,317,428,510,610,741,862,945,1037,1145,1255,1367,1490,1563,1679,1788,1921,2089])
 });
 const wrap=a=>((a%TAU)+TAU)%TAU;
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 const ease=n=>{const t=clamp(n,0,1);return t*t*(3-2*t);};
 function randomSource(seed){
  let x=(Number(seed)>>>0)||0x9e3779b9;
  return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
 }
 function inside(x,y,vertices){
  let yes=false;
  for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){
   const a=vertices[i],b=vertices[j];
   const cross=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
   if(Math.abs(cross)<1e-7&&x>=Math.min(a[0],b[0])-1e-7&&x<=Math.max(a[0],b[0])+1e-7&&
      y>=Math.min(a[1],b[1])-1e-7&&y<=Math.max(a[1],b[1])+1e-7)return true;
   if((a[1]>y)!==(b[1]>y)&&x<a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]))yes=!yes;
  }
  return yes;
 }
 function occupied(frame,x,y){
  return frame.walls.some(w=>inside(x,y,w.points)&&!(w.holes||[]).some(h=>inside(x,y,h)));
 }
 const SLOTS=36,DT=.1,STEPS=9;
 const radiusByRing=[ORBIT,108,170,240];
 function signature(frame){
  const output=new Uint8Array(SLOTS*radiusByRing.length);
  for(let ring=0;ring<radiusByRing.length;ring++){
   const r=radiusByRing[ring];
   for(let k=0;k<SLOTS;k++){
    const a=(k+.5)*TAU/SLOTS;
    output[ring*SLOTS+k]=occupied(frame,r*Math.cos(a),r*Math.sin(a))?1:0;
   }
  }
  return output;
 }
 function signatureDistance(a,b,shiftSlots=0){
  let v=0;
  for(let i=0;i<a.length;i++){
   const ring=Math.floor(i/SLOTS),slot=i%SLOTS;
   if(a[i]!==b[ring*SLOTS+(slot+shiftSlots+SLOTS)%SLOTS])v+=i<SLOTS*2?2:1;
  }
  return v/(SLOTS*6);
 }
 function entryMasks(part,replay){
  const result=[];
  for(let s=0;s<STEPS;s++){
   const i=Math.min(part.to,part.from+Math.round(s*DT*FPS/replay.gameRate));
   result.push(signature(replay.frames[i]).slice(0,SLOTS));
  }
  return result;
 }
 function exitTailMasks(part,replay){
  const base=replay.frames[part.to];
  const ids=new Set(base.walls.map(w=>w.id));
  const result=[];
  for(let s=0;s<STEPS;s++){
   const i=Math.min(replay.frames.length-1,part.to+Math.round(s*DT*FPS/replay.gameRate));
   const f=replay.frames[i];
   result.push(signature({...f,walls:f.walls.filter(w=>ids.has(w.id))}).slice(0,SLOTS));
  }
  return result;
 }
 function makeBank(recordings){
  if(!recordings?.['1595']||!recordings?.['1596'])throw Error('HEXAGONER needs both independent source recordings');
  const all=[],pre=[],post=[],byId={};
  for(const id of ['1595','1596']){
   const replay=recordings[id],cuts=CUTS[id];
   if(replay.fps!==FPS||replay.frames.length!==cuts.at(-1)+1)
    throw Error('HEXAGONER source frame count mismatch '+id);
   if(Math.abs(replay.gameRate-25/24)>.05)throw Error('Unexpected HEXAGONER film clock calibration');
   for(let i=0;i<cuts.length-1;i++){
    const from=cuts[i],to=cuts[i+1];
    const first=replay.frames[from],last=replay.frames[to];
    const part={id:id+'-'+String(i).padStart(2,'0'),source:id,index:i,
     from,to,first,last,sideIn:first.sides,sideOut:last.sides,
     sourceStart:from/FPS*replay.gameRate,
     duration:(to-from)/FPS*replay.gameRate,
     entrySignature:signature(first),exitSignature:signature(last)};
    part.entryMasks=entryMasks(part,replay);
    part.exitTailMasks=exitTailMasks(part,replay);
    Object.freeze(part);
    all.push(part);byId[part.id]=part;
    (part.sourceStart<60?pre:post).push(part);
   }
  }
  return {all,pre,post,byId,recordings};
 }
 function rotatePolygon(points,delta,scale){
  const c=Math.cos(delta)*scale,s=Math.sin(delta)*scale;
  return points.map(([x,y])=>[x*c-y*s,x*s+y*c]);
 }
 function interpolatePath(a,b,t){
  if(t<=1e-7||a===b)return a;
  if(a.length!==b.length||a.length>60)return t<.5?a:b;
  // The two sampled source arrays repeat at 240Hz; cache winding alignment.
  const cache=interpolatePath._shifts||(interpolatePath._shifts=new WeakMap());
  let matches=cache.get(a);
  if(!matches){matches=new WeakMap();cache.set(a,matches);}
  let index=matches.get(b);
  if(index===undefined){
   let best=Infinity;index=0;
   for(let shift=0;shift<a.length;shift++){
    let sum=0;
    for(let k=0;k<a.length;k++){
     const [x,y]=a[k],p=b[(k+shift)%b.length];
     sum+=(x-p[0])**2+(y-p[1])**2;
    }
    if(sum<best){best=sum;index=shift;}
   }
   matches.set(b,index);
  }
  return a.map(([x,y],k)=>{
   const q=b[(k+index)%b.length];return [x+(q[0]-x)*t,y+(q[1]-y)*t];
  });
 }
 function frameBetween(a,b,t){
  if(t<=1e-6)return a;
  const future=new Map(b.walls.map(w=>[w.id,w]));
  const done=new Set(),walls=[];
  for(const w of a.walls){
   const next=future.get(w.id);
   if(next){
    done.add(w.id);
    walls.push({id:w.id,points:interpolatePath(w.points,next.points,t),
     holes:w.holes?.length===next.holes?.length?
      w.holes.map((h,i)=>interpolatePath(h,next.holes[i],t)):(w.holes||[]),
     sourceFrame:w.sourceFrame});
   }else if(t<.5)walls.push(w);
  }
  if(t>=.5)for(const w of b.walls)if(!done.has(w.id))walls.push(w);
  return {angle:a.angle+(b.angle-a.angle)*t,zoom:a.zoom+(b.zoom-a.zoom)*t,
   sides:t<.5?a.sides:b.sides,walls};
 }
 function samplePart(part,bank,elapsed){
  const replay=bank.recordings[part.source],p=part.from+clamp(elapsed*FPS/replay.gameRate,0,part.to-part.from);
  const i=clamp(Math.floor(p),part.from,part.to),j=Math.min(part.to,i+1),t=p-i;
  return {frame:frameBetween(replay.frames[i],replay.frames[j],t),index:i};
 }
 function carryTail(part,bank,seconds){
  // A recorded wall that was already visible at the seam remains the *same*
  // wall, never replaced by a newly generated source actor at game time 60.
  const replay=bank.recordings[part.source];
  const cut=part.to,base=replay.frames[cut];
  const k=clamp(cut+Math.floor(seconds*FPS/replay.gameRate),cut,replay.frames.length-1);
  const frame=replay.frames[k],living=new Map(frame.walls.map(w=>[w.id,w]));
  const retained=[];
  for(const initial of base.walls){
   const continued=living.get(initial.id);
   if(continued){retained.push(continued);continue;}
   // Broken contour identity is not proof that a travelling wall vanished:
   // preserve its last observed geometry and estimated velocity briefly.
   // Do not invent a new wall or retain a finished one forever.
   if(seconds>1.5)continue;
   const [rawX,rawY]=initial.estimatedVelocity||[0,0];
   const center=initial.points.reduce((p,q)=>[p[0]+q[0]/initial.points.length,p[1]+q[1]/initial.points.length],[0,0]);
   const length=Math.hypot(...center)||1;
   // Wall movement is primarily towards the core. Filter obviously wrong
   // cross-actor tracking jumps before carrying an unmatched contour.
   const projected=(rawX*center[0]+rawY*center[1])/length;
   const radial=projected<-30?clamp(projected,-380,-45):-180;
   const tangential=clamp((rawX*(-center[1])+rawY*center[0])/length,-100,100);
   const vx=radial*center[0]/length-tangential*center[1]/length;
   const vy=radial*center[1]/length+tangential*center[0]/length;
   const translate=ring=>ring.map(([x,y])=>[x+vx*seconds,y+vy*seconds]);
   retained.push({...initial,points:translate(initial.points),
    holes:(initial.holes||[]).map(translate)});
  }
  return {frame:{...frame,walls:retained},index:k};
 }
 function entryReachable(previous,next,angle,speed=PLAYER_SPEED,shiftSlots=0){
  // Discrete reachability in 0.1s steps. Masks are sampled from *actual*
  // polygons at the playable orbit. Outgoing actors and new walls are united.
  // At the instant of the join, the present ship must not be occupied.
  const old=previous.exitTailMasks,up=next.entryMasks;
  let candidates=new Set();
  const slot=((Math.floor(wrap(angle)/TAU*SLOTS))%SLOTS+SLOTS)%SLOTS;
  if((old[0][slot]||up[0][(slot+shiftSlots)%SLOTS]))return false;
  candidates.add(slot);
  const maxMove=Math.floor(speed*DT/TAU*SLOTS+1e-9);
  if(maxMove<1)return false;
  for(let t=1;t<STEPS;t++){
   const nextSet=new Set();
   for(const pos of candidates)for(let shift=-maxMove;shift<=maxMove;shift++){
    const current=(pos+shift+SLOTS)%SLOTS;
    if(!old[t][current]&&!up[t][(current+shiftSlots)%SLOTS])nextSet.add(current);
   }
   if(!nextSet.size)return false;
   candidates=nextSet;
  }
  return true;
 }
 function sourcePalette(part,bank,sourceFrame){
  const replay=bank.recordings[part.source];
  const palette=replay.palette;
  if(!palette||!Array.isArray(palette.colors))return null;
  const i=clamp(Math.floor(sourceFrame/replay.fps*palette.fps),0,palette.colors.length-1);
  return palette.colors[i];
 }
 class Session{
  constructor(recordings,opts={}){
   this.bank=makeBank(recordings);this.recordings=this.bank.recordings;
   this.fps=FPS;this.kind='parts';this.id='hexagoner-filmed-parts';
   this.seed=finite(opts.seed)?opts.seed:Date.now();this.random=randomSource(this.seed);
   this.speed=finite(opts.playerSpeed)?opts.playerSpeed:PLAYER_SPEED;
   const openings=this.bank.all.filter(p=>p.from===0);
   this.current=openings.find(p=>p.source===opts.firstSource)||openings[Math.floor(this.random()*openings.length)];
   this.start=0;this.cameraOffset=0;this.partFrame=0;
   this.source=this.current.source;this.sourceFrame=0;
   this.epoch=0;this.activePart=this.current.id;this.transitions=0;
   this.history=[{at:0,part:this.current.id,source:this.source,epoch:0}];
   this.replayFrame=-1;this.colors=null;this.carry=[];this.lastTime=0;
   this.last=null;this.maxObservedGap=0;this._emptyDuration=0;this.maxSpawnGap=0;
   this._pendingPlayerDelta=0;
   this.nextRunId=1;this.activeRunId=1;
  }
  choose(now,playerAngle){
   const previous=this.current;
   const pool=(now>=60?this.bank.post:this.bank.pre);
   const candidate=[];
   for(const part of pool){
    if(part.from===0||part.sideIn!==previous.sideOut)continue;
    let bestShift=null;
    const contiguous=part.source===previous.source&&part.from===previous.to;
    for(let k=0;k<(contiguous?1:part.sideIn);k++){
     const shiftBins=Math.round(k*SLOTS/part.sideIn);
     if(entryReachable(previous,part,playerAngle,this.speed,shiftBins)){
      const mismatch=signatureDistance(previous.exitSignature,part.entrySignature,shiftBins);
      if(!bestShift||mismatch<bestShift.mismatch)bestShift={shiftBins,sectorShift:k,mismatch};
     }
    }
    if(!bestShift)continue;
    const recent=this.history.slice(-6).some(h=>h.part===part.id)?0.95:0;
    const repeat=part.id===previous.id?2:0;
    const compatibility=bestShift.mismatch;
    const sameSource=part.source===previous.source?.1:0;
    const score=compatibility*3+recent+repeat+sameSource;
    candidate.push({part,score,sectorShift:bestShift.sectorShift});
   }
   if(!candidate.length){
    // Keep original footage order where possible rather than spawning walls
    // across an impossible junction. This remains an explicitly audited fallback.
    const neighbor=this.bank.all.find(p=>p.source===previous.source&&p.from===previous.to);
    if(neighbor&&neighbor.sideIn===previous.sideOut)
     return {part:neighbor,score:Infinity,fallback:true,sectorShift:0};
    // A spectator can stand in an outgoing blocked lane that would have
    // ended a real run. Avoid ending the film bank: choose the safest newly
    // arriving lane among rotated, screen-aligned candidates. This route is
    // explicitly flagged; it is NOT proof that a real player could survive.
    const currentSlot=Math.floor(wrap(playerAngle)/TAU*SLOTS)%SLOTS;
    let lastResort=null;
    for(const part of pool){
     if(part.from===0||part.sideIn!==previous.sideOut)continue;
     for(let sectorShift=0;sectorShift<part.sideIn;sectorShift++){
      const shiftSlots=Math.round(sectorShift*SLOTS/part.sideIn);
      let risk=0;
      for(let step=0;step<STEPS;step++){
       const occupiedHere=part.entryMasks[step][(currentSlot+shiftSlots)%SLOTS];
       risk+=occupiedHere*(STEPS-step);
      }
      risk+=signatureDistance(previous.exitSignature,part.entrySignature,shiftSlots)*4;
      if(!lastResort||risk<lastResort.risk)
       lastResort={part,sectorShift,risk,score:Infinity,fallback:true,unverified:true};
     }
    }
    return lastResort;
   }
   candidate.sort((a,b)=>a.score-b.score);
   const top=candidate.slice(0,Math.min(5,candidate.length));
   let draw=this.random()*top.reduce((n,_,i)=>n+1/(1+i),0);
   for(let i=0;i<top.length;i++){
    draw-=1/(i+1);if(draw<=0)return top[i];
   }
   return top.at(-1);
  }
  _cross(time,playerAngle){
   const outgoing=this.current,deadline=this.start+outgoing.duration;
   const selected=this.choose(deadline,playerAngle);
   if(!selected){
    // No candidate is preferable to teleporting a blocking wall on top of the ship.
    this.ended=true;return;
   }
   const reference=outgoing.last.angle+this.cameraOffset;
   const contiguous=outgoing.source===selected.part.source&&outgoing.to===selected.part.from;
   // A natural adjacent source interval already continues the same actor; do
   // not render it twice or give it a new identity at a source-phrase cut.
   if(!contiguous){
    this.carry.push({part:outgoing,start:deadline,offset:this.cameraOffset,runId:this.activeRunId});
    this.activeRunId=++this.nextRunId;
   }
   this.carry=this.carry.filter(c=>deadline-c.start<1.5);
   this.start=deadline;this.current=selected.part;
   const shift=(selected.sectorShift||0)*TAU/selected.part.sideIn;
   this.cameraOffset=reference-selected.part.first.angle-shift;
   this._pendingPlayerDelta+=shift;
   this.source=this.current.source;this.activePart=this.current.id;
   this.transitions++;
   this.history.push({at:deadline,part:this.current.id,source:this.source,
    epoch:deadline<60?0:1,fallback:!!selected.fallback,unverified:!!selected.unverified,score:selected.score,sectorShift:selected.sectorShift||0});
  }
  sample(seconds,playerAngle=TAU/12){
   if(!finite(seconds)||seconds<0)throw RangeError('Invalid HEXAGONER game time');
   if(seconds+1e-8<this.lastTime)throw RangeError('HEXAGONER phrase playback must be monotonic');
   let guard=0;
   while(!this.ended&&seconds>=this.start+this.current.duration-1e-9){
    this._cross(seconds,playerAngle);
    if(++guard>2000)throw Error('Infinite source-phrase switching');
   }
   const position=samplePart(this.current,this.bank,seconds-this.start),frame=position.frame;
   this.source=this.current.source;this.sourceFrame=position.index;
   this.replayFrame=position.index;this.activePart=this.current.id;
   const camera=frame.angle+this.cameraOffset;
   const walls=frame.walls.map(w=>({...w,id:this.activeRunId+':'+w.id}));
   const still=[];
   for(const c of this.carry){
    const elapsed=seconds-c.start;
    if(elapsed<0||elapsed>2.2)continue;
    const tail=carryTail(c.part,this.bank,elapsed);
    const phase=tail.frame.angle+c.offset-camera;
    const scale=tail.frame.zoom/frame.zoom;
    for(const w of tail.frame.walls){
     const points=rotatePolygon(w.points,phase,scale);
     // Once a filmed actor has fully crossed the central core, retire it.
     if(Math.max(...points.map(([x,y])=>Math.hypot(x,y)))<38)continue;
     walls.push({...w,id:c.runId+':'+w.id,points,
      holes:(w.holes||[]).map(ring=>rotatePolygon(ring,phase,scale))});
    }
    if(tail.frame.walls.length)still.push(c);
   }
   this.carry=still;
   this.colors=sourcePalette(this.current,this.bank,position.index);
   if(this.transitions&&seconds-this.start<.24&&this.colors){
    const previous=this.history.at(-2);
    const oldPart=previous&&this.bank.byId[previous.part];
    const oldColor=oldPart&&sourcePalette(oldPart,this.bank,oldPart.to);
    if(oldColor){const t=ease((seconds-this.start)/.24);
     this.colors=this.colors.map((v,i)=>Math.round(oldColor[i]*(1-t)+v*t));}
   }
   this.epoch=seconds<60?0:1;
   const delta=seconds-this.lastTime;
   this._emptyDuration=walls.length?0:this._emptyDuration+Math.max(0,delta);
   this.maxObservedGap=Math.max(this._emptyDuration,this.maxObservedGap);
   this.lastTime=seconds;
   this.last={angle:camera,zoom:frame.zoom,sides:frame.sides,walls,
    replayFrame:position.index,source:this.source,partId:this.current.id,playerAngleDelta:this._pendingPlayerDelta};
   this._pendingPlayerDelta=0;
   return this.last;
  }
 }
 return Object.freeze({CUTS,FPS,PLAYER_SPEED,makeBank,Session,create:(recordings,opts)=>new Session(recordings,opts),
  entryReachable,inside,signature,frameBetween});
});