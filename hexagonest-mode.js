/* Dedicated video-informed Hexagonest reconstruction; level index 2 only.
 * Original video: UrPXBSh4mqU, 316.0s, 768x480 / 30fps.
 * Video observations are approximate; source game logic is not available.
 */
(function(root){'use strict';
const E=typeof module!=='undefined'?require('./engine'):root.HexEngine;
const HARD=typeof module!=='undefined'?require('./hard-mode'):root.HexHardMode;
const VIDEO=typeof module!=='undefined'?require('./hexagonest-video'):root.HexagonestVideo;
const CAMERA=typeof module!=='undefined'?require('./hexagonest-camera'):root.HexHexagonestCamera;
const TAU=Math.PI*2, CLOCK=25/24, SIXTH=TAU/6;
// Measured from 9,479 decoded frames (768×480, 30fps) of the supplied
// 316.0236-second recording. Color disappears near 59.2s; the arena
// becomes still and black/white near 116.2s.
const GRAYSCALE_AT=59.2, STILL_MONO_AT=116.2;
const SPIN_REVERSALS=[0,5.4,10.5,15.5,21.8,27.1,32.9,38.9,43.8,48.9,
 53.8,63.6,69.1,73.7,76.6,81.9,87.3,91.5,97.1,100.1,104.5,111.3,
 STILL_MONO_AT];
function referenceSpinRate(t,dir){
 return t>=STILL_MONO_AT?0:dir*(t<5.4?2.2:t<GRAYSCALE_AT?3.25:4.3);
}
function rng(seed){let s=seed>>>0;return ()=>{s=(s+0x6d2b79f5)>>>0;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296}}
function newSeed(){const a=new Uint32Array(1);if(root.crypto?.getRandomValues){root.crypto.getRandomValues(a);return a[0]}return (Date.now()^Math.random()*0xffffffff)>>>0}
const mod6=n=>(n%6+6)%6;
const distance=(a,b)=>Math.min(mod6(a-b),mod6(b-a));
function rotateMask(mask,shift,flip){
 let result=0;for(let k=0;k<6;k++)if(mask&(1<<k))result|=1<<mod6((flip?-k:k)+shift);
 return result;
}
// Video viewport 768x480 (16:10), game space 960x600 (also 16:10).
// Measured central hexagon ~84-90 px across and thin mono wall ~28 px.
// The old 0.67 shrink made BOTH the center and walls far too small.
// With 1.08 scene scale the 50-unit central hex appears ~86px wide,
// and the 66-unit player orbit is ~57px, as seen in the provided MP4.
// Source wall-flow medians ~307/345/337 pixels per real second.
const SOURCE_VIEW={width:768,height:480,coreDiameter:[80,90],thinWallWidth:28};
const SCENE_SCALE=1.08,WALL_WIDTH_SCALE=.92;
function speedAt(t){return t<60?355:t<120?400:390}
function sceneScale(){return SCENE_SCALE}
// Source video vivid-wall hue measurements (HSV, 0.25s samples).
// The recording cycles six hues at ~1.9s intervals, not 2.6s; the
// transitions drift, so keep measured entry times.
const COLOR_EVENTS=[
 [0,106],[2.75,260],[4.75,18],[6.50,194],[8.50,310],[10.50,58],
 [12.25,106],[14.25,260],[16.25,18],[18,194],[20.25,310],[22,58],
 [23.75,106],[25.75,260],[27.75,18],[29.50,194],[31.75,310],[33.50,58],
 [35.25,106],[37.25,260],[39.25,18],[41,194],[43.25,310],[45,58],
 [46.75,106],[48.75,260],[50.75,18],[52.75,194],[54.75,310],[56.50,58],
 [58.25,106]
];
function palette(time){
 if(time>=STILL_MONO_AT)return [0,0,[0,0,100]];
 if(time>=GRAYSCALE_AT)return [0,0,[18,39,96]];
 let index=0;
 for(let i=1;i<COLOR_EVENTS.length&&COLOR_EVENTS[i][0]<=time;i++)index=i;
 return [COLOR_EVENTS[index][1],92,[10,22,73]];
}
// Replay the recorded source events as full, non-overlapping dodge parts.
// One seeded shuffle bag per original difficulty era preserves vocabulary,
// and one constant rotation per part retains its wall geometry and ordering.
function create(seed=newSeed(),duration=3600){
 const random=rng(seed),pick=n=>Math.floor(random()*n);
 const waves=[],groups=[{at:0,rate:1,tilt:0}],partOrder=[],bins=[[],[],[]],
  bags=[[],[],[]],lastPartId=[-1,-1,-1];
 for(const part of VIDEO.parts)bins[part.era].push(part);
 // Randomized shuffle bag, but choose among several compatible whole
 // chains. This is the seam correction: the NEXT clip is chosen with the
 // previous exit still on screen, rather than splicing a random hard cut.
 function pickPart(era,lastWave,exitSector){
  if(!bags[era].length){
   bags[era]=bins[era].slice();
   for(let i=bags[era].length-1;i>0;i--){
    const j=pick(i+1);[bags[era][i],bags[era][j]]=[bags[era][j],bags[era][i]];
   }
  }
  if(!lastWave){
   const part=bags[era].pop();lastPartId[era]=part.id;return part;
  }
  const compatible=bags[era].map((part,index)=>{
   let seam=Infinity;
   for(let turn=0;turn<6;turn++){
    const incoming=rotateMask(part.events[0].mask,turn,false);
    const options=part.entryOpenings.map(x=>mod6(x+turn));
    const lane=options.reduce((best,x)=>distance(x,exitSector)<distance(best,exitSector)?x:best,options[0]);
    const wallChange=Array.from({length:6},(_,i)=>i)
     .filter(i=>!!(incoming&(1<<i))!==!!(lastWave.pattern&(1<<i))).length;
    const widthChange=Math.abs(Math.log(part.entryWidth/lastWave.sourceWidth));
    const score=distance(lane,exitSector)*5+wallChange*.30+widthChange*.38;
    if(score<seam)seam=score;
   }
   if(part.id===lastPartId[era]&&bags[era].length>1)seam+=20;
   return {index,seam};
  }).sort((a,b)=>a.seam-b.seam);
  const pool=Math.min(3,compatible.length);
  const chosen=compatible[pick(pool)];
  const [part]=bags[era].splice(chosen.index,1);
  lastPartId[era]=part.id;return part;
 }
 let impact=2,last=null,cohortClear=-Infinity,id=0,groupId=0,previousSafe=4;
 while(impact<duration){
  const era=impact<60?0:impact<120?1:2;
  const part=pickPart(era,last,previousSafe);
  const first=part.events[0];
  const targetSafe=last?mod6(previousSafe+(random()<.82?0:random()<.5?-1:1)):4;
  // Rotate the entire incoming source part, not its individual waves.
  // Prefer a matching exit corridor and similar first wall at each join.
  let rotation=0,bestCost=Infinity;
  for(let candidate=0;candidate<6;candidate++){
   const incoming=rotateMask(first.mask,candidate,false),openings=[];
   for(let sector=0;sector<6;sector++)if(!(incoming&(1<<sector)))openings.push(sector);
   const nearest=openings.reduce((best,s)=>distance(s,previousSafe)<distance(best,previousSafe)?s:best,openings[0]);
   const changed=last?Array.from({length:6},(_,s)=>!!((incoming^last.pattern)&(1<<s))).filter(Boolean).length:0;
   const cost=distance(nearest,targetSafe)*5+distance(nearest,previousSafe)*4+
    changed*.32+random()*.12;
   if(cost<bestCost){bestCost=cost;rotation=candidate}
  }
  let anchor=null,played=0,partDelayMax=0;
  for(let j=0;j<part.events.length&&impact<duration;j++){
   const source=part.events[j],sourceOffset=source.videoSeconds-part.sourceStart;
   // Absolute source event offsets keep later crossings from accumulating
   // earlier collision-clearance delays inside a long dodge sequence.
   if(anchor!==null)impact=anchor+sourceOffset;
   const mask=rotateMask(source.mask,rotation,false),possible=[];
   for(let sector=0;sector<6;sector++)if(!(mask&(1<<sector)))possible.push(sector);
   possible.sort((a,b)=>distance(a,previousSafe)-distance(b,previousSafe));
   const safe=possible[0];
   // The MP4's 35px nominal bands are actually ~28px on screen.
   // 35 * .92 (world width) * 1.08 (scene) * .8 (video viewport) = 27.8px.
   // Thick grayscale slabs retain the very same physical scaling.
   const thickness=Math.max(22,source.width*WALL_WIDTH_SCALE);
   if(last){
    if(safe===previousSafe)impact=Math.max(impact,last.impact+.36);
    else{
     const turn=distance(safe,previousSafe)*SIXTH;
     const travel=Math.max(turn/(9*Math.PI/180*60),distance(safe,previousSafe)*.18)+.21;
     impact=Math.max(impact,cohortClear+travel);
    }
   }
   if(anchor===null)anchor=impact;
   const delay=Math.max(0,impact-anchor-sourceOffset);
   partDelayMax=Math.max(partDelayMax,delay);
   const speed=speedAt(impact),sectors=[];
   for(let k=0;k<6;k++)if(mask&(1<<k))sectors.push(k);
   if(!sectors.length||sectors.length===6||sectors.includes(safe))
    throw Error('Bad source Hexagonest wall mask');
   const r=1180,start=impact-(r-66)/speed,profiles={};
   for(const sector of sectors)profiles[sector]={thickness,offset:0};
   const wave={id:id++,group:groupId,partId:part.id,
    sourceEventIndex:part.firstEventIndex+j,
    sourceVideoSeconds:source.videoSeconds,sourceOffset,sourceMask:source.mask,
    sourceWidth:source.width,partRotation:rotation,sourceDelay:delay,
    pattern:mask,sides:6,sectors,profiles,innerExtra:0,outerExtra:0,
    safeSector:safe,safeAngle:(safe+.5)*SIXTH,impact,r,speed,thickness,
    start,end:start+(r+thickness-26)/speed};
   waves.push(wave);played++;
   const clear=impact+(66+thickness-59)/speed;
   cohortClear=safe===previousSafe?Math.max(cohortClear,clear):clear;
   previousSafe=safe;last=wave;
  }
  // Retain the pause following the source chain, not an invented .12s join.
  if(!played)break;
  partOrder.push({partId:part.id,era,at:anchor,end:last.impact,
   sourceStart:part.sourceStart,sourceEnd:part.sourceEnd,
   observedEvents:part.events.length,played,rotation,maxDelay:partDelayMax,
   entryOpenings:part.entryOpenings.map(s=>mod6(s+rotation)),
   exitOpenings:Array.from({length:6},(_,s)=>s).filter(s=>!(last.pattern&(1<<s))),
   exitSector:previousSafe});
  groups.push({at:anchor,rate:0,tilt:0,partId:part.id,group:groupId});
  // Shorten ONLY randomized whole-part transitions by at most 0.14 s.
  // Source wall timing inside each original dodge part is unchanged.
  const joinGap=Math.max(.2,Math.min(part.gapAfter,2.6)-.14);
  partOrder.at(-1).joinGap=joinGap;
  groupId++;impact=last.impact+joinGap;
 }
 // Frame-measured camera turns are independent of randomized wall chains.
 // Reversal intervals are uneven, and the arena stops turning at 116.2s.
 const spinEvents=SPIN_REVERSALS.filter(at=>at<duration)
  .map((at,i)=>({at,rate:at>=STILL_MONO_AT?0:i%2?1:-1}));
 return {mode:'hexagonest-video',kind:'hexagonest-video',seed:seed>>>0,duration,
   shapeSchedule:[[0,6]],morphSeconds:0,waves,groups,partOrder,spinEvents,source:VIDEO.source};
}
// Play the existing 31 whole, video-observed dodge chains in shuffled order.
// Shuffle bags select among compatible part boundaries, and NEVER reorder
// or regenerate individual walls inside a part. Reuse measured source
// camera/zoom/palette data, independently of wall order.
function createRandomTimeline(seed=newSeed(),duration=3600){
 const data=create(seed,duration);
 return {...data,sourceAligned:true,sourceVideoOffset:CAMERA.OFFSET,
  partShuffle:true,sourceWaveCount:VIDEO.events.length};
}
// Video-faithful chronological replay for the first complete recorded run.
// Source video timestamps are measured from the MP4; the 0.60-second menu
// is excluded from gameplay time. Preserve every observed mask, thickness,
// source event and pause. Only AFTER the recording ends may the existing
// 31-part randomized replay continue.
function createVideoTimeline(seed=newSeed(),duration=3600){
 const offset=CAMERA.OFFSET,endOfVideo=VIDEO.videoLength-offset;
 const waves=[],groups=[{at:0,rate:0,tilt:0}],partOrder=[];
 let id=0,previousSafe=4;
 for(const part of VIDEO.parts){
  const at=Math.max(0,part.sourceStart-offset);
  if(at>=duration)break;
  const groupId=partOrder.length;
  let played=0,lastWave=null;
  for(let j=0;j<part.events.length;j++){
   const event=part.events[j],impact=event.videoSeconds-offset;
   if(impact>=duration)break;
   const sectors=Array.from({length:6},(_,k)=>k).filter(k=>event.mask&(1<<k));
   const possible=Array.from({length:6},(_,k)=>k).filter(k=>!(event.mask&(1<<k)));
   if(!sectors.length||!possible.length)continue;
   const safe=possible.reduce((best,next)=>
    distance(next,previousSafe)<distance(best,previousSafe)?next:best,possible[0]);
   const speed=speedAt(event.videoSeconds),thickness=Math.max(22,event.width*WALL_WIDTH_SCALE);
   const r=1180,start=impact-(r-66)/speed,profiles={};
   for(const sector of sectors)profiles[sector]={thickness,offset:0};
   const wave={id:id++,group:groupId,partId:part.id,
    sourceEventIndex:part.firstEventIndex+j,
    sourceVideoSeconds:event.videoSeconds,
    sourceOffset:event.videoSeconds-part.sourceStart,
    sourceMask:event.mask,sourceWidth:event.width,
    partRotation:0,sourceDelay:0,
    pattern:event.mask,sides:6,sectors,profiles,innerExtra:0,outerExtra:0,
    safeSector:safe,safeAngle:(safe+.5)*SIXTH,impact,r,speed,thickness,
    start,end:start+(r+thickness-26)/speed};
   waves.push(wave);lastWave=wave;previousSafe=safe;played++;
  }
  if(!played)break;
  groups.push({at,rate:0,tilt:0,partId:part.id,group:groupId});
  partOrder.push({partId:part.id,era:part.era,at,end:lastWave.impact,
   sourceStart:part.sourceStart,sourceEnd:part.sourceEnd,rotation:0,
   observedEvents:part.events.length,played,maxDelay:0,sourceAligned:true,
   joinGap:part.gapAfter,entryOpenings:part.entryOpenings,
   exitOpenings:part.exitOpenings,exitSector:previousSafe});
 }
 // The recorded run ends naturally. The original randomized, whole-part
 // generator remains available for indefinite play beyond the source movie.
 if(duration>endOfVideo+2.1){
  const extra=create(seed,Math.max(8,duration-endOfVideo));
  const groupOffset=partOrder.length,shift=endOfVideo;
  for(const wave of extra.waves){
   const moved={...wave,id:id++,group:wave.group+groupOffset,
    start:wave.start+shift,end:wave.end+shift,impact:wave.impact+shift};
   if(moved.impact<duration)waves.push(moved);
  }
  for(const group of extra.groups.slice(1))
   groups.push({...group,at:group.at+shift,group:group.group+groupOffset});
  for(const part of extra.partOrder)
   partOrder.push({...part,at:part.at+shift,end:part.end+shift});
 }
 const spinEvents=SPIN_REVERSALS.map((at,i)=>
  ({at:Math.max(0,at-offset),rate:at>=STILL_MONO_AT?0:i%2?1:-1}));
 return {mode:'hexagonest-video',kind:'hexagonest-video',seed:seed>>>0,
  duration,shapeSchedule:[[0,6]],morphSeconds:0,
  waves,groups,partOrder,spinEvents,source:VIDEO.source,
  sourceAligned:true,sourceVideoOffset:offset,videoEnd:endOfVideo,
  sourceWaveCount:VIDEO.events.length};
}
class HexagonestGame extends HARD.HardGame{
 constructor(data=createRandomTimeline()){
  super(data);this.level=2;this.hexagonestMode=true;this.hardMode=false;
  // HARD's internal physics scans all spin groups at each 240Hz step.
  // Hexagonest has hundreds of groups over the longer recording, so keep a
  // single neutral event for the inherited collision/mesh loop and advance
  // video-inspired spin events once per rendered update.
  this.spinEvents=data.spinEvents||data.groups;
  this.sourceAligned=!!data.sourceAligned;
  this.timeline={...data,groups:[{at:0,rate:0,tilt:0}]};
  this.spinIndex=0;
  this.recordedCamera=null;this.profile=null;this.rotation=0;this.rotationSpeed=-2.2;
 }
 get playerSpeed(){return 9*Math.PI/180*60*CLOCK}
 die(w){
  if(!w||this.dead)return;
  // HARD physics uses its own internal spin. Restore the VIDEO camera on the
  // very same collision substep, not one render frame after it.
  if(this.sourceAligned){
   const reference=CAMERA.at(this.time+CAMERA.OFFSET);
   this.rotation=reference.rotation;this.zoom=reference.zoom;this.tilt=reference.tilt;
  }
  super.die(w);
  this.deathCamera={rotation:this.rotation,zoom:this.zoom,tilt:this.tilt,time:this.time};
 }
 update(dt,input=0){
  const t0=this.time,r0=this.rotation,rs0=this.rotationSpeed;
  // HARD physics uses a 25/24 game clock. Hexagonest is video-time 1:1.
  super.update(dt/CLOCK,input);
  // die() already captured the source camera in the exact collision step.
  if(this.dead)return;
  const elapsed=this.time-t0;if(elapsed<=0)return;
  while(this.spinIndex>0&&this.spinEvents[this.spinIndex].at>this.time)this.spinIndex--;
  while(this.spinIndex+1<this.spinEvents.length&&this.spinEvents[this.spinIndex+1].at<=this.time)this.spinIndex++;
  const direction=this.spinEvents[this.spinIndex].rate;
  if(this.sourceAligned){
   const reference=CAMERA.at(this.time+CAMERA.OFFSET);
   this.rotation=reference.rotation;
   // The original recording snaps to a stationary, level arena in mono.
   // Never interpret that camera cut as an enormous physical spin velocity.
   const monoCut=this.time+CAMERA.OFFSET>=CAMERA.STILL_AT;
   this.rotationSpeed=monoCut?0:Math.max(-5,Math.min(5,(this.rotation-r0)/elapsed));
   this.zoom=reference.zoom;this.tilt=reference.tilt;
   this.recordedCamera=null;return;
  }
  if(this.time>=STILL_MONO_AT){
   // The black/white recording has a fixed, level hexagon and walls.
   // Reset the turn angle at the exact stage cut instead of continuing
   // the earlier wobble and spin into the static monochrome segment.
   this.rotation=0;this.rotationSpeed=0;this.zoom=1;this.tilt=0;
  }else{
   const target=referenceSpinRate(this.time,direction);
   const k=1-Math.exp(-elapsed*3);
   this.rotationSpeed=rs0+(target-rs0)*k;
   this.rotation=r0+(rs0+this.rotationSpeed)*.5*elapsed;
   this.zoom=1.02+.04*Math.sin(this.time*.45);
   this.tilt=.16*Math.sin(this.time*.81)+.07*Math.sin(this.time*.19);
  }
  this.recordedCamera=null;
 }
}
const API={create,createRandomTimeline,createVideoTimeline,HexagonestGame,palette,speedAt,sceneScale,
 SOURCE_OFFSET:CAMERA.OFFSET,VIDEO_CLOCK_RATE:CLOCK,SOURCE_VIEW,WALL_WIDTH_SCALE,rotateMask,VIDEO_PART_COUNT:VIDEO.parts.length,COLOR_EVENTS,PATTERN_TRANSITION_VERSION:'video-family-v4',PART_REPLAY_VERSION:'seamless-dodge-v10-random-default',SPIN_REVERSALS,GRAYSCALE_AT,STILL_MONO_AT,referenceSpinRate};
if(typeof module!=='undefined')module.exports=API;else root.HexHexagonest=API;
})(typeof window!=='undefined'?window:globalThis);
