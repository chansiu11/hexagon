/* Stage seven reuses the normal first-stage wall actors and shape schedule.
   Randomness selects the music and camera, never the prescribed wall order. */
(function(root){'use strict';
const TAU=Math.PI*2,DURATION=60,SAMPLE_RATE=60,RADIAL_GAIN=1.15;
const SHAPE_SCHEDULE=Object.freeze([[0,6],[20,5],[26.733,4],[36.2,5],[43,4],[49.667,5],[55.267,6]]);
// Only stage seven: these overlapping source observations seal discrete
// landings near 30s, 40s, 50-51s and 56s. Stable IDs prevent popping.
const OMITTED_ACTORS=Object.freeze([414,406,418,424,426,503,417,335,230,235,233]);
// Tempo and phase measured from bass/transient onsets in the bundled MP3s.
const TRACKS=Object.freeze([
 {index:0,key:'courtesy',bpm:130,phase:.085},
 {index:1,key:'otis',bpm:135,phase:.005},
 {index:2,key:'focus',bpm:174,phase:.06}
]);
let normalSource=null;
function makeRng(seed){let state=(seed>>>0)||0x9e3779b9;return()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296}}
function setSource(source){
 if(source?.mode!=='batched-wall-waves'||!source.waves?.length)throw Error('Normal stage wall source is unavailable');
 normalSource=source;
}
const atTime=(t,schedule)=>{let sides=schedule[0][1];for(const[at,n]of schedule)if(t>=at)sides=n;else break;return sides};
function engine(){return typeof module!=='undefined'?require('./engine.js'):root.HexEngine}
const impactCache=new WeakMap();
function normalImpacts(source){
 if(impactCache.has(source))return impactCache.get(source);
 const e=engine(),g=new e.Game(0,source),events=[],previous=new Map();
 // Measure the actual normal-stage faces rather than the noisy raw track
 // estimates: existing corrections, first-ring slowdown and morph all apply.
 for(let frame=0;frame<=3600;frame++){
  const time=frame/60;g.time=time;g.sampleWalls();
  for(const w of g.walls){
   const accelerated={...w,r:26+(w.r-26)*RADIAL_GAIN,thickness:w.thickness*RADIAL_GAIN};
   const p=e.wallVisualPoly(accelerated,g.fromSides,g.sides,g.morph);
   const face=Math.hypot((p[0][0]+p[1][0])/2,(p[0][1]+p[1][1])/2);
   const prev=previous.get(w.id);
   if(prev&&prev.face>66&&face<=66&&face<prev.face){
    const at=time-(1/60)*(66-face)/(prev.face-face);
    if(at>1&&at<59&&source.shapeSchedule.every(([boundary])=>Math.abs(at-boundary)>.7))events.push(at);
   }
   previous.set(w.id,{face});
  }
 }
 events.sort((a,b)=>a-b);impactCache.set(source,events);return events;
}
function beatKnots(source,track){
 const events=normalImpacts(source);
 const knots=[[0,0]],halfBeat=30/track.bpm;let lastEvent=-1;
 for(const sourceTime of events){
  if(sourceTime-lastEvent<.28)continue;
  lastEvent=sourceTime;
  const target=track.phase+Math.round((sourceTime-track.phase)/halfBeat)*halfBeat;
  const prior=knots[knots.length-1],offset=sourceTime-target,priorOffset=prior[1]-prior[0];
  // Smoothstep interpolation keeps velocity continuous and bounded.
  // Never compress a normal escape interval by more than 22.5 percent.
  if(target-prior[0]<.3||Math.abs(offset-priorOffset)>.15*(target-prior[0]))continue;
  knots.push([target,sourceTime]);
 }
 while(knots.length>1&&Math.abs(knots.at(-1)[1]-knots.at(-1)[0])>.15*(60-knots.at(-1)[0]))knots.pop();
 knots.push([60,60]);return knots;
}
const plans=new WeakMap();
function create(seed,source=normalSource){
 if(!source&&typeof module!=='undefined')source=require('./assets/timelines/waves-stage-0.json');
 if(!source)throw Error('Load the normal first stage before starting stage seven');
 const actualSeed=Number.isFinite(seed)?seed>>>0:(Math.random()*4294967296)>>>0;
 const random=makeRng(actualSeed),pick=makeRng(Math.imul(actualSeed,0x9e3779b1)^0x71c3a695);
 const track=TRACKS[Math.floor(pick()*TRACKS.length)];
 let cache=plans.get(source);if(!cache){cache=TRACKS.map(t=>beatKnots(source,t));plans.set(source,cache)}
 // Smoothly interpolated target spin changes. Later changes are more rapid
 // and much faster. The player, core and walls share the same camera transform.
 const spinEvents=[],spinStartRandom=makeRng(actualSeed^0xd31f6c29);
 let t=0,sign=spinStartRandom()<.5?-1:1;
 while(t<DURATION+.1){
  if(spinStartRandom()<.67)sign*=-1;
  const ramp=Math.pow(Math.min(1,t/DURATION),1.08);
  const magnitude=.72+ramp*4.45+spinStartRandom()*(.45+ramp*.55);
  spinEvents.push([t,sign*magnitude]);
  t+=Math.max(1.45,3.7-t*.037)+spinStartRandom()*.85;
 }
 const tiltPhase=random()*TAU;
 return {mode:'batched-wall-waves',kind:'normal-pattern',seed:actualSeed,
  sampleRate:SAMPLE_RATE,duration:DURATION,shapeSchedule:source.shapeSchedule,
  normalTimeline:source,waves:source.waves,radialGain:RADIAL_GAIN,
  omittedActors:OMITTED_ACTORS,clockKnots:cache[track.index],musicTrack:track,
  spinEvents,tiltPhase,offscreenBirth:true};
}
const API={create,setSource,makeRng,SHAPE_SCHEDULE,RADIAL_GAIN,OMITTED_ACTORS,TRACKS,atTime};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.HexRandomWaves=API;
})(typeof window!=='undefined'?window:globalThis);
