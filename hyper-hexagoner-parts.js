/* HYPER HEXAGONER 5-2: randomized video-derived dodge phrases, separate
 * from stage-4 HYPER HEXAGON and from all obsolete stage-5 generators.
 *
 * There are deliberately NO built-in walls, colors, camera settings or
 * fabricated source cut times. BOTH independently verified stage-5 films
 * must be supplied by 5-1 for the real game to start. Part boundaries are
 * selected from the actual wall-ID timeline; their quality is audited,
 * not automatically asserted to be identical to the author's patterns.
 *
 * At non-contiguous joins:
 *  - incoming actors already in the new film at its chosen cut are excluded
 *    (they belong to the previous, unplayed portion of that film);
 *  - existing outgoing actors keep their unique IDs and sample their own
 *    original recording UNTIL disappearance; no fixed-life purge or teleport;
 *  - new actors enter only at their first observed source frame, and
 *    candidates with dangerous interior births are rejected.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HyperHexagonerParts=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const IDS=['1595','1596'],TAU=Math.PI*2,ORBIT=66,FPS=60;
 const SLOTS=48,STEP=.125,LOOKAHEAD=9;
 const MIN_PART_SECONDS=1.15,MAX_PART_SECONDS=3.9;
 const MIN_SAFE_BIRTH_RADIUS=165,MAX_ENTRY_DELAY=1;
 const finite=v=>typeof v==='number'&&Number.isFinite(v);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const wrap=v=>((v%TAU)+TAU)%TAU;
 const turn=(pts,rad)=>{const c=Math.cos(rad),s=Math.sin(rad);
  return pts.map(([x,y])=>[x*c-y*s,x*s+y*c]);
 };
 const rotateWall=(w,rad,id,scale=1)=>{
  const transform=ring=>turn(ring,rad).map(([x,y])=>[x*scale,y*scale]);
  return {...w,id,points:transform(w.points),
   holes:(w.holes||[]).map(transform)};
 };
 const radius=w=>Math.max(...w.points.map(([x,y])=>Math.hypot(x,y)));
 function rng(seed){let x=(Number(seed)>>>0)||0x9e3779b9;
  return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
 }
 function occupied(w,x,y){
  // The SAME contour and interior holes used by the shared gameplay engine.
  const inside=(poly)=>{
   let yes=false;
   for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const [ax,ay]=poly[j],[bx,by]=poly[i];
    const cross=(bx-ax)*(y-ay)-(by-ay)*(x-ax);
    if(Math.abs(cross)<1e-7&&x>=Math.min(ax,bx)-1e-7&&
       x<=Math.max(ax,bx)+1e-7&&y>=Math.min(ay,by)-1e-7&&
       y<=Math.max(ay,by)+1e-7)return true;
    if((ay>y)!==(by>y)){
      const at=ax+(y-ay)*(bx-ax)/(by-ay);
      if(x<at)yes=!yes;
    }
   }
   return yes;
  };
  return inside(w.points)&&!(w.holes||[]).some(inside);
 }
 const bins=Array.from({length:SLOTS},(_,i)=>{
  const a=(i+.5)*TAU/SLOTS;return [ORBIT*Math.cos(a),ORBIT*Math.sin(a)];
 });
 function actorFrame(film,idx){
  return film.frames[clamp(idx,0,film.frames.length-1)];
 }
 function sourceIndex(film,sourceStart,seconds){
  return clamp(sourceStart+Math.floor(seconds*film.fps/film.gameRate+1e-8),0,film.frames.length-1);
 }
 function bornAfter(frames,from,to){
  const existing=new Set(frames[from].walls.map(w=>w.id));
  const born=new Map();
  for(let i=from+1;i<=to;i++)for(const w of frames[i].walls){
   if(!existing.has(w.id)&&!born.has(w.id))born.set(w.id,i);
  }
  return born;
 }
 function firstBirth(part,film){
  let delay=Infinity,unsafe=false,frame=-1;
  for(const [id,idx] of part.births){
   const candidate=film.frames[idx].walls.find(w=>w.id===id);
   if(!candidate)continue;
   const dt=(idx-part.from)*film.gameRate/FPS;
   if(dt>MAX_ENTRY_DELAY+1e-6)continue;
   const r=radius(candidate);
   if(r<MIN_SAFE_BIRTH_RADIUS)unsafe=true;
   if(r>=200&&dt<delay){delay=dt;frame=idx;}
  }
  return {delay,unsafe,frame};
 }
 function quietScore(frames,index){
  let score=frames[index].walls.length*4;
  const here=frames[index];
  for(let k=-5;k<=5;k+=5){
   const nearby=frames[index+k];
   if(!nearby)continue;
   if(nearby.sides!==here.sides)score+=100;
   const ids=new Set(nearby.walls.map(w=>w.id));
   for(const w of here.walls){
    const r=radius(w);
    if(r>70&&r<195)score+=4;
    if(!ids.has(w.id))score+=2;
   }
  }
  return score;
 }
 function makeCuts(frames,from,to,rate){
  // Candidate cuts occur near low-density/low-morph portions of each actual
  // chronological source, never at made-up wall times. 60s is mandatory.
  const min=Math.max(20,Math.round(MIN_PART_SECONDS*FPS/rate));
  const max=Math.max(min+10,Math.round(MAX_PART_SECONDS*FPS/rate));
  const cuts=[from];
  while(to-cuts.at(-1)>max+min){
   const prev=cuts.at(-1);
   let best=prev+min,bestScore=Infinity;
   const latest=Math.min(prev+max,to-min);
   for(let i=prev+min;i<=latest;i+=Math.max(1,Math.round(FPS*.10))){
    const score=quietScore(frames,i)+Math.abs(i-(prev+max*.7))/max;
    if(score<bestScore){best=i;bestScore=score;}
   }
   if(best<=prev||to-best<min)break;
   cuts.push(best);
  }
  if(cuts.at(-1)!==to)cuts.push(to);
  return cuts;
 }
 function buildBank(recordings){
  if(!recordings||IDS.some(id=>!recordings[id]))throw Error('Both original HYPER HEXAGONER videos are required');
  const bank={recordings,all:[],pre:[],post:[],byId:new Map(),counts:{}};
  for(const id of IDS){
   const film=recordings[id];
   if(film.id!==id||film.fps!==FPS||!film.independentlyVerified||
      !Array.isArray(film.frames)||!film.frames.length)
    throw Error('Unverified or missing original HYPER HEXAGONER source '+id);
   const boundary=Math.ceil((60-film.gameStartOffset)*FPS/film.gameRate-1e-9);
   if(boundary<1||boundary>=film.frames.length-1)
    throw Error('Full pre-60 and post-60 recorded frames required: '+id);
   const last=film.frames.length-1;
   const epochs=[[0,boundary,0],[boundary,last,1]];
   const count=[0,0];
   for(const [a,b,epoch] of epochs){
    const cuts=makeCuts(film.frames,a,b,film.gameRate);
    for(let i=0;i<cuts.length-1;i++){
     const from=cuts[i],to=cuts[i+1];
     if(to<=from)throw Error('Invalid zero-length film part: '+id);
     const births=bornAfter(film.frames,from,to);
     const p={id:id+'-'+epoch+'-'+i,source:id,epoch,from,to,
      duration:(to-from)/FPS*film.gameRate,
      inSides:film.frames[from].sides,outSides:film.frames[to].sides,
      births,preexisting:new Set(film.frames[from].walls.map(w=>w.id)),
      sourceStartGameTime:film.gameStartOffset+from/FPS*film.gameRate};
     const birth=firstBirth(p,film);
     p.arrivalDelay=birth.delay;
     p.unsafeBirth=birth.unsafe;
     p.firstFreshFrame=birth.frame;
     Object.freeze(p);
     bank.all.push(p);bank.byId.set(p.id,p);
     (epoch?bank.post:bank.pre).push(p);count[epoch]++;
    }
   }
   bank.counts[id]={pre:count[0],post:count[1],boundaryFrame:boundary,
     filmEnd:film.gameStartOffset+last/FPS*film.gameRate};
  }
  if(IDS.some(id=>!bank.pre.some(p=>p.source===id)||!bank.post.some(p=>p.source===id)))
   throw Error('Both verified source videos must contribute in both epochs');
  return bank;
 }
 function atPart(p,film,local){
  return sourceIndex(film,p.from,clamp(local,0,p.duration));
 }
 function sourceWalls(p,film,index,includePreexisting){
  const frame=actorFrame(film,index);
  return includePreexisting?frame.walls:
   frame.walls.filter(w=>p.births.has(w.id)&&p.births.get(w.id)<=index);
 }
 function oldCarriesAt(carries,films,seconds,currentCamera=0,currentZoom=1){
  // A carried actor has its OWN continued filmed camera orientation/zoom.
  // Re-express that actor in the CURRENT camera's world coordinates so its
  // rendered screen position does not jump when a new phrase changes camera.
  const out=[];
  for(const c of carries){
   const elapsed=seconds-c.created;
   if(elapsed<0)continue;
   const film=films[c.source];
   const index=sourceIndex(film,c.frameIndex,elapsed);
   const observed=actorFrame(film,index);
   const actorCamera=observed.angle+c.cameraOffset;
   const actorZoom=observed.zoom*c.zoomRatio;
   const cameraDrift=actorCamera-currentCamera;
   const scale=actorZoom/currentZoom;
   const walls=observed.walls;
   for(const w of walls)if(c.ids.has(w.id))
    out.push(rotateWall(w,c.shift+cameraDrift,c.runId+':'+w.id,scale));
  }
  return out;
 }
 function reachable(playerAngle,speed,oldWallsAt,nextWallsAt){
  if(!finite(speed)||speed<=0)return false;
  const start=Math.floor(wrap(playerAngle)/TAU*SLOTS)%SLOTS;
  const atAngle=(a,t)=>{const x=ORBIT*Math.cos(a),y=ORBIT*Math.sin(a);
   return oldWallsAt(t).concat(nextWallsAt(t)).some(w=>occupied(w,x,y));
  };
  const startA=(start+.5)*TAU/SLOTS;
  if(atAngle(playerAngle,0)&&atAngle(startA,0))return false;
  let states=new Set([start]);
  for(let j=1;j<LOOKAHEAD;j++){
   const t=j*STEP;
   const current=oldWallsAt(t).concat(nextWallsAt(t));
   const midpoint=oldWallsAt(t-STEP/2).concat(nextWallsAt(t-STEP/2));
   const stepMax=Math.floor(speed*STEP/TAU*SLOTS+1e-8);
   if(stepMax<1)return false;
   const found=new Set();
   for(const prev of states)for(let step=-stepMax;step<=stepMax;step++){
    const next=(prev+step+SLOTS*4)%SLOTS;
    const pa=(prev+.5)*TAU/SLOTS,na=pa+step*TAU/SLOTS;
    const x=ORBIT*Math.cos(na),y=ORBIT*Math.sin(na);
    if(current.some(w=>occupied(w,x,y)))continue;
    // Collision while rotating, not merely at discrete endpoints.
    let safe=true;
    for(let k=1;k<=3;k++){
     const a=pa+(na-pa)*k/4;
     const xx=ORBIT*Math.cos(a),yy=ORBIT*Math.sin(a);
     if(midpoint.some(w=>occupied(w,xx,yy))){safe=false;break;}
    }
    if(safe)found.add(next);
   }
   if(!found.size)return false;
   states=found;
  }
  return true;
 }
 class Session{
  constructor(recordings,options={}){
   this.bank=buildBank(recordings);
   this.recordings=recordings;
   this.kind='parts';this.id='hyper-hexagoner-5-2';
   this.speed=finite(options.playerSpeed)&&options.playerSpeed>0?options.playerSpeed:7;
   this.seed=finite(options.seed)?options.seed:Date.now();
   this.rand=rng(this.seed);
   const starts=this.bank.all.filter(p=>p.from===0);
   this.current=starts.find(p=>p.source===options.firstSource)||
    starts[Math.floor(this.rand()*starts.length)];
   this.source=this.current.source;
   this.sourceFrame=this.current.from;
   this.replayFrame=this.current.from;
   this.start=0;
   this.rotationShift=0;
   this.cameraOffset=0;
   this.zoomRatio=1;
   this.runId=1;this.nextRunId=2;
   this.contiguous=true;
   this.activePart=this.current.id;
   this.epoch=0;this.transitions=0;
   this.carries=[];this.history=[{at:0,id:this.activePart,part:this.activePart,
      source:this.source,epoch:0,contiguous:true}];
   this.lastTime=0;this.last=null;this.ended=false;this.unsafeSeams=0;
   this.maxEmpty=0;this.emptyDuration=0;this.maxSpawnGap=0;this.lastBorn=0;
   this.detectedBirths=0;this._seen=new Set();
  }
  fromCurrent(t){
   const p=this.current,film=this.recordings[p.source],local=clamp(t-this.start,0,p.duration);
   const index=atPart(p,film,local),frame=actorFrame(film,index);
   return {index,frame,local,p,film};
  }
  activeWalls(atTime){
   const {index,p,film,frame}=this.fromCurrent(atTime);
   const own=sourceWalls(p,film,index,this.contiguous)
    .map(w=>rotateWall(w,this.rotationShift,this.runId+':'+w.id));
   return own.concat(oldCarriesAt(this.carries,this.recordings,atTime,
    frame.angle+this.cameraOffset,frame.zoom*this.zoomRatio));
  }
  ongoingForCandidate(t){
   // Preserve every actor that existed at the actual cut time, including
   // earlier tails already passing through previous seams.
   const current=this.fromCurrent(t);
   const visible=new Set(sourceWalls(current.p,current.film,current.index,this.contiguous).map(w=>w.id));
   const next=this.carries.slice();
   if(visible.size)next.push({source:current.p.source,frameIndex:current.index,
    ids:visible,shift:this.rotationShift,runId:this.runId,created:t,
    cameraOffset:this.cameraOffset,zoomRatio:this.zoomRatio});
   return next;
  }
  choose(t,playerAngle,postEpoch=false){
   const pool=postEpoch?this.bank.post:this.bank.pre;
   const old=this.current,oldFrame=this.fromCurrent(t);
   const carries=this.ongoingForCandidate(t);
   const oldCamera=oldFrame.frame.angle+this.cameraOffset;
   const oldZoom=oldFrame.frame.zoom*this.zoomRatio;
   const candidates=[];
   for(const p of pool){
    if(p.inSides!==oldFrame.frame.sides)continue;
    const contiguous=p.source===old.source&&p.from===oldFrame.index;
    // Never clone a source segment as a fresh fake actor launch.
    if(!contiguous&&(p.arrivalDelay>MAX_ENTRY_DELAY||p.unsafeBirth))continue;
    // 1-second spawn-budget is measured between successive OBSERVED actor
    // arrivals, not merely relative to the seam. Reject an otherwise safe
    // candidate if a wall would not arrive soon enough after the last birth.
    // Contiguous original-frame playback is measured by the same rule.
    const gapBudget=MAX_ENTRY_DELAY-Math.max(0,t-this.lastBorn);
    if(p.arrivalDelay>gapBudget+1/FPS)continue;
    // Do not select the currently playing source segment.
    if(p.id===old.id)continue;
    const shifts=contiguous?[this.rotationShift]:
      Array.from({length:p.inSides},(_,k)=>k*TAU/p.inSides);
    for(const shift of shifts){
     const film=this.recordings[p.source];
     const entry=film.frames[p.from];
     const candidateCameraOffset=oldCamera-entry.angle;
     const candidateZoomRatio=oldZoom/entry.zoom;
     const cameraAt=dt=>{
      const frame=film.frames[atPart(p,film,dt)];
      return {angle:frame.angle+candidateCameraOffset,
       zoom:frame.zoom*candidateZoomRatio};
     };
     const oldWallsAt=dt=>{
      const camera=cameraAt(dt);
      return oldCarriesAt(carries,this.recordings,t+dt,camera.angle,camera.zoom);
     };
     const nextWallsAt=(dt)=>{
      const index=atPart(p,film,dt);
      return sourceWalls(p,film,index,contiguous)
       .map(w=>rotateWall(w,shift,'candidate:'+w.id));
     };
     if(!reachable(playerAngle,this.speed,oldWallsAt,nextWallsAt))continue;
     const recent=this.history.slice(-8).filter(h=>h.part===p.id).length;
     const other=p.source!==old.source;
     const score=recent*3+(contiguous?.3:0)+(other?-1.7:0)+
       (Number.isFinite(p.arrivalDelay)?p.arrivalDelay:.5);
     candidates.push({part:p,shift,contiguous,score});
    }
   }
   if(!candidates.length)return null;
   candidates.sort((a,b)=>a.score-b.score);
   const best=candidates.slice(0,Math.min(candidates.length,6));
   const weights=best.map(x=>Math.exp(-Math.max(-6,x.score)));
   let target=this.rand()*weights.reduce((a,b)=>a+b,0);
   for(let i=0;i<best.length;i++){target-=weights[i];if(target<=0)return best[i];}
   return best.at(-1);
  }
  cross(t,playerAngle,postEpoch=false){
   const old=this.fromCurrent(t);
   const choice=this.choose(t,playerAngle,postEpoch);
   if(!choice){
    this.unsafeSeams++;
    this.ended=true;
    return;
   }
   const oldCamera=old.frame.angle+this.cameraOffset;
   const oldZoom=old.frame.zoom*this.zoomRatio;
   if(!choice.contiguous){
    this.carries=this.ongoingForCandidate(t);
    this.runId=this.nextRunId++;
   }
   this.current=choice.part;
   this.start=t;this.source=choice.part.source;
   this.rotationShift=choice.shift;this.contiguous=choice.contiguous;
   const entry=this.recordings[this.source].frames[choice.part.from];
   this.cameraOffset=oldCamera-entry.angle;
   this.zoomRatio=oldZoom/entry.zoom;
   this.activePart=choice.part.id;
   this.transitions++;
   this.history.push({at:t,part:choice.part.id,id:choice.part.id,
    source:this.source,epoch:postEpoch?1:0,contiguous:choice.contiguous});
  }
  sample(seconds,playerAngle=TAU/12){
   if(!finite(seconds)||seconds<0)throw RangeError('Invalid HYPER HEXAGONER game time');
   if(seconds+1e-7<this.lastTime)
    throw RangeError('HYPER HEXAGONER source sampler cannot rewind');
   // 60 seconds changes PART ELIGIBILITY and never deletes old actors.
   // Capture the actual current source frame when the 60s cut occurs.
   let guard=0;
   while(!this.ended){
    const deadline=Math.min(this.start+this.current.duration,
      this.start<60?60:Infinity);
    if(seconds+1e-8<deadline)break;
    if(!finite(deadline)||deadline<=this.start+1e-9){
      this.ended=true;break;
    }
    this.cross(deadline,playerAngle,deadline>=60-1e-8);
    if(++guard>2000)throw Error('HYPER HEXAGONER part transition loop');
   }
   const {index,frame}=this.fromCurrent(Math.min(seconds,this.ended?this.lastTime:seconds));
   this.sourceFrame=index;this.replayFrame=index;
   this.source=this.current.source;this.activePart=this.current.id;
   this.epoch=seconds>=60?1:0;
   const walls=this.activeWalls(Math.min(seconds,this.ended?this.lastTime:seconds));
   // Old IDs continue as long as the ACTUAL SOURCE observes them. Do not
   // constrain their lifetime to a made-up 0.2s/2.0s grace period.
   this.carries=this.carries.filter(c=>{
    const film=this.recordings[c.source];
    const idx=sourceIndex(film,c.frameIndex,Math.max(0,seconds-c.created));
    const live=new Set(film.frames[idx].walls.map(w=>w.id));
    return [...c.ids].some(id=>live.has(id))&&idx<film.frames.length-1;
   });
   let newlyBorn=false;
   for(const w of walls){
    if(!this._seen.has(w.id)){
     this._seen.add(w.id);
     if(radius(w)>200)newlyBorn=true;
    }
   }
   if(newlyBorn){
    this.detectedBirths++;
    this.maxSpawnGap=Math.max(this.maxSpawnGap,seconds-this.lastBorn);
    this.lastBorn=seconds;
   }
   const elapsed=Math.max(0,seconds-this.lastTime);
   this.emptyDuration=walls.length?0:this.emptyDuration+elapsed;
   this.maxEmpty=Math.max(this.maxEmpty,this.emptyDuration);
   this.lastTime=seconds;
   this.last={walls,angle:frame.angle+this.cameraOffset,
    zoom:frame.zoom*this.zoomRatio,sides:frame.sides,
    replayFrame:index,source:this.source,partId:this.activePart,ended:this.ended};
   return this.last;
  }
 }
 return Object.freeze({IDS,FPS,SLOTS,buildBank,makeCuts,reachable,occupied,
  Session,create:(recordings,options)=>new Session(recordings,options)});
});
