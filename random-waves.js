/* Seventh stage: faster but physically reachable randomized walls, changing
   polygon shapes, and deterministic (per-seed) camera spin targets. No original
   stage timelines or assets are modified. */
(function(root){'use strict';
const SAMPLE_RATE=60,DURATION=60,SPAWN_RADIUS=835,TAU=Math.PI*2;
const SHAPE_SCHEDULE=Object.freeze([[0,6],[12,5],[27,6],[42,4],[53,5]]);
function makeRng(seed){
 let state=(seed>>>0)||0x9e3779b9;
 return ()=>{state^=state<<13;state^=state>>>17;state^=state<<5;
  return (state>>>0)/4294967296};
}
const atTime=(t,schedule)=>{let sides=schedule[0][1];
 for(const [start,n] of schedule)if(t>=start)sides=n;else break;
 return sides;
};
const wrap=(a,n)=>(a%n+n)%n;
function create(seed){
 const actualSeed=Number.isFinite(seed)?seed>>>0:(Math.random()*4294967296)>>>0;
 const random=makeRng(actualSeed),waves=[],schedule=SHAPE_SCHEDULE.map(entry=>[...entry]);
 let impact=3.6,index=0,safeSector=4,previousSides=6,easyRun=0;
 while(impact<59.35){
  // Change the *core* shape at the scheduled time, and reserve a readable
  // interval on both sides of each morph. New-shaped actors never spawn
  // before the corresponding core has started its transformation.
  for(const [boundary] of schedule.slice(1))
   if(impact>boundary-.80&&impact<boundary+3.2)impact=boundary+3.2;
  if(impact>=59.35)break;
  const sides=atTime(impact,schedule),step=TAU/sides;
  if(index>0){
   const oldCenter=(safeSector+.5)*TAU/previousSides;
   safeSector=Math.floor(wrap(oldCenter,TAU)/step);
   const move=random();
   safeSector=wrap(safeSector+(move<.39?-1:move<.78?1:0),sides);
  }
  if(index>0&&previousSides!==sides){
   // Mapping to a new polygon can add half a sector before the random
   // turn. Do not combine that remap with a second, far-away opening.
   const oldCenter=(waves[index-1].safeSector+.5)*TAU/previousSides;
   const turn=Math.abs(wrap((safeSector+.5)*step-oldCenter+Math.PI,TAU)-Math.PI);
   if(turn>=1.9)safeSector=Math.floor(wrap(oldCenter,TAU)/step);
  }
  previousSides=sides;
  // Sharply more demanding than v1: ~40% narrow one-side gaps late,
  // denser arrivals, and few three-side breathing patterns.
  const type=random(),difficulty=Math.min(1,impact/56);
  const narrowChance=index<3?0:.30+.15*difficulty;
  const openings=easyRun>=3?1:type<narrowChance?1:type<narrowChance+.055?3:2;
  easyRun=openings===1?0:easyRun+1;
  const open=new Set([safeSector]);
  if(openings===2)open.add(wrap(safeSector+(random()<.5?-1:1),sides));
  if(openings===3){open.add(wrap(safeSector-1,sides));open.add(wrap(safeSector+1,sides))}
  const sectors=Array.from({length:sides},(_,i)=>i).filter(i=>!open.has(i));
  const speed=296+Math.min(48,impact*.77)+random()*18;
  const thickness=40+Math.floor(random()*14);
  if(waves.length){
   const previous=waves[waves.length-1];
   const oldCenter=(previous.safeSector+.5)*TAU/previous.sides;
   const turn=Math.abs(wrap((safeSector+.5)*step-oldCenter+Math.PI,TAU)-Math.PI);
   // The triangle is inside the [59,73] radial band. Wait until the
   // previous ring is wholly inside it, allow human input plus travel at
   // the actual 420deg/s turn rate, and finish before the next polygon's
   // apothem enters that band. Discrete presses get 180ms each as well.
   const clearAt=previous.impact+(66+previous.thickness-59)/previous.speed;
   const approach=(73/Math.cos(Math.PI/sides)-66)/speed;
   const travel=Math.max(turn/(420*TAU/360),Math.ceil(turn/step-1e-9)*.18);
   impact=Math.max(impact,clearAt+.25+travel+approach);
  }
  const start=impact-(SPAWN_RADIUS-66)/speed;
  const end=Math.min(DURATION,start+(SPAWN_RADIUS+thickness-26)/speed);
  waves.push({id:index,start,end,r:SPAWN_RADIUS,speed,thickness,
   sides,sectors,safeSector,openings,impact});
  index++;
  const spacing=impact<13?1.70:impact<32?1.48:impact<48?1.34:1.22;
  impact+=spacing+(random()-.5)*.22+(openings===1?.12:0);
 }
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
 const camera=Array.from({length:DURATION*SAMPLE_RATE+1},()=>[1,0,0,1,0,0]);
 return {mode:'batched-wall-waves',kind:'procedural-random',seed:actualSeed,
  sampleRate:SAMPLE_RATE,duration:DURATION,shapeSchedule:schedule,
  camera,waves,spinEvents,tiltPhase,offscreenBirth:true};
}
const API={create,makeRng,SPAWN_RADIUS,SHAPE_SCHEDULE,atTime};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexRandomWaves=API;
})(typeof window!=='undefined'?window:globalThis);
