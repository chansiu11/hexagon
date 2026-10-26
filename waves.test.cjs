const assert=require('node:assert/strict');
const {Game,wallVisualPoly,playerPoly,intersect}=require('./engine');
const data=require('./assets/timelines/waves-stage-0.json');
assert.equal(data.mode,'batched-wall-waves');
assert(data.waves.some(w=>w.sectors.length>1));
assert.equal(new Set(data.waves.map(w=>w.speed)).size,1,'all stage-one waves share the same speed');
assert.equal(data.waves[0].speed,data.sharedSpeed);
assert.equal(data.offscreenBirth,true);
const minZoom=Math.min(1,...data.camera.map(m=>Math.hypot(m[0],m[1])));
for(const w of data.waves){
 const birthZoom=w.start===0?Math.min(1,Math.hypot(data.camera[0][0],data.camera[0][1])):minZoom;
 assert(w.r*Math.cos(Math.PI/w.sides)*birthZoom>Math.hypot(480,300),'new wall must be wholly outside viewport');
 assert.equal(w.sectors.length,new Set(w.sectors).size);
 const g=new Game(0,data);
 const repaired=g.timeline.waves.find(v=>v.id===w.id);
 if(!repaired)continue; // rejected contradictory recording, original asset preserved
 for(const time of [w.start-.000001,w.start,(w.start+w.end)/2,repaired.end-.000001,repaired.end]){
  g.time=time;g.sampleWalls();const pieces=g.walls.filter(p=>p.waveId===w.id);
  assert.equal(pieces.length,time>=w.start&&time<repaired.end?w.sectors.length:0,'atomic spawn/despawn');
  for(const piece of pieces){assert.equal(piece.r,pieces[0].r);assert.equal(piece.thickness,pieces[0].thickness);}
 }
}
const blocked=[];
for(let t=1;t<60;t+=.1){
 const g=new Game(0,data);g.time=t;g.sampleWalls();
 const near=g.walls.filter(w=>w.r<110&&w.r+w.thickness>50);
 let free=false;
 for(let a=0;a<144;a++)if(!near.some(w=>intersect(playerPoly(a*Math.PI/72),wallVisualPoly(w,g.fromSides,g.sides,g.morph)))){free=true;break;}
 if(!free)blocked.push(t);
}
assert.deepEqual(blocked,[],'grouping must not create completely closed sampled frames');
const g=new Game(0,data);for(let i=0;i<60;i++)g.update(1/60);assert(!g.dead);
console.log('PASS atomic wave lifecycle, identical member geometry, safe entrance, sampled open passage audit');
