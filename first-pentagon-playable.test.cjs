'use strict';
// A static free angle is NOT a reachable escape: the old first-pentagon
// arrangement left a visible sector but stranded every player path at 20.88s.
// Track possible player headings across consecutive frames with the real
// collision polygons and at most 7 degrees of motion per 60-Hz frame.
const assert=require('node:assert/strict');
const {Game,playerPoly,wallVisualPoly,intersect,PLAYER_SPEED}=require('./engine');
const data=require('./assets/timelines/waves-stage-0.json');
const game=new Game(0,data),SIZE=360,TAU=Math.PI*2;
const playerPolygons=Array.from({length:SIZE},(_,a)=>playerPoly(a*TAU/SIZE));
assert(Math.abs(PLAYER_SPEED*180/Math.PI/60-7)<1e-9);
// An actor naturally expires after crossing the core; test IDs before that point.
const checked=[18,19.9,20,20.1,20.28,20.45,20.75,20.85,20.883333,20.9];
for(const t of checked){
 game.time=t;game.sampleWalls();
 const ring=game.walls.filter(w=>w.waveId>=144&&w.waveId<=149)
  .sort((a,b)=>a.waveId-b.waveId);
 assert.deepEqual(ring.map(w=>w.waveId),[144,145,146,147],
  'ring actors should not be duplicated or disappear at '+t);
 assert.deepEqual(ring.map(w=>w.sector),[0,1,2,3],
  'the first pentagon must leave reachable sector 4 free at '+t);
 assert.deepEqual(ring.map(w=>w.fromSector),[0,1,2,3]);
 assert.deepEqual(ring.map(w=>w.toSector),[0,1,2,3]);
}
let reachable=Array(SIZE).fill(true),minReach=SIZE;
for(let frame=18*60;frame<=Math.ceil(26.5*60);frame++){
 const t=frame/60;game.time=t;game.sampleWalls();
 const near=game.walls.filter(w=>w.r<110&&w.r+w.thickness>50)
  .map(w=>wallVisualPoly(w,game.fromSides,game.sides,game.morph));
 const free=playerPolygons.map(p=>near.every(poly=>!intersect(p,poly)));
 const next=new Array(SIZE).fill(false);
 for(let angle=0;angle<SIZE;angle++){
  if(!free[angle])continue;
  // Holding a directional key for one frame rotates by 7 degrees at most.
  // Intermediate angles must also be free, so we do not jump through walls.
  for(let delta=-7;delta<=7;delta++){
   const prior=(angle-delta+SIZE)%SIZE;
   if(!reachable[prior])continue;
   let sweptClear=true;
   for(let step=0;step<=Math.abs(delta);step++){
    const a=(prior+Math.sign(delta)*step+SIZE)%SIZE;
    if(!free[a]){sweptClear=false;break}
   }
   if(sweptClear){next[angle]=true;break}
  }
 }
 reachable=next;
 const count=reachable.filter(Boolean).length;
 assert(count>0,'first pentagon has no reachable escape at '+t.toFixed(3)+'s');
 minReach=Math.min(count,minReach);
}
// Stronger than "some heading exists": from the standard bottom-facing
// player position (270deg) at the exact completed pentagon frame, allow
// NO movement during the 0.2s stop, then up to 7deg/frame to dodge. The
// player must still be able to survive the entire first ring.
let afterMorph=new Uint8Array(SIZE);
afterMorph[270]=1;
for(let frame=Math.round(20.45*60);frame<=Math.ceil(21.5*60);frame++){
 const t=frame/60;game.time=t;game.sampleWalls();
 const near=game.walls.filter(w=>w.r<110&&w.r+w.thickness>50)
  .map(w=>wallVisualPoly(w,game.fromSides,game.sides,game.morph));
 const free=playerPolygons.map(p=>near.every(poly=>!intersect(p,poly)));
 const next=new Uint8Array(SIZE);
 const maxTurn=t<=20.65+1e-9?0:7;
 for(let angle=0;angle<SIZE;angle++){
  if(!free[angle])continue;
  for(let delta=-maxTurn;delta<=maxTurn;delta++){
   const prior=(angle-delta+SIZE)%SIZE;
   if(!afterMorph[prior])continue;
   let clear=true;
   for(let k=0;k<=Math.abs(delta);k++){
    if(!free[(prior+Math.sign(delta)*k+SIZE)%SIZE]){clear=false;break;}
   }
   if(clear){next[angle]=1;break}
  }
 }
 afterMorph=next;
 assert(afterMorph.some(Boolean),
  'player starting at 270deg cannot survive 0.2s pentagon stop and resumed walls at '+t.toFixed(3));
}
// Human-paced integration test, using the real Game.update collision,
// player lean and 240Hz substep logic, NOT only free static angles.
// Begin at the normal bottom-facing heading and do not touch the controls
// until 0.60 seconds AFTER the requested 0.2s wall freeze ends.
const human=new Game(0,data);
human.time=20.45;
human.angle=TAU*270/360;
human.sampleWalls();
assert(!human.dead,'player should be safe at the completed first morph');
const aim=TAU*330/360;
let sawFirstRing=false,previousRing=new Map();
for(let f=0;f<Math.ceil((22.55-20.45)*60);f++){
 const nextTime=20.45+(f+1)/60;
 const input=nextTime<=21.25?0:human.angle<aim-.03?1:0;
 human.update(1/60,input);
 assert(!human.dead,'real 0.6-second reaction path died at '+human.time.toFixed(3)+'s');
 const visible=human.walls.filter(w=>w.waveId>=144&&w.waveId<=147);
 for(const w of visible){
  sawFirstRing=true;
  const old=previousRing.get(w.id);
  if(old&&nextTime>20.65&&nextTime<21.5){
   assert(w.r<old.r,'first pentagon wall must descend after freezing');
  }
 }
 previousRing=new Map(visible.map(w=>[w.id,{r:w.r}]));
}
assert(sawFirstRing,'first pentagon was never rendered');
assert(human.angle>aim-.12,'player did not reach the safe sector');
console.log('PASS real Game.update player survives a 0.60s late reaction and reaches pentagon gap');
console.log('PASS first-pentagon reachable through 26.5s, minimum '+minReach+'/360 headings');
console.log('PASS 270deg player can stay still through the full 0.2s pause then escape at 7deg/frame');
