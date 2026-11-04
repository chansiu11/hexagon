/* Seventh stage: original, moderately challenging procedural wave layout.
   Self-contained and seeded so every attempt varies but any bug is replayable. */
(function(root){'use strict';
const SIDES=6, SAMPLE_RATE=60, DURATION=60, SPAWN_RADIUS=735;
function makeRng(seed){
 let state=(seed>>>0)||0x9e3779b9;
 return ()=>{state^=state<<13;state^=state>>>17;state^=state<<5;
  return (state>>>0)/4294967296};
}
function create(seed){
 const actualSeed=Number.isFinite(seed)?seed>>>0:(Math.random()*4294967296)>>>0;
 const random=makeRng(actualSeed);
 const waves=[];
 let safe=4,impact=3.7,index=0;
 while(impact<59){
  if(index>0){
   const drift=random(),move=drift<.38?-1:drift<.76?1:0;
   safe=(safe+move+SIDES)%SIDES;
  }
  // Two connected escape lanes are the normal rhythm. Later, an
  // occasional one-lane gate supplies a short but fair challenge.
  const type=random();
  const openings=index<5?2:type<.19?1:type<.27?3:2;
  const open=new Set([safe]);
  if(openings===2)open.add((safe+(random()<.5?-1:1)+SIDES)%SIDES);
  if(openings===3){open.add((safe+SIDES-1)%SIDES);open.add((safe+1)%SIDES);}
  const blocked=Array.from({length:SIDES},(_,i)=>i).filter(i=>!open.has(i));
  const speed=258+Math.min(27,impact*.40)+random()*17;
  const thickness=36+Math.floor(random()*13);
  const start=impact-(SPAWN_RADIUS-66)/speed;
  const end=Math.min(DURATION,start+(SPAWN_RADIUS+thickness-26)/speed);
  // The ring is wholly outside the viewport at birth, descends at one
  // continuous speed and expires behind the core. Its hitbox and its
  // drawn sectors come from exactly this same single wave.
  waves.push({id:index,start,end,r:SPAWN_RADIUS,speed,thickness,
   sides:SIDES,sectors:blocked,safeSector:safe,openings,impact});
  index++;
  const spacing=impact<16?2.35:impact<34?2.10:1.93;
  impact+=spacing+(random()-.5)*.40+(openings===1?.20:0);
 }
 const camera=Array.from({length:DURATION*SAMPLE_RATE+1},()=>[1,0,0,1,0,0]);
 return {mode:'batched-wall-waves',kind:'procedural-random',seed:actualSeed,
  sampleRate:SAMPLE_RATE,duration:DURATION,shapeSchedule:[[0,SIDES]],
  camera,waves,offscreenBirth:true};
}
const API={create,makeRng,SIDES,SPAWN_RADIUS};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexRandomWaves=API;
})(typeof window!=='undefined'?window:globalThis);
