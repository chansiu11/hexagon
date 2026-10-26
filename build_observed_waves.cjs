// Generate stages 2-6 with stage one's wall grouping, offscreen birth,
// constant inward motion and lifetime rules. Never modify stage one's data.
const fs=require('node:fs');
const path=require('node:path');

function buildObservedWaves(data,level){
 const at=(w,t)=>w.r-w.speed*(t-w.start);
 const reliable=data.walls.filter(w=>w.samples>=30&&(w.observedEnd||w.end)-w.start>=.5).map(w=>w.speed).sort((a,b)=>a-b);
 const sharedSpeed=reliable[Math.floor(reliable.length/2)];
 if(!Number.isFinite(sharedSpeed)||sharedSpeed<=0)throw Error('No reliable wall speeds at stage '+(level+1));
 const groups=[];
 for(const wall of data.walls.slice().sort((a,b)=>a.start-b.start)){
  let target=null;
  for(const members of groups){
   if(members[0].sides!==wall.sides||members.some(w=>w.sector===wall.sector)||members.length>=wall.sides-1)continue;
   if(members.some(w=>Math.abs(w.start-wall.start)>.15||Math.abs(w.end-wall.end)>.15))continue;
   if(members.some(w=>{
    const begin=Math.max(w.start,wall.start),end=Math.min(w.end,wall.end);
    return end<=begin||Math.abs(at(w,begin)-at(wall,begin))>10
      ||Math.abs(at(w,end)-at(wall,end))>10||Math.abs(w.thickness-wall.thickness)>8;
   }))continue;
   target=members;break;
  }
  if(target)target.push(wall);else groups.push([wall]);
 }
 let waves=groups.map((members,id)=>{
  const start=Math.min(...members.map(w=>w.start)),end=Math.max(...members.map(w=>w.end));
  const weight=members.reduce((s,w)=>s+w.samples,0);
  const mean=f=>members.reduce((s,w)=>s+f(w)*w.samples,0)/weight;
  const anchor=mean(w=>(w.start+(w.observedEnd||w.end))/2);
  const r=mean(w=>at(w,anchor))+sharedSpeed*(anchor-start);
  return {id,start,end,r,speed:sharedSpeed,thickness:mean(w=>w.thickness),
   sides:members[0].sides,sectors:members.map(w=>w.sector).sort((a,b)=>a-b),
   sourceTrackIds:members.map(w=>w.id),samples:weight};
 });
 const minZoom=Math.min(1,...data.camera.map(m=>Math.hypot(m[0],m[1])));
 const viewportRadius=Math.hypot(480,300),excluded=[];
 for(const w of waves){
  const intercept=w.r+w.speed*w.start,outsideRadius=(viewportRadius/minZoom+32)/Math.cos(Math.PI/w.sides);
  w.observedStart=w.start;
  w.start=Math.max(0,(intercept-outsideRadius)/w.speed);
  w.r=intercept-w.speed*w.start;
  const birthZoom=w.start===0?Math.min(1,Math.hypot(data.camera[0][0],data.camera[0][1])):minZoom;
  if(w.r*Math.cos(Math.PI/w.sides)*birthZoom<=viewportRadius){
   // Contradictory video fragments cannot be spawned offscreen at t >= 0.
   // Keep them in rigid-stage-N.json, but do not invent a teleport or curve.
   excluded.push({id:w.id,sourceTrackIds:w.sourceTrackIds,
    reason:'insufficient recorded trajectory for offscreen constant-speed birth'});
  }
 }
 const excludedIds=new Set(excluded.map(w=>w.id));
 waves=waves.filter(w=>!excludedIds.has(w.id));
 const continuity={version:1,minObservedSeconds:0.4,maxExtensionSeconds:0.75,physicalExitRadius:42};
 for(const w of waves){
  const observedSeconds=w.end-w.observedStart;
  const nextShape=data.shapeSchedule.find(s=>s[0]>w.end+1e-6)?.[0]??data.duration;
  const physicalExit=w.start+(w.r+w.thickness-continuity.physicalExitRadius)/w.speed;
  const end=observedSeconds>=continuity.minObservedSeconds&&w.end<data.duration
   ?Math.max(w.end,Math.min(physicalExit,w.end+continuity.maxExtensionSeconds,nextShape,data.duration)):w.end;
  if(end>w.end+.03){
   w.observedEnd=w.end;w.continuityExtension=end-w.end;w.end=end;
  }
 }
 // The first-stage rules are unchanged; resolve only contradictory tracking
 // fragments that would leave NO escape direction in a sampled frame.
 const TAU=Math.PI*2;
 const players=Array.from({length:144},(_,i)=>{
  const a=i*TAU/144,c=Math.cos(a),s=Math.sin(a),x=66*c,y=66*s;
  return [[7,0],[-3.5,-6.0621778265],[-3.5,6.0621778265]]
   .map(([u,v])=>[x+u*c-v*s,y+u*s+v*c]);
 });
 const overlap=(a,b)=>{
  for(const p of [a,b])for(let i=0;i<p.length;i++){
   const q=p[(i+1)%p.length],nx=p[i][1]-q[1],ny=q[0]-p[i][0];
   let loA=Infinity,hiA=-Infinity,loB=Infinity,hiB=-Infinity;
   for(const v of a){const x=v[0]*nx+v[1]*ny;loA=Math.min(loA,x);hiA=Math.max(hiA,x);}
   for(const v of b){const x=v[0]*nx+v[1]*ny;loB=Math.min(loB,x);hiB=Math.max(hiB,x);}
   if(hiA<loB||hiB<loA)return false;
  }
  return true;
 };
 function closedAt(t){
  const active=waves.filter(w=>w.start<=t&&t<w.end
   &&w.r-w.speed*(t-w.start)<100&&w.r-w.speed*(t-w.start)+w.thickness>50);
  if(active.reduce((count,w)=>count+w.sectors.length,0)<4)return null;
  const obstacles=[];
  for(const w of active){
   const raw=w.r-w.speed*(t-w.start),r=Math.max(0,raw),outer=Math.max(r,raw+w.thickness);
   for(const sector of w.sectors){
    const a=sector*TAU/w.sides,b=(sector+1)*TAU/w.sides;
    obstacles.push([[Math.cos(a)*r,Math.sin(a)*r],[Math.cos(b)*r,Math.sin(b)*r],
     [Math.cos(b)*outer,Math.sin(b)*outer],[Math.cos(a)*outer,Math.sin(a)*outer]]);
   }
  }
  return players.some(p=>obstacles.every(o=>!overlap(p,o)))?null:active;
 }
 const firstClosed=()=>{
  for(let frame=30;frame<Math.ceil(data.duration*30);frame++){
   const t=frame/30,actors=closedAt(t);
   if(actors)return {t,actors};
  }
  return null;
 };
 let clipped=0;
 const lessReliable=(a,b)=>a.samples-b.samples||
  ((a.observedEnd??a.end)-a.observedStart)-((b.observedEnd??b.end)-b.observedStart)||a.id-b.id;
 for(let n=0;n<64;n++){
  const failure=firstClosed();
  if(!failure)break;
  const ext=failure.actors.filter(w=>w.continuityExtension&&failure.t>=w.observedEnd-1e-8);
  if(ext.length){
   const w=ext.sort(lessReliable)[0];w.end=w.observedEnd;
   delete w.continuityExtension;delete w.observedEnd;clipped++;continue;
  }
  const bad=failure.actors.sort(lessReliable)[0];
  excluded.push({id:bad.id,sourceTrackIds:bad.sourceTrackIds,
   reason:'conflicting recorded fragment closes all sampled passages',at:+failure.t.toFixed(4)});
  waves=waves.filter(w=>w!==bad);
 }
 const unresolved=firstClosed();
 if(unresolved)throw Error('No angular escape on stage '+(level+1)+' at '+unresolved.t);

// Recorded wall tracks can end while still on screen, particularly near 17s.
// Retain measured, reliable waves on the SAME linear inward trajectory.
let corrected=0,reverted=0;
for(const w of waves){
 if(w.end<15.5||w.end>19||w.samples<12)continue;
 const endRadius=w.r-w.speed*(w.end-w.start)+w.thickness;
 if(endRadius<85)continue;
 const nextShape=data.shapeSchedule.find(s=>s[0]>w.end+1e-6)?.[0]??data.duration;
 const physicalExit=w.start+(w.r+w.thickness-42)/w.speed;
 const end=Math.max(w.end,Math.min(physicalExit,w.end+2,nextShape,data.duration));
 if(end-w.end<.18)continue;
 w.glitchCorrection={baselineEnd:w.end,extendedSeconds:end-w.end};
 w.end=end;corrected++;
}
for(let retry=0;retry<128;retry++){
 const failure=firstClosed();
 if(!failure)break;
 const changes=failure.actors.filter(w=>w.glitchCorrection&&failure.t>=w.glitchCorrection.baselineEnd-1e-8);
 if(!changes.length)throw Error('Unrepairable closed passage at '+failure.t+' on stage '+(level+1));
 const victim=changes.sort(lessReliable)[0];
 victim.end=victim.glitchCorrection.baselineEnd;
 delete victim.glitchCorrection;reverted++;
}
if(firstClosed())throw Error('Open passage invariant failed after wave continuity repair');

 if(waves.some(w=>w.approach||!Number.isFinite(w.r)||w.end<=w.start))throw Error('Invalid actor at '+level);
 return {version:8,mode:'batched-wall-waves',offscreenBirth:true,generator:'stage-one-rigid-v7',
  continuity,sharedSpeed,speedSampleCount:reliable.length,source:data.source,
  duration:data.duration,sampleRate:data.sampleRate,camera:data.camera,
  shapeSchedule:data.shapeSchedule,stage:level,waves,
  repair:{observedTracks:data.walls.length,groupCount:groups.length,
   multiPieceWaves:groups.filter(g=>g.length>1).length,
   discardedSourceActors:excluded,clippedExtensions:clipped,
   extendedWaves:waves.filter(w=>w.continuityExtension).length,glitchWindow:[15.5,19],glitchLifetimeExtensions:corrected-reverted,glitchLifetimeRejected:reverted,checkedPassagesAtHz:30}};
}
if(require.main===module){
 for(let level=1;level<=5;level++){
  if(process.argv[2]!==undefined&&Number(process.argv[2])!==level)continue;
  const file=path.join(__dirname,'assets','timelines','rigid-stage-'+level+'.json');
  const input=JSON.parse(fs.readFileSync(file,'utf8'));
  const output=buildObservedWaves(input,level);
  fs.writeFileSync(path.join(__dirname,'assets','timelines','waves-stage-'+level+'.json'),JSON.stringify(output));
  console.log('stage',level+1,output.repair);
 }
}
module.exports={buildObservedWaves};
