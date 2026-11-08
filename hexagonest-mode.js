/* Dedicated video-informed Hexagonest reconstruction; level index 2 only.
 * Original video: UrPXBSh4mqU, 316.0s, 768x480 / 30fps.
 * Video observations are approximate; source game logic is not available.
 */
(function(root){'use strict';
const E=typeof module!=='undefined'?require('./engine'):root.HexEngine;
const HARD=typeof module!=='undefined'?require('./hard-mode'):root.HexHardMode;
const VIDEO=typeof module!=='undefined'?require('./hexagonest-video'):root.HexagonestVideo;
const TAU=Math.PI*2, CLOCK=25/24, SIXTH=TAU/6;
function rng(seed){let s=seed>>>0;return ()=>{s=(s+0x6d2b79f5)>>>0;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296}}
function newSeed(){const a=new Uint32Array(1);if(root.crypto?.getRandomValues){root.crypto.getRandomValues(a);return a[0]}return (Date.now()^Math.random()*0xffffffff)>>>0}
const mod6=n=>(n%6+6)%6;
const distance=(a,b)=>Math.min(mod6(a-b),mod6(b-a));
function rotateMask(mask,shift,flip){
 let result=0;for(let k=0;k<6;k++)if(mask&(1<<k))result|=1<<mod6((flip?-k:k)+shift);
 return result;
}
// 15Hz source-video radial bands: median ~307,345,337 px/s across
// 1-59 / 60-119 / 120-305 s. The Hexagonest-only viewport is scaled to
// 0.67, giving ~460/515/505 pre-projection game units per second.
// Observations of screen flow, not original internal game constants.
function speedAt(t){return t<60?460:t<120?515:505}
function sceneScale(){return .67}
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
 if(time>=120)return [0,0,[0,0,100]];
 if(time>=60)return [0,0,[18,39,96]];
 let index=0;
 for(let i=1;i<COLOR_EVENTS.length&&COLOR_EVENTS[i][0]<=time;i++)index=i;
 return [COLOR_EVENTS[index][1],92,[10,22,73]];
}
function create(seed=newSeed(),duration=3600){
 const random=rng(seed),pick=n=>Math.floor(random()*n);
 const waves=[],groups=[{at:0,rate:1,tilt:0}],recent=[],bins={};
 for(const clip of VIDEO.clips){
  const era=clip.sourceStart<60?0:clip.sourceStart<120?1:2;
  (bins[era]||= []).push(clip);
 }
 let impact=1.85,last=null,cohortClear=-Infinity,id=0,groupId=0;
 let previousSafe=4;
 while(impact<duration){
  const era=impact<60?0:impact<120?1:2;
  const bank=bins[era],allowed=bank.filter(c=>!recent.includes(c.id));
  const clip=(allowed.length?allowed:bank)[pick((allowed.length?allowed:bank).length)];
  recent.push(clip.id);if(recent.length>9)recent.shift();
  const flip=random()<.5,source0=clip.events[0];
  const sourceMask=rotateMask(source0.mask,0,flip);
  const sourceOpen=Array.from({length:6},(_,i)=>i).filter(i=>!(sourceMask&(1<<i)));
  const sourceGap=sourceOpen[pick(sourceOpen.length)];
  const startSafe=last?mod6(previousSafe+(random()<.72?0:random()<.5?-1:1)):4;
  const rotation=mod6(startSafe-sourceGap);
  const groupAt=impact;
  for(let j=0;j<clip.events.length&&impact<duration;j++){
   const source=clip.events[j],mask=rotateMask(source.mask,rotation,flip);
   const possible=Array.from({length:6},(_,i)=>i).filter(k=>!(mask&(1<<k)));
   possible.sort((a,b)=>distance(a,previousSafe)-distance(b,previousSafe));
   const safe=possible[0];
   const speed=speedAt(impact);
   // Packed video widths were quantized at 4 source pixels and decoded
   // in 5-unit steps. Compensate for the .67 viewport scale so the painted
   // wall thickness matches the observed radial source measurements.
   const thickness=Math.max(22,Math.min(180,source.width*1.22));
   if(last){
    if(safe===previousSafe){
     impact=Math.max(impact,last.impact+.36);
    }else{
     const turn=distance(safe,previousSafe)*SIXTH;
     // 9° per 60Hz frame, compared with 7° in the existing shared controls.
     const travel=Math.max(turn/(9*Math.PI/180*60),distance(safe,previousSafe)*.18)+.21;
     impact=Math.max(impact,cohortClear+travel);
    }
   }
   const sectors=Array.from({length:6},(_,k)=>k).filter(k=>mask&(1<<k));
   if(sectors.length===0||sectors.length===6||sectors.includes(safe))throw Error('Bad Hexagonest wall mask');
   const r=1180,start=impact-(r-66)/speed,profiles={};
   for(const s of sectors)profiles[s]={thickness,offset:0};
   const wave={id:id++,group:groupId,partId:clip.id,sourceVideoSeconds:source.videoSeconds,pattern:mask,
    sides:6,sectors,profiles,innerExtra:0,outerExtra:0,safeSector:safe,
    safeAngle:(safe+.5)*SIXTH,impact,r,speed,thickness,
    start,end:start+(r+thickness-26)/speed};
   waves.push(wave);
   const clear=impact+(66+thickness-59)/speed;
   cohortClear=safe===previousSafe?Math.max(cohortClear,clear):clear;
   previousSafe=safe;last=wave;
   if(j+1<clip.events.length){
    const observedGap=clip.events[j+1].videoSeconds-source.videoSeconds;
    impact+=Math.max(.38,Math.min(1.10,observedGap));
   }else impact+=.12+random()*.18;
  }
  groups.push({at:groupAt,rate:random()<.5?-1:1,tilt:(random()-.5)*.35});
  groupId++;
  impact+=.07+random()*.16;
 }
 return {mode:'hexagonest-video',kind:'hexagonest-video',seed:seed>>>0,duration,
   shapeSchedule:[[0,6]],morphSeconds:0,waves,groups,source:VIDEO.source};
}
class HexagonestGame extends HARD.HardGame{
 constructor(data=create()){
  super(data);this.level=2;this.hexagonestMode=true;this.hardMode=false;
  // HARD's internal physics scans all spin groups at each 240Hz step.
  // Hexagonest has hundreds of groups over the longer recording, so keep a
  // single neutral event for the inherited collision/mesh loop and advance
  // video-inspired spin events once per rendered update.
  this.spinEvents=data.groups;
  this.timeline={...data,groups:[data.groups[0]]};
  this.spinIndex=0;
  this.recordedCamera=null;this.profile=null;this.rotation=0;this.rotationSpeed=2.5;
 }
 get playerSpeed(){return 9*Math.PI/180*60*CLOCK}
 update(dt,input=0){
  const t0=this.time,r0=this.rotation,rs0=this.rotationSpeed;
  // HARD physics uses a 25/24 game clock. Hexagonest is video-time 1:1.
  super.update(dt/CLOCK,input);
  const elapsed=this.time-t0;if(elapsed<=0)return;
  while(this.spinIndex>0&&this.spinEvents[this.spinIndex].at>this.time)this.spinIndex--;
  while(this.spinIndex+1<this.spinEvents.length&&this.spinEvents[this.spinIndex+1].at<=this.time)this.spinIndex++;
  const direction=this.spinEvents[this.spinIndex].rate;
  const target=direction*(this.time<60?2.55:this.time<120?3.5:4.1);
  const k=1-Math.exp(-elapsed*3);
  this.rotationSpeed=rs0+(target-rs0)*k;
  this.rotation=r0+(rs0+this.rotationSpeed)*.5*elapsed;
  this.zoom=1.02+.04*Math.sin(this.time*.45);
  this.tilt=.16*Math.sin(this.time*.81)+.07*Math.sin(this.time*.19);
  this.recordedCamera=null;
 }
}
const API={create,HexagonestGame,palette,speedAt,sceneScale,rotateMask,VIDEO_PART_COUNT:VIDEO.clips.length,COLOR_EVENTS};
if(typeof module!=='undefined')module.exports=API;else root.HexHexagonest=API;
})(typeof window!=='undefined'?window:globalThis);
