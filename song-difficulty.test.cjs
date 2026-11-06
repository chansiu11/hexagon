'use strict';
const assert=require('node:assert/strict'),R=require('./random-waves');
const sum=a=>a.reduce((s,v)=>s+v,0),mean=a=>sum(a)/a.length;
const groups=[[],[],[]];
for(let seed=1;seed<=100;seed++){
 const attempts=[0,1,2].map(index=>R.create(seed,index));
 for(let i=0;i<3;i++){
  const d=attempts[i];assert.equal(d.musicTrack.difficulty,i+1);
  groups[i].push({walls:d.waves.length,speed:mean(d.waves.map(w=>w.speed)),
   rotation:mean(d.spinEvents.map(v=>Math.abs(v[1]))),tilt:mean(d.tiltEvents.map(v=>Math.abs(v[1])))});
  assert(d.tiltEvents.every(v=>Math.abs(v[1])<=.38),'camera stays within its readable projection bounds');
  if(i){assert(d.waves.length>attempts[i-1].waves.length,'a faster song must produce more incoming gates for the same seed');}
 }
}
const averages=groups.map(g=>Object.fromEntries(['walls','speed','rotation','tilt'].map(k=>[k,mean(g.map(v=>v[k]))])));
for(let i=1;i<3;i++)for(const key of ['walls','speed','rotation','tilt']){
 assert(averages[i][key]>averages[i-1][key]*1.05,'successive song difficulty must measurably increase '+key);
}
console.log('PASS 100 matched seeds: song 1 < 2 < 3 in incoming gates, descent speed, rotation and tilt');
console.log(JSON.stringify(averages.map((v,i)=>({song:i+1,...v}))));
