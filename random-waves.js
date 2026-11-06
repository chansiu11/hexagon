/* Stage seven mixes formations extracted from the six normal stages.
   Every authored gate keeps a reachable opening before it is ever spawned. */
(function(root){'use strict';
const BANK=typeof module!=='undefined'?require('./pattern-bank.js'):root.HexPatternBank;
const TRANSITION=typeof module!=='undefined'?require('./mixed-transition.js'):root.HexMixedTransition;
const TAU=Math.PI*2,SPAWN_RADIUS=1200,DURATION=60,PLAYER_SPEED=420*TAU/360;
const TRACKS=Object.freeze([{index:0,key:'courtesy',bpm:130,phase:.085},{index:1,key:'otis',bpm:135,phase:.005},{index:2,key:'focus',bpm:174,phase:.06}]);
const wrap=(a,n=TAU)=>(a%n+n)%n,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const delta=(a,b)=>wrap(b-a+Math.PI)-Math.PI;
function makeRng(seed){let s=(seed>>>0)||0x9e3779b9;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296}}
const atTime=(time,schedule)=>{let n=schedule[0][1];for(const[t,s]of schedule)if(time>=t)n=s;else break;return n};
function create(seed){
 const actualSeed=Number.isFinite(seed)?seed>>>0:(Math.random()*4294967296)>>>0;
 const random=makeRng(actualSeed),pick=makeRng(Math.imul(actualSeed,0x9e3779b1)^0x71c3a695);
 const track=TRACKS[Math.floor(pick()*3)],halfBeat=30/track.bpm,beat=60/track.bpm;
 const snap=t=>track.phase+Math.ceil((t-track.phase)/halfBeat-1e-9)*halfBeat;
 const shapeSchedule=[[0,6]];let boundary=Math.ceil((6.5+random()*2)/beat)*beat,shape=6;
 while(boundary<56){
  const choices=[4,5,6].filter(n=>n!==shape);shape=choices[Math.floor(random()*choices.length)];
  shapeSchedule.push([boundary,shape]);boundary=Math.ceil((boundary+6.1+random()*2.8)/beat)*beat;
 }
 function outsideMorph(t){
  let next=snap(t);
  for(const[at]of shapeSchedule.slice(1))if(next>at-.85&&next<at+1.05)next=snap(at+1.05);
  return next;
 }
 const waves=[];let proposed=3.3,pattern=null,gateIndex=0,patternSides=6,offset=0,lastLevel=-1,stationary=0;
 while(proposed<59.3){
  let impact=outsideMorph(proposed),ready=null;
  if(impact>=59.3)break;
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
   const speed=clamp(327.4529736770803*1.15*(.98+.08*impact/60)+random()*10,365,418);
   const thickness=clamp(gate.thickness*1.05,38,58);
   let earliest=impact;
   if(prev){
    const turn=Math.abs(delta(oldAngle,(safeSector+.5)*step));
    const clearAt=prev.impact+(66+prev.thickness-59)/prev.speed;
    const approach=(73/Math.cos(Math.PI/sides)-66)/speed;
    const travel=Math.max(turn/PLAYER_SPEED,Math.ceil(turn/step-1e-9)*.18);
    earliest=outsideMorph(Math.max(impact,clearAt+.20+travel+approach));
   }
   if(atTime(earliest,shapeSchedule)!==sides){impact=earliest;continue;}
   impact=earliest;
   ready={sides,safeSector,sectors:[...blocked].sort((a,b)=>a-b),speed,thickness,
    patternId:pattern.id,sourceLevel:pattern.level,sourceIds:gate.sourceIds,gap:gate.gap};break;
  }
  if(!ready||impact>=59.3)break;
  const prev=waves.at(-1),angle=(ready.safeSector+.5)*TAU/ready.sides;
  stationary=prev&&Math.abs(delta((prev.safeSector+.5)*TAU/prev.sides,angle))<.1?stationary+1:0;
  const motionImpact=TRANSITION.clockAt(impact,shapeSchedule);
  const start=motionImpact-(SPAWN_RADIUS-66)/ready.speed;
  waves.push({...ready,id:waves.length,impact,start,end:Math.min(TRANSITION.clockAt(60,shapeSchedule),start+(SPAWN_RADIUS+ready.thickness-26)/ready.speed),r:SPAWN_RADIUS,openings:ready.sides-ready.sectors.length});
  gateIndex++;proposed=impact+clamp(ready.gap,.34,.78);
 }
 const spinEvents=[],spin=makeRng(actualSeed^0xd31f6c29);let time=0,direction=spin()<.5?-1:1;
 while(time<60.1){
  if(spin()<.65)direction*=-1;
  spinEvents.push([time,direction*(.75+time/60*3.25+spin()*.65)]);
  time=track.phase+Math.ceil((time+(spin()<.5?2:4)*beat-track.phase)/beat)*beat;
 }
 const tiltEvents=[],tilt=makeRng(actualSeed^0xa1793c45);time=0;
 while(time<60.1){
  const magnitude=.07+tilt()*(.20+.10*time/60);
  tiltEvents.push([time,(tilt()<.5?-1:1)*magnitude]);time+=2.4+tilt()*3.8;
 }
 return {mode:'batched-wall-waves',kind:'mixed-pattern',seed:actualSeed,sampleRate:60,duration:DURATION,
  shapeSchedule,morphSeconds:TRANSITION.MORPH_SECONDS,waves,musicTrack:track,spinEvents,tiltEvents,offscreenBirth:true};
}
const API={create,makeRng,atTime,SPAWN_RADIUS,TRACKS,PATTERN_BANK:BANK};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.HexRandomWaves=API;
})(typeof window!=='undefined'?window:globalThis);
