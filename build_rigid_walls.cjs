// Fit rigid sector walls to observed ray crossings. No random patterns are generated.
const fs=require('node:fs');
const TAU=2*Math.PI;
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const median=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];
function intervals(w,angle){
 const u=[Math.cos(angle),Math.sin(angle)],hits=[];
 for(const ring of [w[1],...w[2]])for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length],v=[b[0]-a[0],b[1]-a[1]],den=cross(u,v);
  if(Math.abs(den)<1e-8)continue;
  const r=cross(a,v)/den,t=cross(a,u)/den;
  if(r>0&&t>=0&&t<1)hits.push(r);
 }
 hits.sort((a,b)=>a-b);const result=[];
 for(let i=0;i+1<hits.length;i+=2)result.push([hits[i],hits[i+1]]);
 return result;
}
function fit(keys){
 const mean=keys.reduce((s,k)=>s+k[0],0)/keys.length,mr=keys.reduce((s,k)=>s+k[1],0)/keys.length;
 const den=keys.reduce((s,k)=>s+(k[0]-mean)**2,0);
 const slope=keys.reduce((s,k)=>s+(k[0]-mean)*(k[1]-mr),0)/den;
 return [mr-slope*mean,slope];
}
function smooth(a,r){return a.map((_,i)=>{let s=0,w=0;for(let j=Math.max(0,i-r);j<=Math.min(a.length-1,i+r);j++){const weight=r+1-Math.abs(i-j);s+=a[j]*weight;w+=weight;}return s/w;});}
for(let level=0;level<6;level++){
 if(process.argv[2]!==undefined&&level!==Number(process.argv[2]))continue;
 const source=JSON.parse(fs.readFileSync(`${__dirname}/assets/timelines/stage-${level}.json`));
 const tracks=[],angles=[],scales=[];let active=[];
 source.frames.forEach((frame,i)=>{
  const n=source.shapeSchedule.filter(x=>x[0]<=i/60).at(-1)[1],cos=Math.cos(Math.PI/n),observations=[];
  let a=Math.atan2(frame.camera[1]-frame.camera[2],frame.camera[0]+frame.camera[3]);
  if(i){while(a-angles[i-1]>Math.PI)a-=TAU;while(a-angles[i-1]<-Math.PI)a+=TAU;}
  angles.push(a);scales.push(Math.log(Math.sqrt(Math.max(.01,frame.camera[0]*frame.camera[3]-frame.camera[1]*frame.camera[2]))));
  for(let sector=0;sector<n;sector++){
   const ranges=frame.walls.flatMap(w=>intervals(w,(sector+.5)*TAU/n)).map(([lo,hi])=>[lo/cos,(hi-lo)/cos]).filter(([r,w])=>r>48&&r<800&&w>=12&&w<110).sort((a,b)=>a[0]-b[0]);
   for(let k=0;k<ranges.length;k++)if(!k||Math.abs(ranges[k][0]-ranges[k-1][0])>5)observations.push([sector,...ranges[k]]);
  }
  const used=new Set();
  for(const [sector,r,width] of observations){
   let match=null,error=Infinity;
   for(const id of active){
    const tr=tracks[id],last=tr.keys.at(-1),gap=i-last[0];if(used.has(id)||tr.sides!==n||tr.sector!==sector||gap>6)continue;
    const prior=tr.keys.at(-2),velocity=prior?(last[1]-prior[1])/(last[0]-prior[0]):-5;
    const distance=Math.abs(r-last[1]-velocity*gap);
    if(r-last[1]>8*gap||last[1]-r>30*gap)continue;
    if(distance<Math.max(14,gap*8)&&distance<error){match=id;error=distance;}
   }
   if(match===null){match=tracks.length;tracks.push({sector,sides:n,keys:[]});active.push(match);}
   tracks[match].keys.push([i,r,width]);used.add(match);
  }
  active=active.filter(id=>i-tracks[id].keys.at(-1)[0]<6);
 });
 const walls=[];
 for(const tr of tracks){
  if(tr.keys.length<6)continue;
  let [offset,slope]=fit(tr.keys);
  const residual=tr.keys.map(k=>Math.abs(k[1]-offset-slope*k[0])),limit=Math.max(5,median(residual)*3);
  const kept=tr.keys.filter((k,j)=>residual[j]<=limit);
  if(kept.length>=6)[offset,slope]=fit(kept);
  if(!(slope<-.5&&slope>-30))continue;
  const first=tr.keys[0][0],last=tr.keys.at(-1)[0];
  walls.push({id:walls.length,sector:tr.sector,sides:tr.sides,start:first/60,end:(last+1)/60,r:offset+slope*first,speed:-slope*60,thickness:median(tr.keys.map(k=>k[2])),samples:tr.keys.length,keys:tr.keys});
 }
 const joined=[];
 for(const wall of walls.sort((a,b)=>a.start-b.start)){
  let match=null,error=Infinity;
  for(const prior of joined){
   if(prior.sector!==wall.sector||prior.sides!==wall.sides||wall.start-prior.end>.12||wall.start-prior.end<-.025)continue;
   const distance=Math.abs(prior.r-prior.speed*(wall.start-prior.start)-wall.r);
   if(distance<20&&distance<error){match=prior;error=distance;}
  }
  if(match){
   const keys=match.keys.concat(wall.keys),[offset,slope]=fit(keys);
   if(slope<-.5&&slope>-30){match.keys=keys;match.end=wall.end;match.r=offset+slope*match.start*60;match.speed=-slope*60;match.thickness=median(keys.map(k=>k[2]));match.samples=keys.length;continue;}
  }
  joined.push(wall);
 }
 joined.forEach((wall,id)=>{wall.id=id;delete wall.keys;});
 const angle=smooth(angles,5),scale=smooth(scales,3);
 const camera=angle.map((a,i)=>{const z=Math.exp(scale[i]),c=Math.cos(a)*z,s=Math.sin(a)*z;return [c,s,-s,c,0,0];});
 const output={version:3,mode:'rigid-observed-tracks',source:source.source,videoStart:source.videoStart,duration:source.duration,sampleRate:60,shapeSchedule:source.shapeSchedule,camera,walls:joined};
 fs.writeFileSync(`${__dirname}/assets/timelines/rigid-stage-${level}.json`,JSON.stringify(output));
 console.log(level,'rigid observed tracks',joined.length);
}
