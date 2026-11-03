'use strict';
// A visible hole is insufficient: at 35s the source-wave sectors provided
// free headings but NO 60Hz path at the real player turning speed.
const assert=require('node:assert/strict');
const {Game,playerPoly,wallVisualPoly,intersect,PLAYER_SPEED}=require('./engine');
const source=require('./assets/timelines/waves-stage-4.json');
const game=new Game(4,source),N=180,TAU=Math.PI*2;
const players=Array.from({length:N},(_,i)=>playerPoly(i*TAU/N));
assert(Math.abs(PLAYER_SPEED*180/Math.PI/60-7)<1e-9);
assert.deepEqual(source.shapeSchedule,[[0,6]],'stage five should remain six-sided');
let reachable=new Uint8Array(N).fill(1),minimum=180,minimumReach=180,frames=0;
for(let frame=29*60;frame<60*60;frame++){
 const t=frame/60;
 game.time=t;game.sampleWalls();
 const near=game.walls.filter(w=>w.r<115&&w.r+w.thickness>48)
  .map(w=>wallVisualPoly(w,game.fromSides,game.sides,game.morph));
 for(const wall of game.walls){
  if(wall.waveId>=300)
   assert(wall.sector!==2&&wall.sector!==3,
    'late stage-five wall blocked protected connected passage at '+t.toFixed(3));
 }
 const free=players.map(p=>near.every(poly=>!intersect(p,poly)));
 const count=free.filter(Boolean).length;
 assert(count>0,'all angles blocked at '+t.toFixed(3));
 minimum=Math.min(minimum,count);
 const next=new Uint8Array(N);
 for(let a=0;a<N;a++)if(free[a]){
  for(let d=-3;d<=3;d++){ // 2deg per sample: max 6deg/frame, stricter than actual 7deg
   const prev=(a-d+N)%N;
   if(!reachable[prev])continue;
   let swept=true;
   for(let k=0;k<=Math.abs(d);k++)
    if(!free[(prev+Math.sign(d)*k+N)%N]){swept=false;break}
   if(swept){next[a]=1;break}
  }
 }
 reachable=next;
 const amount=reachable.reduce((sum,v)=>sum+v,0);
 assert(amount>0,'stage-five player cannot reach any passage at '+t.toFixed(3)+'s');
 minimumReach=Math.min(minimumReach,amount);
 frames++;
}
assert.equal(frames,31*60);
console.log('PASS stage five 29-60s 60Hz actual collision/swept path, minimum '+minimum+'/'+N+' free headings and '+minimumReach+'/'+N+' reachable');
