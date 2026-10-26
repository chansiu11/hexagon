// Generate continuous measured wave actors for levels 2-6 from recorded rigid tracks.
// Stage 1 uses its own established generator and remains unchanged.
// Recorded timelines are observational fits, not original-game source code.
const fs = require('node:fs');
const path = require('node:path');
const generate = function generate(data,level){
 const TAU=Math.PI*2,viewport=Math.hypot(480,300),median=xs=>{xs.sort((a,b)=>a-b);return xs[Math.floor(xs.length/2)]};
 const radius=(w,t)=>w.r-w.speed*(t-w.start);
 const reliable=data.walls.filter(w=>w.samples>=15&&w.end-w.start>=.28&&w.speed>50&&w.speed<1100);
 if(reliable.length<5)throw Error('Not enough reliable wall tracks at stage '+level);
 const speed=median(reliable.map(w=>w.speed));
 const groups=[];
 for(const wall of data.walls.slice().sort((a,b)=>a.start-b.start)){
  let group=null;
  for(const g of groups){
   if(g[0].sides!==wall.sides||g.length>=wall.sides-1||g.some(x=>x.sector===wall.sector))continue;
   if(Math.abs(g[0].start-wall.start)>.2||Math.abs(g[0].end-wall.end)>.22)continue;
   const t0=Math.max(g[0].start,wall.start),t1=Math.min(g[0].end,wall.end);
   if(t1-t0<.08||g.some(x=>Math.abs(radius(x,t0)-radius(wall,t0))>16||Math.abs(radius(x,t1)-radius(wall,t1))>18||Math.abs(x.thickness-wall.thickness)>14))continue;
   group=g;break;
  }
  if(group)group.push(wall);else groups.push([wall]);
 }
 const minZoom=Math.min(1,...data.camera.map(m=>Math.hypot(m[0],m[1])));
 const waves=groups.map((members,id)=>{
  const observedStart=Math.min(...members.map(w=>w.start)),end=Math.max(...members.map(w=>w.end));
  const samples=members.reduce((a,w)=>a+w.samples,0),mean=f=>members.reduce((a,w)=>a+w.samples*f(w),0)/samples;
  const anchor=mean(w=>(w.start+w.end)/2),observedR=mean(w=>radius(w,anchor))+speed*(anchor-observedStart);
  const thickness=mean(w=>w.thickness),sides=members[0].sides;
  const outside=(viewport/minZoom+32)/Math.cos(Math.PI/sides);
  const intercept=observedR+speed*observedStart;
  let start=Math.max(0,Math.min(observedStart,(intercept-outside)/speed));
  let r=intercept-speed*start,approach;
  if(r<outside-.001&&observedStart>.25){
   start=Math.max(0,observedStart-.85);r=outside+32;approach={end:observedStart,observedR};
  }
  const shapeIndex=data.shapeSchedule.reduce((idx,[t],i)=>t<=observedStart+1e-7?i:idx,0);
  const shapeFrom=data.shapeSchedule[shapeIndex][0],shapeUntil=data.shapeSchedule[shapeIndex+1]?.[0]??data.duration;
  if(start<shapeFrom){const dt=shapeFrom-start;start=shapeFrom;if(!approach)r-=speed*dt;}
  const physicalEnd=observedStart+(observedR+thickness-42)/speed;
  let finalEnd=Math.min(data.duration,end,shapeUntil);
  if(finalEnd<observedStart)finalEnd=observedStart;
  let continuous=false;
  if(samples>=30 && end-observedStart>=.4){
   const candidate=Math.min(physicalEnd,end+.65,shapeUntil,data.duration);
   if(candidate>finalEnd+.03){finalEnd=candidate;continuous=true;}
  }
  const w={id,start,observedStart,end:finalEnd,r,speed,thickness,sides,sectors:members.map(w=>w.sector).sort((a,b)=>a-b),samples,sourceTrackIds:members.map(w=>w.id),observedEnd:end};
  if(approach)w.approach=approach;
  if(continuous)w.continuityExtension=finalEnd-end;
  return w;
 });
 const waveR=(w,t)=>{
  if(w.approach&&t<w.observedStart){
   const d=w.observedStart-w.start;if(d<=0)return w.approach.observedR;
   const u=Math.max(0,Math.min(1,(t-w.start)/d)),u2=u*u,u3=u2*u,m=-w.speed*d;
   return (2*u3-3*u2+1)*w.r+(u3-2*u2+u)*m+(-2*u3+3*u2)*w.approach.observedR+(u3-u2)*m;
  }
  return (w.approach?.observedR??(w.r-w.speed*(w.observedStart-w.start)))-w.speed*(t-w.observedStart);
 };
 const playerPolys=Array.from({length:144},(_,i)=>{let a=i*TAU/144,c=Math.cos(a),s=Math.sin(a),x=66*c,y=66*s;return [[7,0],[-3.5,-6.0621778265],[-3.5,6.0621778265]].map(([u,v])=>[x+u*c-v*s,y+u*s+v*c])});
 function sat(a,b){for(const p of [a,b])for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length],nx=p[i][1]-q[1],ny=q[0]-p[i][0];let mina=Infinity,maxa=-Infinity,minb=Infinity,maxb=-Infinity;for(const v of a){let n=v[0]*nx+v[1]*ny;if(n<mina)mina=n;if(n>maxa)maxa=n;}for(const v of b){let n=v[0]*nx+v[1]*ny;if(n<minb)minb=n;if(n>maxb)maxb=n;}if(maxa<minb||maxb<mina)return false}return true}
 function atFrame(t){const active=waves.filter(w=>w.start<=t&&w.end>t&&waveR(w,t)<100&&waveR(w,t)+w.thickness>50);
  const polys=[];for(const w of active){const rr=waveR(w,t);for(const sector of w.sectors){const a=TAU*sector/w.sides,b=TAU*(sector+1)/w.sides,lo=rr,hi=rr+w.thickness;polys.push([[Math.cos(a)*lo,Math.sin(a)*lo],[Math.cos(b)*lo,Math.sin(b)*lo],[Math.cos(b)*hi,Math.sin(b)*hi],[Math.cos(a)*hi,Math.sin(a)*hi]])}}
  if(polys.length<4)return null;
  for(const p of playerPolys)if(polys.every(poly=>!sat(p,poly)))return null;
  return active;
 }
 function firstClosure(){
  for(let i=30;i<1800;i++){let t=i/30;const active=atFrame(t);if(active)return {time:t,active};}
  return null;
 }
 let removed=[],changedExtensions=0;
 for(let attempt=0;attempt<24;attempt++){
  const closure=firstClosure();if(!closure)break;
  const extension=closure.active.filter(w=>w.continuityExtension&&w.observedEnd<=closure.time+.00001);
  const byConfidence=(a,b)=>a.samples-b.samples||(a.observedEnd-a.observedStart)-(b.observedEnd-b.observedStart)||a.id-b.id;
  if(extension.length){
   const w=extension.sort(byConfidence)[0];
   w.end=Math.min(w.end,w.observedEnd);delete w.continuityExtension;changedExtensions++;continue;
  }
  const target=closure.active.slice().sort(byConfidence)[0];
  target.end=target.start;removed.push({id:target.id,sourceTrackIds:target.sourceTrackIds,at:+closure.time.toFixed(3),samples:target.samples});
 }
 const remaining=firstClosure();
 if(remaining)throw Error('Unresolved blocked passage at '+remaining.time+'s for level '+level);
 const live=waves.filter(w=>w.end>w.start+.001);
 return {version:1,mode:'batched-wall-waves',sourceMode:'rigid-observed-tracks',offscreenBirth:true,sharedSpeed:speed,source:data.source,duration:data.duration,sampleRate:data.sampleRate,camera:data.camera,shapeSchedule:data.shapeSchedule,stage:level,waves:live,repair:{groupedTracks:data.walls.length,groups:groups.length,connectedGroups:groups.filter(g=>g.length>1).length,preludeActors:live.filter(w=>w.approach).length,extendedWaves:live.filter(w=>w.continuityExtension).length,clippedExtensions:changedExtensions,discardedSuspectTracks:removed,verifiedStepHz:30}};
};
for (let level=1;level<=5;level++) {
 if(process.argv[2]!==undefined&&level!==Number(process.argv[2]))continue;
 const input=JSON.parse(fs.readFileSync(path.join(__dirname,'assets','timelines',`rigid-stage-${level}.json`),'utf8'));
 const output=generate(input,level);
 fs.writeFileSync(path.join(__dirname,'assets','timelines',`waves-stage-${level}.json`),JSON.stringify(output));
 console.log('Stage',level+1,output.repair);
}
