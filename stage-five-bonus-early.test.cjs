'use strict';
const assert=require('node:assert/strict');
const {Game,playerPoly,wallVisualPoly,intersect,PLAYER_SPEED}=require('./engine');
const source=require('./assets/timelines/waves-stage-4.json');
const game=new Game(4,source),id='stage5-bonus-early:4',N=360,TAU=Math.PI*2;
assert(Math.abs(PLAYER_SPEED*180/Math.PI/60-7)<1e-9);
let samples=0,minFree=360;
for(let f=0;f<=10*60;f++){
 const t=f/60;game.time=t;game.sampleWalls();
 const bonus=game.walls.filter(w=>w.id===id);
 assert(bonus.length<=1,'exactly one bonus wall instance');
 if(t<6.05||t>=6.05+(760+36-26)/320){
  assert.equal(bonus.length,0,'bonus outside its one short passage time');
  continue;
 }
 assert.equal(bonus.length,1,'bonus should persist through its complete path');
 const w=bonus[0];
 assert.equal(w.sector,4);
 assert.equal(w.sides,6);
 assert.equal(w.thickness,36);
 assert(Math.abs(w.r-(760-320*(t-6.05)))<1e-7,'bonus wall must move smoothly');
 const near=game.walls.filter(w=>w.r<110&&w.r+w.thickness>50)
  .map(w=>wallVisualPoly(w,game.fromSides,game.sides,game.morph));
 let free=0;
 for(let a=0;a<N;a++){
  const player=playerPoly(a*TAU/N);
  if(near.every(poly=>!intersect(player,poly)))free++;
 }
 minFree=Math.min(minFree,free);
 assert(free>0,'added early pattern sealed every escape at '+t.toFixed(3));
 samples++;
}
assert(samples>100,'bonus should appear for multiple seconds');
console.log('PASS exactly one easy stage-five bonus obstacle with continuous motion and an open dodge at every sampled frame ('+samples+' frames, min '+minFree+' headings)');
