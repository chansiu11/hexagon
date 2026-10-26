const assert=require('node:assert/strict'),fs=require('node:fs');
const {Game,wallPoly}=require('./engine');
const random=Math.random;Math.random=()=>{throw Error('No random patterns');};
for(let level=0;level<6;level++){
 const d=JSON.parse(fs.readFileSync(`${__dirname}/assets/timelines/rigid-stage-${level}.json`));
 for(const [a,b,c,e,x,y] of d.camera){
  assert(Math.abs(a*c+b*e)<1e-9,'camera must not shear');
  assert(Math.abs(a*a+b*b-c*c-e*e)<1e-9,'same horizontal and vertical scale');
  assert.equal(x,0);assert.equal(y,0);
 }
 for(const w of d.walls){
  assert(w.end>w.start&&w.speed>0&&w.thickness>=12);
  const p=wallPoly(w.r,w.sector,w.thickness,w.sides),step=Math.PI*2/w.sides;
  for(const [index,angle] of [[0,w.sector*step],[1,(w.sector+1)*step],[2,(w.sector+1)*step],[3,w.sector*step]])
   assert(Math.abs(p[index][0]*Math.sin(angle)-p[index][1]*Math.cos(angle))<1e-8,'wall ends must lie on background rays');
  const t=(w.start+w.end)/2,g=new Game(level,d);g.time=t;g.sampleWalls();const before=g.walls.find(v=>v.id===w.id);
  g.time=t+.0001;g.sampleWalls();const after=g.walls.find(v=>v.id===w.id);
  if(before&&after){assert(Math.abs(before.r-after.r-w.speed*.0001)<1e-7,'continuous constant wall speed');assert.equal(before.thickness,after.thickness);}
 }
 for(let angle=0;angle<24;angle++){
  const g=new Game(level,d);g.angle=angle*Math.PI/12;for(let i=0;i<60;i++)g.update(1/60);
  assert(!g.dead,'safe entrance '+level+' angle '+angle);
 }
 console.log('PASS',level,'shared rigid camera, aligned walls, fixed thickness, continuous speed, safe entrance');
}
Math.random=random;
