'use strict';
const assert=require('node:assert/strict');
const {Game,playerPoly,wallVisualPoly,intersect,PLAYER_SPEED}=require('./engine');
const source=require('./assets/timelines/waves-stage-0.json');
const game=new Game(0,source),N=360,TAU=Math.PI*2;
assert(Math.abs(PLAYER_SPEED*180/Math.PI/60-7)<1e-9);
const players=Array.from({length:N},(_,i)=>playerPoly(i*TAU/N));
let reachable=new Uint8Array(N).fill(1),minFree=360,minReach=360;
for(let frame=30*60;frame<=Math.ceil(34*60);frame++){
 const t=frame/60;
 game.time=t;game.sampleWalls();
 // No shape-changing, disappearing-by-time hacks in this patch.
 const changed=game.walls.filter(w=>w.waveId>=239&&w.waveId<=264);
 for(const w of changed)
  assert(![1,2].includes(w.sector),'32s corridor was blocked at '+t+' by '+w.id);
 const near=game.walls.filter(w=>w.r<115&&w.r+w.thickness>45)
  .map(w=>wallVisualPoly(w,game.fromSides,game.sides,game.morph));
 const free=players.map(p=>near.every(poly=>!intersect(p,poly)));
 const freeCount=free.filter(Boolean).length;
 assert(freeCount>=25,'32s ring has too small a static opening at '+t.toFixed(3));
 minFree=Math.min(minFree,freeCount);
 const next=new Uint8Array(N);
 for(let a=0;a<N;a++)if(free[a]){
  for(let delta=-7;delta<=7;delta++){
   const prior=(a-delta+N)%N;
   if(!reachable[prior])continue;
   let ok=true;
   for(let step=0;step<=Math.abs(delta);step++)
    if(!free[(prior+Math.sign(delta)*step+N)%N]){ok=false;break;}
   if(ok){next[a]=1;break;}
  }
 }
 reachable=next;
 const count=reachable.reduce((sum,v)=>sum+v,0);
 assert(count>0,'player cannot actually reach square gap at '+t.toFixed(3));
 minReach=Math.min(minReach,count);
}
console.log('PASS 32-second square gap reachable 30-34s at 60Hz, minimum static '+minFree+' /360, motion reachable '+minReach+'/360');
