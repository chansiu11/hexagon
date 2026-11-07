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
