'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const HexEngine=require('../engine.js');

function register(index){
 HexEngine.registerMap(index,{walls:[],shapes:[{at:0,sides:6}],
  sourceStatus:index===2?'filmed-chronological-3-1-audited-not-randomized':'older-stage'});
}
function footage(){
 const wall={id:'observed-first-wall',points:[[170,0],[188,0],[188,15],[170,15]],holes:[]};
 const before={id:'cross-60',points:[[110,-20],[125,-20],[125,20],[110,20]],holes:[]};
 // Different positions are intentional: wall identity stays stable across
 // seek and 60s boundary; this is not real measured film geometry.
 const frames=Array.from({length:1241},(_,i)=>({
  angle:0,sides:6,zoom:1,
  walls:i<12?[wall]:i>=1199&&i<=1201?[before]:[]
 }));
 return {id:'1595',fps:20,gameRate:1,gameStartOffset:0,frames};
}
test('HEXAGONEST source replays first observed wall without 0.55s blank',()=>{
 register(2);
 const g=new HexEngine.ArenaGame(2);
 g.attachReplay(footage());
 assert.equal(g.time,0);
 assert.deepEqual(g.walls.map(w=>w.id),['observed-first-wall']);
 g.seekReplay(.5);
 assert.deepEqual(g.walls.map(w=>w.id),['observed-first-wall']);
});
test('stage 1 and 2 retain their existing intro wall suppression',()=>{
 for(const i of [0,1]){
  register(i);
  const g=new HexEngine.ArenaGame(i);
  g.attachReplay(footage());
  assert.equal(g.walls.length,0);
  g.seekReplay(.5);
  assert.equal(g.walls.length,0);
 }
});
test('60s chronological boundary is not a despawn or duplicate',()=>{
 register(2);
 const g=new HexEngine.ArenaGame(2);
 g.attachReplay(footage());
 for(const time of [59.95,60,60.05]){
  assert.equal(g.seekReplay(time),true);
  assert.equal(g.walls.length,1);
  assert.equal(g.walls[0].id,'cross-60');
 }
 assert.equal(g.timelineEnded,false);
});
test('invalid seventh stage still unavailable',()=>{
 assert.throws(()=>new HexEngine.ArenaGame(6),/Map 7 has been removed/);
});
