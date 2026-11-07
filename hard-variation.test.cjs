'use strict';
const assert=require('node:assert/strict'),H=require('./hard-mode');
for(const seed of [1,2,3,19,61,99]){
 const d=H.create(seed,120),families=new Set(d.waves.map(w=>w.pattern));assert.equal(families.size,12);
 assert(d.waves.some(w=>w.impact<12&&w.thickness>=100),'a thick corridor must appear early, not only after a long survival');
 assert(d.waves.some(w=>w.thickness>=160));assert(d.waves.some(w=>w.thickness<=22));
 assert(d.waves.some(w=>Object.values(w.profiles).some(p=>p.offset!==0)),'offset stair profiles must actually spawn');
 assert(d.waves.some(w=>new Set(Object.values(w.profiles).map(p=>p.thickness)).size>1),'walls need distinct tooth/long-short profiles');
 for(let i=1;i<d.groups.length;i++)assert.notEqual(d.groups[i].pattern,d.groups[i-1].pattern);
 for(const w of d.waves){assert(!w.sectors.includes(w.safeSector));for(const p of Object.values(w.profiles)){assert(p.thickness<=w.thickness);assert(p.offset>=-w.innerExtra&&p.offset<=w.outerExtra)}}
}
console.log('PASS 12 non-repeating HARD families, early 100px+ tunnels, thin rakes, stepped and varying-depth walls with a protected full-cell opening');

const d=H.create(19,120),wave=d.waves.find(w=>w.pattern===10),game=new H.HardGame(d);game.time=wave.impact-.25;game.sampleWalls();
for(const w of game.walls.filter(w=>w.waveId===wave.id)){if(w.collapsed)continue;const a=w.renderPoly[0],b=w.renderPoly[3],unit=Math.hypot(...a)/w.r;assert(Math.abs(Math.hypot(b[0]-a[0],b[1]-a[1])/unit-w.thickness)<1e-7,'both radial faces must move by the profile offset while retaining the actual thickness')}
console.log('PASS staggered actor profiles retain their real radial thickness');


// Diverse opening order and recognizable isolated-cell motifs are HARD-only.
// These are statistical design guards, not assertions about the source game's RNG.
const openings=new Set(),familyCounts=new Map();
for(let seed=1;seed<=100;seed++){
 const data=H.create(seed,135);
 openings.add(data.waves.slice(0,10).map(w=>w.pattern+':'+w.safeSector).join('|'));
 assert.equal(new Set(data.waves.map(w=>w.pattern)).size,12,'all motif families should be reachable');
 assert(data.waves.some(w=>w.sectors.length===1),'one-cell wall should actually be visible');
 assert(data.waves.some(w=>w.thickness<=22),'thin repeated bars should actually be visible');
 assert(data.waves.some(w=>w.thickness>=100),'thick corridor should actually be visible');
 for(const w of data.waves){
  assert(w.sectors.length>0&&w.sectors.length<w.sides,'rings must have a passage and a wall');
  assert(!w.sectors.includes(w.safeSector),'safe track must remain open');
 }
 for(let i=1;i<data.groups.length;i++){
  assert.notEqual(data.groups[i].pattern,data.groups[i-1].pattern,'no immediate same-family repeats');
  if(i>=2)assert.notEqual(data.groups[i].pattern,data.groups[i-2].pattern,'avoid skip-one repeats');
 }
 for(const group of data.groups)familyCounts.set(group.pattern,(familyCounts.get(group.pattern)||0)+1);
}
assert(openings.size>=98,'random seeds should produce distinct opening sequences');
assert(familyCounts.get(0)>familyCounts.get(2),'small bar family should occur more often than rare C-pattern');
assert(familyCounts.get(6)>familyCounts.get(8),'thin rakes should appear more often than teeth');
console.log('PASS 100-seed HARD weighted pattern diversity, protected openings, single-cell walls and two-back anti-repeat');
