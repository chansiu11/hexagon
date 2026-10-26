const assert=require('node:assert/strict');
const {Game,wallPoly,playerPoly,intersect}=require('./engine');

// A wall that passes the center must not flip its sector to the opposite side.
for(const radius of [-150,-80,-40,-20,-1,0,10]){
 for(let sector=0;sector<6;sector++){
  const p=wallPoly(radius,sector,30,6);
  const mid=(sector+.5)*Math.PI/3,ax=Math.cos(mid),ay=Math.sin(mid);
  for(const vertex of p){
   assert(vertex.every(Number.isFinite),'wall vertex must be finite');
   assert(vertex[0]*ax+vertex[1]*ay>=-1e-8,'negative radius cannot invert a wall');
  }
 }
}
assert(!intersect(playerPoly(0),wallPoly(-80,0,30,6)),
 'wall that passed the center cannot strike the player from behind');

const first=require('./assets/timelines/waves-stage-0.json');
assert.equal(first.waves.length,561);
assert(!first.waves.some(w=>w.glitchCorrection),'stage one recording is untouched');

for(let level=1;level<=5;level++){
 const d=require('./assets/timelines/waves-stage-'+level+'.json');
 const ids=new Set(new Game(level,d).timeline.waves.map(w=>w.id));
 const patched=d.waves.filter(w=>w.glitchCorrection&&ids.has(w.id));
 // Reported repairs include actors later excluded as tracking conflicts.
 assert(d.repair.glitchLifetimeExtensions>=patched.length);
 assert(d.repair.glitchLifetimeExtensions-patched.length<=d.repair.discardedSourceActors.length);
 assert(patched.length>=1,'stage '+(level+1)+' repairs at least one wall pop');
 for(const w of patched){
  const moment=w.glitchCorrection.baselineEnd,dt=1/240;
  const before=new Game(level,d),after=new Game(level,d);
  before.time=moment-dt;before.sampleWalls();
  after.time=moment+dt;after.sampleWalls();
  const p=before.walls.find(x=>x.waveId===w.id),q=after.walls.find(x=>x.waveId===w.id);
  assert(p&&q,'corrected wall must not disappear at its previous cutoff');
  assert(Math.abs((p.r-q.r)-w.speed*2*dt)<1e-7,'corrected wall must not teleport');
  assert.equal(p.thickness,q.thickness,'wall must not suddenly change thickness');
  assert.equal(p.sides,q.sides,'wall sector geometry must not suddenly change');
 }
 console.log('PASS stage '+(level+1)+' has '+patched.length+' continuous wall fixes near 17 seconds');
}
console.log('PASS negative-radius wall geometry and 17-second actor continuity');
