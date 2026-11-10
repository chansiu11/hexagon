'use strict';
const assert=require('node:assert/strict');
const E=require('./engine');
const V=require('./hexagonest-video');
const X=require('./hexagonest-mode');
const CAMERA=require('./hexagonest-camera');
// The default actual gameplay now replays the 316-second recording in
// original chronological order, instead of shuffling its opening at random.
assert.equal(CAMERA.ZOOM_SAMPLES,790);
assert.equal(CAMERA.ROTATION_SAMPLES,291);
assert.equal(CAMERA.VIDEO_WIDTH/CAMERA.VIDEO_HEIGHT,16/10);
assert(CAMERA.at(3).zoom>1.03&&CAMERA.at(3).zoom<1.14);
assert(CAMERA.at(125).zoom>.91&&CAMERA.at(125).zoom<.99);
assert.equal(CAMERA.at(125).rotation,0,'the monochrome part has a fixed source orientation');
for(const seed of [1,2,19,42]){
 const d=X.createVideoTimeline(seed,320);
 assert.equal(d.sourceAligned,true);
 assert.equal(d.sourceWaveCount,360);
 assert.equal(d.sourceVideoOffset,.6);
 assert(d.videoEnd>315&&d.videoEnd<316);
 assert.equal(d.waves.length>360,true);
 assert.equal(d.partOrder[0].partId,0);
 assert.equal(d.partOrder[30].partId,30);
 for(let i=0;i<360;i++){
  const w=d.waves[i],e=V.events[i];
  assert.equal(w.sourceVideoSeconds,e.videoSeconds);
  assert.equal(w.sourceEventIndex,i);
  assert.equal(w.pattern,e.mask,'original source masks must not be rotated');
  assert.equal(w.partRotation,0);
  assert.equal(w.sourceDelay,0,'source footage must not be retimed');
  assert(Math.abs(w.impact-(e.videoSeconds-CAMERA.OFFSET))<1e-8);
  assert(Math.abs(w.thickness-Math.max(22,e.width*X.WALL_WIDTH_SCALE))<1e-8);
 }
 assert(d.waves.slice(360).every(w=>w.impact>d.videoEnd),
  'randomized whole parts begin only after the recorded movie');
}
assert.notDeepEqual(X.create(1,125).waves,X.create(2,125).waves,
 'the optional random parts workflow remains available');
// Normal gameplay now shuffles the original VIDEO.parts from the start.
// The chronological 316-second replay remains a separate diagnostic mode.
for(const seed of [1,2,3,17,42]){
 const d=X.createRandomTimeline(seed,320),raw=X.create(seed,320);
 assert(d.partShuffle&&d.sourceAligned,'shuffle and calibrated camera enabled');
 assert.equal(d.sourceVideoOffset,CAMERA.OFFSET);
 assert.deepEqual(d.waves,raw.waves,'original source wall geometry unchanged');
 assert.deepEqual(d.partOrder,raw.partOrder,'only whole parts can be shuffled');
 assert(d.partOrder.length>=31);
 for(const partInfo of d.partOrder){
  const src=V.parts[partInfo.partId];
  assert.equal(partInfo.observedEvents,src.events.length);
  assert(partInfo.rotation>=0&&partInfo.rotation<6);
 }
}
const shuffledA=X.createRandomTimeline(100,320),shuffledB=X.createRandomTimeline(101,320);
assert.notDeepEqual(shuffledA.partOrder.map(p=>p.partId),shuffledB.partOrder.map(p=>p.partId));
assert.deepEqual(X.createRandomTimeline(100,320),shuffledA,'same seed same parts');
const newAttempt=new X.HexagonestGame();
assert(newAttempt.timeline.partShuffle&&newAttempt.sourceAligned,
 'default Hexagonest constructor must use shuffled full parts');
assert.equal(V.events.length,360);
assert.equal(V.parts.length,31,'thick slabs extend continuous dodge chains across brief pauses');
assert.equal(V.clips.length,31,'no overlapping sliding source fragments');
assert.equal(X.VIDEO_PART_COUNT,31);
assert.equal(X.PART_REPLAY_VERSION,'seamless-dodge-v10-random-default');
assert.equal(V.DODGE_BREAK_SECONDS,1.75);
assert.deepEqual([0,1,2].map(e=>V.parts.filter(p=>p.era===e).length),[6,4,21]);
assert.equal(X.SOURCE_VIEW.width/X.SOURCE_VIEW.height,960/600,
 'video 768x480 and game 960x600 use identical 16:10 framing');
assert(Math.abs(2*50*X.sceneScale()*768/960-86.4)<1e-8,
 '50 unit reference core appears 86.4px across, within the video 80-90px');
assert(Math.abs(35*X.WALL_WIDTH_SCALE*X.sceneScale()*768/960-27.8208)<.01,
 '35px nominal trace draws as a ~28px band in the source MP4');
assert.equal(V.THICK_DODGE_BREAK_SECONDS,2.3);
assert.equal(V.THICK_WALL_WIDTH,100);
assert.equal(V.parts.reduce((sum,p)=>sum+p.events.length,0),360,
 'every observed wall must belong to exactly one full replay part');
assert(V.parts.some(p=>p.events.length>=30),'long uninterrupted dodge chains remain intact');
let cursor=0;
for(const part of V.parts){
 assert.equal(part.firstEventIndex,cursor,'parts do not overlap or skip events');
 assert.equal(part.lastEventIndex,cursor+part.events.length-1);
 assert.deepEqual(part.entryOpenings,Array.from({length:6},(_,i)=>i)
  .filter(i=>!(part.events[0].mask&(1<<i))));
 assert.deepEqual(part.exitOpenings,Array.from({length:6},(_,i)=>i)
  .filter(i=>!(part.events.at(-1).mask&(1<<i))));
 assert.deepEqual(part.events,V.events.slice(cursor,cursor+part.events.length));
 for(let j=1;j<part.events.length;j++){
  const gap=part.events[j].videoSeconds-part.events[j-1].videoSeconds;
  assert(gap<V.breakAfter(part.events[j-1],part.events[j])+1e-8,'a recovery pause must split a part');
 }
 if(part.id<V.parts.length-1){
  const next=V.parts[part.id+1],gap=next.sourceStart-part.sourceEnd;
  assert(gap>=V.breakAfter(part.events.at(-1),next.events[0])-1e-8||next.era!==part.era,
   'part boundary only follows recovery or change of difficulty era');
  assert(Math.abs(part.gapAfter-gap)<1e-8,'preserve observed pause between source parts');
 }
 cursor+=part.events.length;
}
assert.equal(X.PATTERN_TRANSITION_VERSION,'video-family-v4');
assert(V.events.every(e=>e.mask>0&&e.mask<63&&e.width>=22&&e.videoSeconds<317));
assert.equal(X.palette(30)[1],92,'bright early palette');
assert.equal(X.palette(61)[1],0,'desaturation after the first recorded stage transition');
assert.equal(X.palette(59.19)[1],92);
assert.equal(X.palette(59.2)[1],0,'grayscale starts at the decoded recording frame');
assert.deepEqual(X.palette(116.2),[0,0,[0,0,100]],'monochrome starts at video 116.2s');
assert.equal(X.palette(116.19)[2][0],18);
assert.equal(X.referenceSpinRate(2,-1),-2.2);
assert.equal(X.referenceSpinRate(7,1),3.25);
assert.equal(X.referenceSpinRate(68,1),4.3);
assert.equal(X.referenceSpinRate(117,1),0);
assert.deepEqual(X.palette(125),[0,0,[0,0,100]],'monochrome later footage');
// The native gameplay frame is 960x600 and the supplied MP4 is 768x480.
// Compare measured on-screen speed after BOTH the game scene scale and
// the 768/960 viewport factor, not one scale without the other.
for(const [t,observed] of [[12,307],[75,345],[165,337],[280,337]]){
 assert(Math.abs(X.speedAt(t)*X.sceneScale()*768/960-observed)<3,
  'video-calibrated screen flow '+t+'s');
}
const hues=[[1,106],[3,260],[5,18],[7,194],[9,310],[11,58],
 [13,106],[15,260],[17,18],[19,194],[21,310],[23,58],
 [24,106],[26,260],[28,18],[30,194],[32,310],[34,58],
 [36,106],[38,260],[40,18],[42,194],[44,310],[46,58],
 [47,106],[49,260],[51,18],[53,194],[55,310],[57,58],[59,106]];
for(const [t,hue] of hues)assert.equal(X.palette(t)[0],hue,'video-derived hue at '+t+'s');
assert.equal(X.COLOR_EVENTS.length,31,'all measured opening color changes recorded');

assert.notEqual(X.speedAt(40),X.speedAt(70));
assert.equal(X.rotateMask(0b000011,2,false),0b001100);
const eraTotal=[0,0,0];let denseIntervals=0,quietIntervals=0;
let fullPartReplays=0,sourceWallChecks=0;
for(let seed=1;seed<=100;seed++){
 const d=X.create(seed,320),parts=new Set(d.waves.map(w=>w.partId));
 assert.equal(d.mode,'hexagonest-video');
 assert.deepEqual(d.shapeSchedule,[[0,6]],'Hexagonest footage retains six sides');
 // There are 360 estimated source-video ring crossings in ~305 seconds.
 // Avoid the former 50%-denser, artificial .12-.30s joins.
 assert(d.waves.length>320&&d.waves.length<470,'video-like number of waves');
 for(const w of d.waves)eraTotal[w.impact<60?0:w.impact<120?1:2]++;
 for(let i=1;i<d.waves.length;i++){
  const gap=d.waves[i].impact-d.waves[i-1].impact;
  if(gap<.52)denseIntervals++;
  if(gap>1.6)quietIntervals++;
  assert(gap>0,'strictly chronological pattern arrivals');
 }
 assert(parts.size>=20,'random replay should use many distinct full video parts');
 assert.equal(d.groups.length,d.partOrder.length+1,
   'each emitted group must represent exactly one entire dodge part');
 const byGroup=new Map();
 for(const w of d.waves){
  if(!byGroup.has(w.group))byGroup.set(w.group,[]);
  byGroup.get(w.group).push(w);
  const src=V.events[w.sourceEventIndex],part=V.parts[w.partId];
  assert(src&&part,'every wall must trace back to the source MP4 event');
  assert.equal(w.sourceVideoSeconds,src.videoSeconds);
  assert.equal(w.sourceMask,src.mask);
  assert.equal(w.sourceWidth,src.width);
  assert.equal(w.sourceOffset,src.videoSeconds-part.sourceStart);
  assert.equal(w.pattern,X.rotateMask(src.mask,w.partRotation,false),
   'preserve ALL original source six-sector masks by a single part rotation');
  assert(Math.abs(w.thickness-Math.max(22,src.width*X.WALL_WIDTH_SCALE))<1e-7,
   'preserve source wall thickness conversion');
  assert(w.sourceDelay>=0&&w.sourceDelay<3,
   'only delay a source crossing when needed for safe traversal');
  sourceWallChecks++;
 }
 for(let i=0;i<d.partOrder.length;i++){
  const replay=d.partOrder[i],part=V.parts[replay.partId],walls=byGroup.get(i);
  assert(replay.entryOpenings.length>0&&replay.exitOpenings.length>0);
  assert(replay.exitOpenings.includes(replay.exitSector),
   'a full source part must end in its declared escape corridor');
  assert.equal(replay.played,walls.length);
  assert(replay.joinGap>0&&replay.joinGap<=2.6,
   'random part stitching must keep natural pauses without long dead air');
  if(i+1<d.partOrder.length){
   const next=byGroup.get(i+1)[0],last=walls.at(-1);
   const distance=Math.min((next.safeSector-last.safeSector+6)%6,
    (last.safeSector-next.safeSector+6)%6);
   assert(distance<=1,'next complete part must connect to the previous escape corridor');
   assert(next.impact-last.impact+1e-8>=replay.joinGap,
    'joining may add safety clearance but cannot overlap source chains');
  }
  assert.equal(walls[0].sourceEventIndex,part.firstEventIndex);
  for(let j=0;j<walls.length;j++){
   assert.equal(walls[j].partId,replay.partId);
   assert.equal(walls[j].partRotation,replay.rotation);
   assert.equal(walls[j].sourceEventIndex,part.firstEventIndex+j,
    'never reorder or drop walls inside a dodge part');
  }
  if(replay.played===part.events.length)fullPartReplays++;
 }
 const late=d.partOrder.filter(p=>p.era===2).slice(0,21);
 if(late.length===21)assert.equal(new Set(late.map(p=>p.partId)).size,21,
   'shuffle bag plays all 21 late-era parts before repeating any one');
 assert(d.waves.at(-1).impact>315,'extend beyond the old 60s wall track');
 assert.deepEqual(d.spinEvents.map(e=>e.at),X.SPIN_REVERSALS,
   'rotation cuts follow measured source frames, not randomized intervals');
 assert.equal(d.spinEvents[0].rate,-1,'original opening rotates counterclockwise');
 assert.equal(d.spinEvents.at(-1).rate,0,'post-116.2 arena must stop rotating');
 for(let i=1;i<d.spinEvents.length-1;i++)
  assert.equal(d.spinEvents[i].rate,-d.spinEvents[i-1].rate,
   'the measured sequence preserves alternating turns');
 assert(d.groups.length!==d.spinEvents.length,
   'whole dodge parts and camera turns have independent event timelines');
 for(const w of d.waves){
  assert(w.sectors.length>0&&w.sectors.length<6);
  assert(!w.sectors.includes(w.safeSector),'every wave has a real passable lane');
  assert(w.sectors.every(s=>s>=0&&s<6));
  assert(w.start<w.impact&&w.end>w.impact);
  assert(Number.isFinite(w.speed)&&w.speed>0);
 }
}
assert.deepEqual(X.create(42,125),X.create(42,125),'seed determinism');
assert.notDeepEqual(X.create(1,125).waves,X.create(2,125).waves,'replay variety');
// Reconstructed source video crossing statistics are a sampling benchmark,
// not a claim to know every unobserved original wall. Check multi-seed means.
const observed=[V.events.filter(e=>e.videoSeconds<60).length,
 V.events.filter(e=>e.videoSeconds>=60&&e.videoSeconds<120).length,
 V.events.filter(e=>e.videoSeconds>=120).length];
for(let i=0;i<3;i++){
 const mean=eraTotal[i]/100;
 assert(Math.abs(mean-observed[i])/observed[i]<.25,
  'seed-averaged video-era wall rhythm should match '+i);
}
assert(denseIntervals>10000,'retain the observed quick wall clusters');
assert(quietIntervals>1000,'retain rare longer pauses between source wall crossings');
assert(fullPartReplays>2000,'full source-video dodge chains must replay intact');
assert(sourceWallChecks>32000,'verify every observed event identity across 100 seeded replays');
console.log('PASS 100 Hexagonest seeds: 31 whole source dodge parts, seeded compatible shuffle bags, mask/width/order/offset integrity');
console.log('PASS source-derived wall rhythm, long continuous dodge chains, color/speed eras and playable masks');

// The video is still from the black/white transition onwards.
{
 const d=X.create(7,180);
 const g=new X.HexagonestGame({...d,waves:[]});
 g.time=116.25;g.rotation=2.3;g.rotationSpeed=4.3;g.tilt=.3;g.zoom=1.2;
 g.update(1/60,0);
 assert.equal(g.rotation,0,'the mono arena must stop and align');
 assert.equal(g.rotationSpeed,0,'the mono arena must not continue spinning');
 assert.equal(g.tilt,0,'source video has no post-transition wobble');
 assert.equal(g.zoom,1,'source video uses a level mono view');
}
const delta=(a,b)=>E.wrap(b-a+Math.PI)-Math.PI;
let replays=0;
for(let seed=1;seed<=8;seed++){
 const duration=seed<=2?318:125;
 const d=X.create(seed,duration),clear=d.waves.map(w=>w.impact+(66+w.thickness-59)/w.speed);
 for(const mode of [1,2,3]){
  const g=new X.HexagonestGame(d);g.setControlMode(mode);
  assert(g.hexagonestMode&&!g.hardMode&&g.level===2);
  assert(Math.abs(g.playerSpeed-9*Math.PI/180*60*25/24)<1e-8);
  let index=0,next=0;
  for(let frame=0;frame<=Math.floor((duration===318?316:120)*60);frame++){
   while(index<d.waves.length-1&&g.time>clear[index]+.02)index++;
   const w=d.waves[index],target=g.sectorAngle(w.safeSector,6);
   if(mode===1)g.update(1/60,Math.max(-1,Math.min(1,delta(g.angle,target)/(g.playerSpeed/60))));
   else{
    if(g.time>=next){
     const lane=Array.from({length:6},(_,i)=>i).sort((a,b)=>Math.abs(delta(g.sectorAngle(a),target))-Math.abs(delta(g.sectorAngle(b),target)))[0];
     if(mode===3)g.selectSector(lane);
     else{
      const current=g.currentSector(),a=(lane-current+6)%6,b=(current-lane+6)%6;
      if(a||b)g.stepSector(a<=b?1:-1);
     }
     next=g.time+.18;
    }
    g.update(1/60);
   }
   assert(!g.dead,'seed '+seed+' mode '+mode+' time '+g.time.toFixed(3)+' at wave '+index);
  }
  assert(g.time>=(duration===318?315:119.9),'run must survive intended timeline');
  replays++;
 }
}
console.log('PASS '+replays+' collision-aware Hexagonest mode 1/2/3 replays, including six full 316-second runs');
