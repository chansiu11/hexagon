/* Task 2: source-video wall phrase playback for HEXAGON 60s onward.
 * Reference: user-uploaded 1557(7).mp4 (61.7–113.9s).
 * Uses 58 observed wall crossings in ten connected 6/5/4-sided phrases.
 * Source data are estimates from 10fps sampling, not original-game assets.
 *
 * First cycle follows the recording order. Later cycles choose WHOLE
 * compatible phrases (same polygon shape) from a seeded shuffle bag.
 * No individual wall masks, widths or intra-phrase offsets are shuffled.
 * Existing task-1 walls are preserved when the game reaches 60 seconds.
 */
(function(root){'use strict';
const H=typeof module!=='undefined'?require('./hard-mode'):root.HexHardMode;
const M=typeof module!=='undefined'?require('./mixed-transition'):root.HexMixedTransition;
const VIDEO=typeof module!=='undefined'?require('./hard-post60-video-parts'):root.HexHardPost60VideoParts;
const TAU=2*Math.PI,START=60,PERIOD=56,RADIUS=1250,SPEED=360;
const TRAVEL=(RADIUS-66)/SPEED,PARTS=VIDEO.COMPLETE_PARTS;
const mod=(v,n)=>(v%n+n)%n;
const wrap=a=>mod(a,TAU);
function randomFromSeed(seed){
 let n=(seed^0x6a5d4e31)>>>0;
 return ()=>{n=(n+0x6d2b79f5)>>>0;
  let v=Math.imul(n^n>>>15,1|n);
  v^=v+Math.imul(v^v>>>7,61|v);
  return ((v^v>>>14)>>>0)/4294967296;
 };
}
function extendSchedule(before,cues,duration,rate){
 const out=before.filter(event=>(Array.isArray(event)?event[0]:event.at)<START)
  .map(event=>Array.isArray(event)?event.slice():{...event});
 for(let i=0;i<duration-START;i+=rate)
  for(const item of cues){
   const at=item[0]+i;
   if(at<duration)out.push(Array.isArray(before[0])?[at,item[1]]:
    {at,rate:item[1],tilt:item[2],post60:true});
  }
 out.sort((a,b)=>(Array.isArray(a)?a[0]:a.at)-(Array.isArray(b)?b[0]:b.at));
 return out;
}
function shapeCues(shift){
 const cues=[[PARTS[0].originalStart+shift-.87,PARTS[0].sides]];
 for(let i=1;i<PARTS.length;i++){
  const prev=PARTS[i-1],next=PARTS[i];
  const a=prev.events.at(-1),b=next.events[0];
  const latestLeft=prev.originalStart+prev.length+a.width/SPEED+.23;
  const earliestRight=next.originalStart-b.width/SPEED-.61;
  const cue=earliestRight>=latestLeft?
   (latestLeft+earliestRight)/2:
   (prev.originalStart+prev.length+next.originalStart)/2;
  cues.push([cue+shift,next.sides]);
 }
 return cues;
}
function actorFrom(w){
 return {...w,actors:w.sectors.flatMap(s=>M.panels(w.sides,s).map(([a,b],i)=>({
  id:w.id+':'+s+':'+i,waveId:w.id,band:'main',sector:s,
  sides:w.sides,thickness:w.profiles[s].thickness,offset:0,
  mixedStart:a,mixedEnd:b,hardPanel:true,
  renderPoly:[[0,0],[0,0],[0,0],[0,0]]
 })))};
}
function dangerAt(waves,at,schedule){
 const clock=H.wallClock(at,schedule);
 return waves.some(w=>{
  if(w.start>clock||w.end<=clock)return false;
  const r=w.r-w.speed*(clock-w.start);
  return r<=190&&w.actors.some(p=>r+p.offset+p.thickness>=46);
 });
}
function build(g,cameraEvents){
 const original=g.timeline,limit=H.wallClock(START,original.shapeSchedule);
 const old=g._actors.filter(w=>w.start<=limit+1e-9);
 const latest=old.reduce((a,b)=>b.impact>a.impact?b:a,
  {impact:60,thickness:45,safeAngle:g.angle});
 const random=randomFromSeed(original.seed),firstTime=PARTS[0].originalStart;
 // The clip begins almost immediately after video timer 60, but existing
 // task-1 walls already occupy the field. Move the post-60 BEGINNING forward
 // as a whole so its first ring is spawned offscreen, never popped in.
 let sourceShift=Math.max(3.75,latest.impact+
   (latest.thickness+100)/SPEED+.3-firstTime);
 let schedule;
 for(let i=0;i<100;i++){
  schedule=extendSchedule(original.shapeSchedule,shapeCues(sourceShift),
   original.duration,PERIOD);
  const introTime=firstTime+sourceShift,firstBorn=H.wallClock(introTime,schedule)-TRAVEL;
  const cue=shapeCues(sourceShift)[0][0];
  if(firstBorn>limit+.09&&!dangerAt(old,cue,schedule))break;
  sourceShift+=.11;
 }
 // Camera motion stays controlled by the existing task-2 score, not by
 // the random part order or by the new wall mask/width extraction.
 const groups=extendSchedule(original.groups,cameraEvents,original.duration,54);
 const waves=[],order=[],lastChoice={4:null,5:null,6:null};
 let index=0,exitAngle=Number.isFinite(latest.safeAngle)?latest.safeAngle:g.angle;
 const family=n=>PARTS.filter(p=>p.sides===n);
 function clipForSlot(slot,cycle){
  if(!cycle)return slot;
  const fit=family(slot.sides).filter(p=>p.length<=slot.length+.25);
  const valid=fit.filter(p=>p.id!==lastChoice[slot.sides]);
  const choices=valid.length?valid:fit;
  return choices.length?choices[Math.floor(random()*choices.length)]:slot;
 }
 function rotationFor(clip,cycle){
  if(cycle===0&&order.length===0)return 0;
  const n=clip.sides,candidates=[];
  let best=Infinity;
  for(let offset=0;offset<n;offset++){
   const blocked=clip.events[0].blocked.map(sec=>(sec+offset)%n);
   const openings=Array.from({length:n},(_,i)=>i).filter(sec=>!blocked.includes(sec));
   const value=Math.min(...openings.map(sec=>{
    const d=wrap((sec+.5)*TAU/n-exitAngle);
    return Math.min(d,TAU-d);
   }));
   if(value<best-1e-7){best=value;candidates.length=0;candidates.push(offset)}
   else if(Math.abs(best-value)<1e-7)candidates.push(offset);
  }
  return candidates[Math.floor(random()*candidates.length)]??0;
 }
 for(let cycle=0;START+cycle*PERIOD<original.duration;cycle++){
  for(const slot of PARTS){
   const clip=clipForSlot(slot,cycle),start=slot.originalStart+sourceShift+cycle*PERIOD;
   if(start>=original.duration-2)break;
   const rotation=rotationFor(clip,cycle),group=order.length;
   let count=0,last=null;
   for(let j=0;j<clip.events.length;j++){
    const event=clip.events[j],impact=start+event.offset;
    if(impact>=original.duration)break;
    const n=clip.sides;
    // The native polygon is part of the source recording. Never force a
    // pentagon waveform onto a square / hexagon wall.
    if(H.shapeAt(impact,schedule).to!==n)continue;
    const sectors=[...new Set(event.blocked.map(k=>(k+rotation)%n))]
     .sort((a,b)=>a-b);
    if(!sectors.length||sectors.length>=n)continue;
    const open=Array.from({length:n},(_,i)=>i).filter(i=>!sectors.includes(i));
    const closest=open.reduce((a,b)=>{
     const distance=i=>{
      const d=wrap((i+.5)*TAU/n-exitAngle);
      return Math.min(d,TAU-d);
     };
     return distance(b)<distance(a)?b:a;
    },open[0]);
    const born=H.wallClock(impact,schedule)-TRAVEL;
    if(born<=limit+.02)continue;
    const profiles=Object.fromEntries(sectors.map(i=>[i,{thickness:event.width,offset:0}]));
    last={id:1000000+index++,partId:clip.id,partEvent:j,
     originalSlot:slot.id,cycle,group,sourceVideo:'1557(7).mp4',
     sourceGameSeconds:event.sourceGameSeconds,
     sourceVideoSeconds:event.sourceVideoSeconds,
     sourceMask:event.screenMask,sourceOffset:event.offset,
     sourceNativeSides:n,partRotation:rotation,
     sides:n,sectors,profiles,safeSector:closest,
     safeAngle:(closest+.5)*TAU/n,impact,
     r:RADIUS,speed:SPEED,thickness:event.width,born, start:born,
     end:born+(RADIUS+event.width-26)/SPEED};
    waves.push(last);
    exitAngle=last.safeAngle;
    count++;
   }
   if(last){
    order.push({id:clip.id,slotId:slot.id,cycle,at:start,
     end:last.impact,events:count,rotation,
     sourceVideoStart:clip.sourceVideoStart,
     sourceVideoEnd:clip.sourceVideoEnd,
     nativeSides:clip.sides});
    lastChoice[slot.sides]=clip.id;
   }
  }
 }
 g.timeline={...original,mode:'hard-post60-video-phrases',
  shapeSchedule:schedule,groups,
  waves:old.concat(waves),post60Parts:order,
  post60Source:VIDEO.SOURCE,post60SourceEventCount:VIDEO.EVENT_COUNT,
  post60PhraseCount:PARTS.length,
  post60FirstPlaybackInSourceOrder:true,post60InitialTimeShift:sourceShift};
 g._actors=old.concat(waves.map(actorFrom)).sort((a,b)=>a.start-b.start);
 g._cursor=0;g._active=[];g._lastClock=-Infinity;
 g._post60Active=true;g._post60RotationStart=g.rotation;
 g.sampleWalls();
 return {preserved:old.length,generated:waves.length,
  parts:order.length,firstCycle:order.filter(x=>x.cycle===0).length};
}
const API={build,PARTS,PERIOD,shapeCues,dangerAt};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexHardPost60VideoRun=API;
})(typeof window!=='undefined'?window:globalThis);
