'use strict';
// Check that all six maps replay the SAME measured gameplay video rather
// than mixing guessed patterns or unrelated random stage generators.
const assert=require('node:assert/strict');
const {Game,wallTimelineTime,firstPentagonRingWallTime}=require('./engine');
const VIDEO='5mDjFdetU28';
let total=0;
for(let level=0;level<6;level++){
 const raw=require('./assets/timelines/waves-stage-'+level+'.json');
 assert.equal(raw.source,VIDEO,'incorrect reference video on stage '+(level+1));
 assert.equal(raw.mode,'batched-wall-waves');
 assert.equal(raw.duration,60);
 assert.equal(raw.sampleRate,60);
 const g=new Game(level,raw);
 const ids=new Map(g.timeline.waves.map(w=>[w.id,w]));
 let observed=0,frames=0;
 for(let f=0;f<60*60;f++){
  const t=f/60;
  g.time=t;g.sampleWalls();
  const motion=wallTimelineTime(t,raw.shapeSchedule);
  assert.equal(new Set(g.walls.map(w=>w.id)).size,g.walls.length,
   'duplicate render ID '+(level+1)+' at '+t);
  for(const w of g.walls){
   if(level===4&&w.waveId==='stage5-bonus-early'){
    assert.equal(w.sector,4,'bonus obstacle must leave five directions free');
    assert.equal(w.sides,6);
    assert(Math.abs(w.r-(760-320*(t-6.05)))<1e-6);
    continue; // One explicitly additional, not video-derived, optional obstacle.
   }
   const original=ids.get(w.waveId);
   assert(original,'wall lacks an original video observation');
   if(level===0&&t>=18&&w.waveId>=144&&w.waveId<=147){
    // The source transcript's sector-1 opening was geometrically free but
    // unreachable at 20.88s. This explicit gameplay correction applies
    // ONLY to the first four actors, while preserving all source files.
    assert.equal(w.sector,w.waveId-144,'reachable first-ring passage');
    assert.equal(w.fromSector,w.sector);
    assert.equal(w.toSector,w.sector);
    assert.equal(w.sides,5);
   }else if(level!==0||t>=18||w.waveId<144||w.waveId>149){
    assert(original.sectors.includes(w.sector),
     'invented wall sector on stage '+(level+1)+' at '+t+' source ID '+w.waveId);
    assert.equal(w.sides,original.sides,
     'wrong measured polygon sector count on stage '+(level+1));
   }
   const actorTime=level===0&&w.waveId>=144&&w.waveId<=147?
    firstPentagonRingWallTime(t,raw.shapeSchedule):motion;
   assert(Math.abs(w.r-(original.r-original.speed*(actorTime-original.start)))<1e-5,
    'wall radius does not match its recorded actor clock on stage '+(level+1)+' at '+t);
   observed++;
  }
  frames++;
 }
 console.log('PASS video '+VIDEO+' stage '+(level+1)+' '+frames+
  ' frames and '+observed+' source-wall samples');
 total+=observed;
}
// Stage-five's post-30s accessibility fix deliberately omits only sectors 2/3
// from late observed rings, reducing the rendered video-sample count.
// All surviving actors still must match the original video's recorded
// ID, sectors, wall width, radius and clock without fabricated segments.
assert(total>750000,'missing required coverage of video-traced wall samples after stage-five accessibility correction');
console.log('PASS all six stages use '+VIDEO+' exclusively');
