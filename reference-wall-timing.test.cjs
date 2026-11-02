'use strict';
// Compare moving wall trajectories against the checked-in frame-traced reference
// tracks. These are measurements of one gameplay recording, NOT original code.
const assert=require('node:assert/strict');
const {Game,wallTimelineTime,WALL_MORPH_HOLD_SECONDS:hold,WALL_MORPH_RECOVERY_SECONDS:recovery}=require('./engine');
function median(values){
 const sorted=[...values].sort((a,b)=>a-b);
 return sorted[Math.floor(sorted.length/2)];
}
assert.equal(hold,.28);
assert(recovery>0&&recovery<1);
for(let level=0;level<6;level++){
 const video=require('./assets/timelines/rigid-stage-'+level+'.json');
 const recorded=require('./assets/timelines/waves-stage-'+level+'.json');
 const game=new Game(level,recorded);
 assert.equal(video.source,recorded.source,'mixed video references');
 const original=new Map(video.walls.map(w=>[w.id,w]));
 let last=-1;
 for(let f=0;f<=60*240;f++){
  const t=f/240;
  const clock=wallTimelineTime(t,recorded.shapeSchedule);
  assert(clock+1e-8>=last,'wall moved backward during morph at '+t+' map '+(level+1));
  last=clock;
 }
 for(const [time,to] of recorded.shapeSchedule.slice(1)){
  const eps=1e-7;
  if(level===0&&time===20&&to===5){
   const morphEnd=time+.45,holdEnd=morphEnd+.20;
   assert(Math.abs(wallTimelineTime(time+.1,recorded.shapeSchedule)-(time+.1))<eps,
    'first pentagon moves while its sides transform');
   for(const t of [morphEnd,morphEnd+.05,morphEnd+.1,holdEnd])
    assert(Math.abs(wallTimelineTime(t,recorded.shapeSchedule)-morphEnd)<eps,
     'first pentagon must hold still after the completed morph');
   assert(Math.abs(wallTimelineTime(time+1.5,recorded.shapeSchedule)-(time+1.3))<eps,
    'first pentagon must descend at natural speed through 21.5s');
   assert(Math.abs(wallTimelineTime(time+2.5,recorded.shapeSchedule)-(time+2.5))<eps,
    'pentagon clock must recover only after the ring moves behind the core');
   for(let t=holdEnd+1/120;t<time+1.5;t+=1/120){
    const distance=wallTimelineTime(t,recorded.shapeSchedule)-
     wallTimelineTime(t-1/120,recorded.shapeSchedule);
    assert(Math.abs(distance-1/120)<eps,
     'first pentagon must not speed up immediately after 0.2s pause');
   }
  }else{
   assert(Math.abs(wallTimelineTime(time+.1,recorded.shapeSchedule)-time)<eps);
   assert(Math.abs(wallTimelineTime(time+hold,recorded.shapeSchedule)-time)<eps);
   assert(Math.abs(wallTimelineTime(time+hold+recovery,recorded.shapeSchedule)-(time+hold+recovery))<eps,
    'cumulative shape holds caused drift on stage '+(level+1));
  }
 }
 let abs=[],later=[];
 for(const wave of recorded.waves)for(const trackId of wave.sourceTrackIds){
  const track=original.get(trackId);
  assert(track,'missing video-traced source actor '+trackId);
  if(level===0&&track.start<18)continue; // protected old reference opening
  const t=track.start;
  if(t>=60)continue;
  const position=wave.r-wave.speed*(wallTimelineTime(t,recorded.shapeSchedule)-wave.start);
  const delta=Math.abs(position-track.r);
  if(!Number.isFinite(delta))throw Error('invalid source radius on stage '+(level+1));
  abs.push(delta);
  if(t>=30)later.push(delta);
 }
 assert(abs.length>200,'missing video reference samples on map '+(level+1));
 const sampleMedian=median(abs),lateMedian=median(later);
 // Video tracking is noisy (some short tracks have large outliers), but
 // accidentally accumulating morph holds causes 300-1000px median errors.
 assert(sampleMedian<55,'measured wall positions drifted: map '+(level+1)+' median '+sampleMedian);
 assert(lateMedian<55,'late wall position drift: map '+(level+1)+' median '+lateMedian);
 console.log('PASS stage '+(level+1)+' '+abs.length+' video tracks, median absolute position error '+
  sampleMedian.toFixed(1)+'px, 30-60s '+lateMedian.toFixed(1)+'px');
}
console.log('PASS non-accumulating morph holds, video timestamp alignment and monotonic trajectories');
