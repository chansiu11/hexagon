'use strict';
const assert=require('node:assert/strict');
const Video=require('./hard-video-parts');
const H=require('./hard-mode');
assert.equal(Video.parts.length,436,'expected 436 de-duplicated short source clips');
assert.deepEqual(Video.SOURCES,['VGkmTsx3HIw','5mDjFdetU28','aD187viql4Q']);
const perSource=Object.fromEntries(Video.SOURCES.map(s=>[s,0]));
for(const clip of Video.parts){
 assert(clip.id>=0&&clip.id<436);
 assert(clip.events.length>=1&&clip.events.length<=3);
 assert(Number.isFinite(clip.videoSeconds)&&clip.videoSeconds>=0);
 perSource[clip.source]++;
 for(const event of clip.events){
  assert([4,5,6].includes(event.sides),'observed polygon side count');
  assert(event.blocked.length>0&&event.blocked.length<event.sides);
  assert(event.blocked.every(k=>Number.isInteger(k)&&k>0&&k<event.sides),'valid relative wall mask with an opening');
  assert(event.width>=18&&event.width<=165);
  assert(event.dt>=0&&event.dt<=1.9);
 }
}
assert(Object.values(perSource).every(x=>x>=70),'parts from all three videos');
const used=new Set(),openings=new Set(),sourceHits=Object.fromEntries(Video.SOURCES.map(s=>[s,0]));
let minWaves=Infinity,maxWaves=0;
for(let seed=1;seed<=100;seed++){
 const d=H.create(seed,120),n=d.waves.length;
 minWaves=Math.min(minWaves,n);maxWaves=Math.max(maxWaves,n);
 assert(n>=125,'HARD should keep a brisk wall cadence compared to the old ~119 walls per 120 seconds');
 const groupsSeen=new Set();
 for(const group of d.groups){
  assert(Number.isInteger(group.partId)&&group.partId>=0&&group.partId<436);
  assert(!groupsSeen.has(group.partId),'no clip repeats within the opening run');
  groupsSeen.add(group.partId);used.add(group.partId);
  sourceHits[group.sourceVideo]++;
 }
 assert.equal(new Set(d.waves.map(w=>w.sourceVideo)).size,3,'one run should mix all three reference videos');
 for(const w of d.waves){
  assert(w.partId>=0&&w.partId<436);
  assert(w.sectors.length>0&&w.sectors.length<w.sides);
  assert(!w.sectors.includes(w.safeSector),'never close the protected escape');
  assert(Object.values(w.profiles).every(p=>p.thickness>0&&p.thickness<=w.thickness));
 }
 openings.add(d.waves.slice(0,12).map(w=>w.partId+':'+w.safeSector).join('/'));
}
assert.equal(used.size,436,'all candidate clips are selectable across different seeds');
assert.equal(openings.size,100,'each seed should vary the opening clip/sector order');
console.log('PASS video-derived 436-part bank, source provenance and replay variety',perSource);
console.log('PASS 100 seed samples, faster HARD cadence',minWaves,maxWaves,'waves/120 s; no closed passages');
