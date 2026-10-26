// Stage-one repair: preserve a wall's lifetime after observation loss; share geometry
// only when adjacent sectors are supported by the same recorded source outline.
const fs=require('node:fs');
const path=`${__dirname}/assets/timelines/rigid-stage-0.json`;
const data=JSON.parse(fs.readFileSync(path));
if(data.continuityVersion){console.log('Stage-one continuity already applied');process.exit(0);}
const source=JSON.parse(fs.readFileSync(`${__dirname}/assets/timelines/stage-0.json`));
const median=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];
const radius=(w,t)=>w.r-w.speed*(t-w.start);
const inside=(p,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
 const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;
}return yes;};
function refit(list){
 const points=list.flatMap(w=>[[w.start,w.r,w.samples],[w.end,radius(w,w.end),w.samples]]);
 const weight=points.reduce((s,p)=>s+p[2],0),mt=points.reduce((s,p)=>s+p[0]*p[2],0)/weight,mr=points.reduce((s,p)=>s+p[1]*p[2],0)/weight;
 const slope=points.reduce((s,p)=>s+(p[0]-mt)*(p[1]-mr)*p[2],0)/points.reduce((s,p)=>s+(p[0]-mt)**2*p[2],0);
 const start=Math.min(...list.map(w=>w.start));
 return {start,r:mr+slope*(start-mt),speed:-slope,thickness:median(list.map(w=>w.thickness)),end:Math.max(...list.map(w=>w.end)),samples:list.reduce((s,w)=>s+w.samples,0)};
}
const tracks=[];let joins=0;
for(const w of data.walls.slice().sort((a,b)=>a.start-b.start)){
 let best=null,error=Infinity;
 for(const prior of tracks){
  if(prior.sides!==w.sides||prior.sector!==w.sector||w.start-prior.end>.5||w.start<prior.end-.04)continue;
  const e=Math.abs(radius(prior,w.start)-w.r);
  if(e<22&&e<error&&w.speed/prior.speed>.5&&w.speed/prior.speed<2){best=prior;error=e;}
 }
 if(best){const parts=best.parts.concat(w),fit=refit(parts);if(fit.speed>0){Object.assign(best,fit,{parts});joins++;continue;}}
 tracks.push({...w,parts:[w]});
}
const groups=tracks.map((_,i)=>[i]);
const owner=tracks.map((_,i)=>i);
function supported(a,b,t){
 const frame=source.frames[Math.min(source.frames.length-1,Math.round(t*60))];
 const point=w=>{const angle=(w.sector+.5)*2*Math.PI/w.sides,r=(radius(w,t)+w.thickness/2)*Math.cos(Math.PI/w.sides);return [r*Math.cos(angle),r*Math.sin(angle)];};
 const pa=point(a),pb=point(b);
 return frame.walls.some(([,p,h])=>inside(pa,p)&&inside(pb,p)&&!h.some(hole=>inside(pa,hole)||inside(pb,hole)));
}
for(let i=0;i<tracks.length;i++)for(let j=i+1;j<tracks.length;j++){
 const a=tracks[i],b=tracks[j];if(a.sides!==b.sides||!([1,a.sides-1].includes(Math.abs(a.sector-b.sector))))continue;
 const start=Math.max(a.start,b.start),end=Math.min(a.end,b.end);if(end-start<.15)continue;
 const times=[.25,.5,.75].map(u=>start+(end-start)*u);
 if(times.some(t=>Math.abs(radius(a,t)-radius(b,t))>24)||times.filter(t=>supported(a,b,t)).length<2)continue;
 const ga=owner[i],gb=owner[j];if(ga===gb)continue;
 const sectors=new Set(groups[ga].map(k=>tracks[k].sector));if(groups[gb].some(k=>sectors.has(tracks[k].sector)))continue;
 groups[ga].push(...groups[gb]);for(const k of groups[gb])owner[k]=ga;groups[gb]=[];
}
let shared=0;
for(const group of groups.filter(g=>g.length)){
 const list=group.map(i=>tracks[i]),fit=refit(list.flatMap(w=>w.parts));
 if(group.length>1)shared++;
 for(const index of group){const w=tracks[index];w.sourceTrackIds=w.parts.map(p=>p.id);w.observedEnd=w.end;Object.assign(w,fit);w.end=Math.min(data.duration,w.start+(w.r+w.thickness-42)/w.speed);w.wave=group[0];delete w.parts;}
}
tracks.forEach((w,i)=>w.id=i);
const prematureBefore=data.walls.filter(w=>radius(w,w.end)+w.thickness>90).length;
const opening=process.argv.includes('--opening');
let applied=tracks;
if(opening){
 const safe=tracks.filter(w=>w.sourceTrackIds.every(id=>data.walls.find(p=>p.id===id).start<10)&&w.end<15);
 const replaced=new Set(safe.flatMap(w=>w.sourceTrackIds));
 applied=[...data.walls.filter(w=>!replaced.has(w.id)),...safe.map(w=>({...w,continuityRepair:true}))];
}
applied.forEach((w,i)=>w.id=i);
data.walls=applied;data.continuityVersion=opening?'opening-1':1;
fs.writeFileSync(path,JSON.stringify(data));
const report={stage:0,scope:opening?'observed starts before 10 seconds; later tracks unchanged':'candidate only',repairedTracks:applied.filter(w=>w.continuityRepair).length,joinedFragments:joins,sharedConnectedWaves:shared,prematureEndsBefore:prematureBefore,prematureEndsAfter:applied.filter(w=>w.end<60&&radius(w,w.end)+w.thickness>90).length};
fs.writeFileSync(`${__dirname}/analysis/stage-one-continuity.json`,JSON.stringify(report,null,2));console.log(report);
