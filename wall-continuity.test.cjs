const assert=require('node:assert/strict');
const {Game,intersect,playerPoly,wallPoly}=require('./engine');
const data=require('./assets/timelines/waves-stage-0.json');
assert.equal(data.continuity.version,1);
const extended=data.waves.filter(w=>w.continuityExtension>0);
assert.equal(extended.length,165);
for(const w of extended){
 assert(Math.abs(w.end-w.observedEnd-w.continuityExtension)<1e-8);
 assert(w.continuityExtension<=.75+1e-9);
 assert(w.end<=data.duration);
 assert(w.end<=w.start+(w.r+w.thickness-42)/w.speed+1e-8);
 const nextTransition=data.shapeSchedule.find(s=>s[0]>w.observedEnd+1e-6)?.[0]??data.duration;
 assert(w.end<=nextTransition+1e-8,'cannot continue a wall across the next geometry change');
}
for(let frame=30;frame<1800;frame++){
 const time=frame/30,game=new Game(0,data);
 game.time=time;game.sampleWalls();
 const close=game.walls.filter(w=>w.r<100&&w.r+w.thickness>50);
 let free=false;
 for(let i=0;i<144;i++){
  const player=playerPoly(i*Math.PI*2/144);
  if(!close.some(w=>intersect(player,wallPoly(w.r,w.sector,w.thickness,w.sides)))){free=true;break}
 }
 assert(free,'no escape route at '+time.toFixed(3)+' s');
}
console.log('PASS bounded wall continuity and sampled open escape corridors over 60 seconds');
