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
const checked=[18,19.9,20,20.1,20.28,20.45,20.75,20.85,20.883333,20.9,21];
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
for(let frame=18*60;frame<=Math.ceil(21.2*60);frame++){
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
console.log('PASS reachable first pentagon corridor across 18.000-21.200s at 60Hz, min '+minReach+' angles');
