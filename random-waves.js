/* Stage seven mixes formations extracted from the six normal stages.
   Every authored gate keeps a reachable opening before it is ever spawned. */
(function(root){'use strict';
const BANK=typeof module!=='undefined'?require('./pattern-bank.js'):root.HexPatternBank;
const TRANSITION=typeof module!=='undefined'?require('./mixed-transition.js'):root.HexMixedTransition;
const TAU=Math.PI*2,SPAWN_RADIUS=1200,DURATION=60,PLAYER_SPEED=420*TAU/360;
const TRACKS=Object.freeze([{index:0,key:'courtesy',bpm:130,phase:.085,difficulty:1,cadence:1.45,speedScale:.94,spinScale:.78,tiltScale:.55},{index:1,key:'otis',bpm:135,phase:.005,difficulty:2,cadence:1.2,speedScale:1,spinScale:1,tiltScale:.85},{index:2,key:'focus',bpm:174,phase:.06,difficulty:3,cadence:.72,speedScale:1.10,spinScale:1.30,tiltScale:1.4}]);
const wrap=(a,n=TAU)=>(a%n+n)%n,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const delta=(a,b)=>wrap(b-a+Math.PI)-Math.PI;
function makeRng(seed){let s=(seed>>>0)||0x9e3779b9;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296}}
const atTime=(time,schedule)=>{let n=schedule[0][1];for(const[t,s]of schedule)if(time>=t)n=s;else break;return n};
function create(seed,trackIndex){
 const actualSeed=Number.isFinite(seed)?seed>>>0:(Math.random()*4294967296)>>>0;
 const random=makeRng(actualSeed),pick=makeRng(Math.imul(actualSeed,0x9e3779b1)^0x71c3a695);
 const track=TRACKS[Number.isInteger(trackIndex)&&trackIndex>=0&&trackIndex<3?trackIndex:Math.floor(pick()*3)],halfBeat=30/track.bpm,beat=60/track.bpm;
 const snap=t=>track.phase+Math.ceil((t-track.phase)/halfBeat-1e-9)*halfBeat;
 const shapeSchedule=[[0,6]];let boundary=3.8+random()*4.2,shape=6;
 while(boundary<56){
  const choices=[4,5,6].filter(n=>n!==shape);shape=choices[Math.floor(random()*choices.length)];
  shapeSchedule.push([boundary,shape]);boundary+=3.7+random()*5.1;
 }
 function outsideMorph(t){
  let next=snap(t);
  for(const[at]of shapeSchedule.slice(1))if(next>=at&&next<at+.85)next=snap(at+.85);
  return next;
 }
 const rims=makeRng(actualSeed^0x5a18c93d);
 const waves=[];let proposed=3.3,pattern=null,gateIndex=0,patternSides=6,offset=0,lastLevel=-1,stationary=0;
 while(proposed<59.3){
  let impact=outsideMorph(proposed),ready=null;
  if(impact>=59.3)break;
  const rimPlan=[];
  if(rims()<.48)rimPlan.push({band:'inner',gap:14+rims()*14,thickness:6+rims()*5,pick:rims()});
  if(rims()<.48)rimPlan.push({band:'outer',gap:10+rims()*15,thickness:6+rims()*5,pick:rims()});
  for(let retry=0;retry<5;retry++){
   const sides=atTime(impact,shapeSchedule),step=TAU/sides,prev=waves.at(-1);
   if(!pattern||gateIndex>=pattern.gates.length||patternSides!==sides){
    const choices=BANK.filter(p=>p.level!==lastLevel);
    pattern=choices[Math.floor(random()*choices.length)];lastLevel=pattern.level;
    gateIndex=0;patternSides=sides;offset=Math.floor(random()*sides);
   }
   const gate=pattern.gates[gateIndex],blocked=new Set();
   for(let sector=0;sector<sides;sector++){
    const sourceSector=Math.floor(wrap(sector-offset+.5,sides)*gate.sides/sides);
    if(gate.sectors.includes(sourceSector))blocked.add(sector);
   }
   const oldAngle=prev?(prev.safeSector+.5)*TAU/prev.sides:Math.PI*1.5;
   const candidates=Array.from({length:sides},(_,i)=>i).filter(i=>!blocked.has(i))
    .sort((a,b)=>Math.abs(delta(oldAngle,(a+.5)*step))-Math.abs(delta(oldAngle,(b+.5)*step)));
   let safeSector=candidates[0];
   if(stationary>=2&&candidates.length>1&&Math.abs(delta(oldAngle,(candidates[1]+.5)*step))<1.9)safeSector=candidates[1];
   if(safeSector===undefined||Math.abs(delta(oldAngle,(safeSector+.5)*step))>=1.9){
    // Quantising a source formation to a new polygon must never seal the
    // nearest reachable landing. Remove the blocking face at generation.
    safeSector=Math.floor(wrap(oldAngle)/step);blocked.delete(safeSector);
   }
   // A disappearing side must carry its opening into the adjoining faces,
   // rather than squeezing the player's route to a zero-width corner.
   const t=TRANSITION.sectorT(sides,safeSector);
   for(const n of [4,5,6]){
    const k=Math.min(5,Math.floor(t*6)),a=TRANSITION.laneAt(n,k/6),b=TRANSITION.laneAt(n,(k+1)/6);
    if(a===b){blocked.delete((safeSector+sides-1)%sides);blocked.delete((safeSector+1)%sides);}
   }
   if(!blocked.size)blocked.add((safeSector+Math.floor(sides/2))%sides);
   const speed=clamp(327.4529736770803*1.15*(.98+.08*impact/60)+random()*10,365,418)*track.speedScale;
   const thickness=clamp(gate.thickness*1.05,38,58);
   const smallWalls=rimPlan.map(r=>({...r,offset:r.band==='inner'?-r.gap:thickness+r.gap,
    sector:[...blocked][Math.min(blocked.size-1,Math.floor(r.pick*blocked.size))]}));
   const innerExtra=Math.max(0,...smallWalls.map(r=>-r.offset));
   const outerExtra=Math.max(0,...smallWalls.map(r=>r.offset+r.thickness-thickness));
   let earliest=impact;
   if(prev){
    const turn=Math.abs(delta(oldAngle,(safeSector+.5)*step));
    const clearAt=TRANSITION.timeAtClock(TRANSITION.clockAt(prev.impact,shapeSchedule)+(66+prev.thickness+prev.outerExtra-59)/prev.speed,shapeSchedule);
    const approach=(73/Math.cos(Math.PI/4)-66+innerExtra)/speed;
    const travel=Math.max(turn/PLAYER_SPEED,Math.ceil(turn/step-1e-9)*.18);
    earliest=outsideMorph(Math.max(impact,TRANSITION.timeAtClock(TRANSITION.clockAt(clearAt+.20+travel,shapeSchedule)+approach,shapeSchedule)));
   }
   if(atTime(earliest,shapeSchedule)!==sides){impact=earliest;continue;}
   impact=earliest;
   ready={sides,safeSector,smallWalls,innerExtra,outerExtra,sectors:[...blocked].sort((a,b)=>a-b),speed,thickness,
    patternId:pattern.id,sourceLevel:pattern.level,sourceIds:gate.sourceIds,gap:gate.gap};break;
  }
  if(!ready||impact>=59.3)break;
  const prev=waves.at(-1),angle=(ready.safeSector+.5)*TAU/ready.sides;
  stationary=prev&&Math.abs(delta((prev.safeSector+.5)*TAU/prev.sides,angle))<.1?stationary+1:0;
  const motionImpact=TRANSITION.clockAt(impact,shapeSchedule);
  const start=motionImpact-(SPAWN_RADIUS-66)/ready.speed;
  waves.push({...ready,id:waves.length,impact,start,end:Math.min(TRANSITION.clockAt(60,shapeSchedule),start+(SPAWN_RADIUS+ready.thickness+ready.outerExtra-26)/ready.speed),r:SPAWN_RADIUS,openings:ready.sides-ready.sectors.length});
  gateIndex++;proposed=impact+clamp(ready.gap,.34,.78)*track.cadence;
 }
 const spinEvents=[],spin=makeRng(actualSeed^0xd31f6c29);let time=0,direction=spin()<.5?-1:1;
 while(time<60.1){
  if(spin()<.65)direction*=-1;
  spinEvents.push([time,direction*(.75+time/60*3.25+spin()*.65)*track.spinScale]);
  time=track.phase+Math.ceil((time+(spin()<.5?2:4)*beat-track.phase)/beat)*beat;
 }
 const tiltEvents=[],tilt=makeRng(actualSeed^0xa1793c45);time=0;
 while(time<60.1){
  const magnitude=Math.min(.38,.07+tilt()*(.20+.10*time/60)*track.tiltScale);
  tiltEvents.push([time,(tilt()<.5?-1:1)*magnitude]);time+=2.4+tilt()*3.8;
 }
 return {mode:'batched-wall-waves',kind:'mixed-pattern',seed:actualSeed,sampleRate:60,duration:DURATION,
  shapeSchedule,morphSeconds:TRANSITION.MORPH_SECONDS,waves,musicTrack:track,spinEvents,tiltEvents,offscreenBirth:true};
}
const API={create,makeRng,atTime,SPAWN_RADIUS,TRACKS,PATTERN_BANK:BANK};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.HexRandomWaves=API;
})(typeof window!=='undefined'?window:globalThis);
