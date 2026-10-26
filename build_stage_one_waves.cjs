const fs=require('node:fs');
const data=require('./assets/timelines/rigid-stage-0.json');
const at=(w,t)=>w.r-w.speed*(t-w.start);
const reliable=data.walls.filter(w=>w.samples>=30&&(w.observedEnd||w.end)-w.start>=.5).map(w=>w.speed).sort((a,b)=>a-b);
const sharedSpeed=reliable[Math.floor(reliable.length/2)];
if(!Number.isFinite(sharedSpeed))throw Error('No reliable measured speed samples');
const groups=[];
for(const wall of data.walls.slice().sort((a,b)=>a.start-b.start)){
 let target=null;
 for(const members of groups){
  if(members[0].sides!==wall.sides||members.some(w=>w.sector===wall.sector)||members.length>=wall.sides-1)continue;
  // Only observations already close in both position and lifetime can share an actor.
  // Never merge different approaching rings just because they spawn close in time.
  if(members.some(w=>Math.abs(w.start-wall.start)>.15||Math.abs(w.end-wall.end)>.15))continue;
  if(members.some(w=>{const begin=Math.max(w.start,wall.start),end=Math.min(w.end,wall.end);return end<=begin||Math.abs(at(w,begin)-at(wall,begin))>10||Math.abs(at(w,end)-at(wall,end))>10||Math.abs(w.thickness-wall.thickness)>8;}))continue;
  target=members;break;
 }
 if(target)target.push(wall);else groups.push([wall]);
}
const waves=groups.map((members,id)=>{
 const start=Math.min(...members.map(w=>w.start)),end=Math.max(...members.map(w=>w.end));
 const weight=members.reduce((s,w)=>s+w.samples,0);
 const mean=f=>members.reduce((s,w)=>s+f(w)*w.samples,0)/weight;
 const anchor=mean(w=>(w.start+(w.observedEnd||w.end))/2);
 const r=mean(w=>at(w,anchor))+sharedSpeed*(anchor-start);
 const physicalExit=members.every(w=>w.continuityRepair);
 return {id,start,end:physicalExit?Math.min(data.duration,start+(r+mean(w=>w.thickness)-42)/sharedSpeed):end,r,speed:sharedSpeed,thickness:mean(w=>w.thickness),sides:members[0].sides,sectors:members.map(w=>w.sector).sort((a,b)=>a-b),sourceTrackIds:members.map(w=>w.id)};
});
// Start each trajectory outside the entire viewport, rather than at its first
// detected video frame. Preserve its position/speed at every observed timestamp.
const minZoom=Math.min(1,...data.camera.map(m=>Math.hypot(m[0],m[1])));
const viewportRadius=Math.hypot(480,300);
for(const w of waves){
 const intercept=w.r+w.speed*w.start,outsideRadius=(viewportRadius/minZoom+32)/Math.cos(Math.PI/w.sides);
 w.observedStart=w.start;
 w.start=Math.max(0,(intercept-outsideRadius)/w.speed);
 w.r=intercept-w.speed*w.start;
 const birthZoom=w.start===0?Math.min(1,Math.hypot(data.camera[0][0],data.camera[0][1])):minZoom;
 if(w.r*Math.cos(Math.PI/w.sides)*birthZoom<=viewportRadius)throw Error('Wall would be visible at birth: '+w.id);
}

// Source video can temporarily lose a wall before it reaches the core.
// Extend well-observed actors for a bounded interval without inventing a
// new trajectory; never carry a wall through the next shape transition.
const continuity={version:1,minObservedSeconds:0.4,maxExtensionSeconds:0.75,physicalExitRadius:42};
let extended=0;
for(const w of waves){
 const observedSeconds=w.end-w.observedStart;
 const nextShape=data.shapeSchedule.find(s=>s[0]>w.end+1e-6)?.[0]??data.duration;
 const physicalExit=w.start+(w.r+w.thickness-continuity.physicalExitRadius)/w.speed;
 const end=observedSeconds>=continuity.minObservedSeconds&&w.end<data.duration
  ?Math.max(w.end,Math.min(physicalExit,w.end+continuity.maxExtensionSeconds,nextShape,data.duration)):w.end;
 if(end>w.end+.03){
  w.observedEnd=w.end;
  w.continuityExtension=end-w.end;
  w.end=end;
  extended++;
 }
}
const result={version:7,continuity,mode:'batched-wall-waves',offscreenBirth:true,sharedSpeed,speedSampleCount:reliable.length,source:data.source,duration:data.duration,sampleRate:data.sampleRate,camera:data.camera,shapeSchedule:data.shapeSchedule,waves};
fs.writeFileSync(`${__dirname}/assets/timelines/waves-stage-0.json`,JSON.stringify(result));
console.log({observedPieces:data.walls.length,waveActors:waves.length,multiPieceWaves:waves.filter(w=>w.sectors.length>1).length,extendedWaves:extended});
