/* Task 6 — HEXAGONEST after 60 seconds only.
 * Reference: user upload 1557(7).mp4, video 04:45–04:58,
 * recorded 60+ gameplay approx 285.5–297.5 s. Source values are
 * visually sampled at 480x300, 10 fps, not original engine data.
 *
 * This is an isolated subclass; existing 0–60 Hexagonest logic and all
 * stage-one/other-mode code remain unchanged. Only complete dodge-part
 * order is randomized. Camera, hue, pulse and death freeze are time-only.
 */
(function(root){'use strict';
const BASE=typeof module!=='undefined'?require('./hexagonest-mode'):root.HexHexagonest;
const MIXED=typeof module!=='undefined'?require('./mixed-transition'):root.HexMixedTransition;
const TAU=Math.PI*2,SIXTH=TAU/6,START=60,SPAWN_RADIUS=1180;
const mod6=n=>(n%6+6)%6;
const delta=(a,b)=>Math.min(mod6(a-b),mod6(b-a));
function randomFromSeed(seed){let n=(seed^0x61b4c9e3)>>>0;return ()=>{n=(n+0x6d2b79f5)>>>0;let z=Math.imul(n^n>>>15,1|n);z^=z+Math.imul(z^z>>>7,61|z);return ((z^z>>>14)>>>0)/4294967296}}
/* source video start/end, measured approximate source game start/end,
 * then [offset, source-safe-lane shift, blocked lanes relative to opening,
 * estimated physical thickness]. Neighboring events are one continuous
 * dodge motif, not time-sliced into arbitrary fixed-length groups. */
const SOURCE=[
 ['H6-A',[287.1,288.8],[61.91,63.63],[[0,0,[1,2,3,4,5],63],[.711,-2,[1,2,3,4,5],43],[1.016,2,[1,3,5],88],[1.321,3,[1,2,3,4,5],88],[1.626,2,[1,2,4,5],70]]],
 ['H6-B',[289.3,290.7],[64.14,65.56],[[.102,0,[2,3,4,5],41],[.610,-1,[1,2,3,4,5],65],[.914,1,[1,2,3,4,5],62],[1.219,2,[1,2,3,4,5],88]]],
 ['H6-C',[291.1,292.9],[65.97,67.80],[[.102,0,[1,2,3,4,5],41],[.508,0,[1,2,4,5],44],[1.016,2,[1,2,4,5],47],[1.524,3,[1,3,5],63]]],
 ['H6-D',[293.1,295.2],[68,70.14],[[.203,0,[1,2,3,4,5],66],[.711,1,[1,2,3,4,5],69],[1.219,1,[1,3,5],62],[1.727,1,[1,2,3,4,5],37],[2.032,1,[1,2,3,4,5],43]]],
 ['H6-E',[295.3,297.3],[70.24,72.27],[[.102,0,[1,2,3,4,5],40],[.508,-1,[1,2,4,5],38],[.914,1,[2,5],69],[1.321,0,[1,2,3,4,5],63],[1.626,-1,[1,3,5],62],[1.930,-2,[1,3,5],62]]]
];
const PARTS=SOURCE.map(([id,video,game,events])=>({id,sourceVideoSeconds:video,sourceGameSeconds:game,events}));
/* Approximate center-ring camera phase every 0.5 s from the user video,
 * sixfold unwrapped. Anchor relative to the inherited 60-second camera:
 * no jump at 60; directional changes remain stepped at 30 Hz.
 * After the recording ends, repeat the observed end-state in monochrome;
 * original-game post-video camera is not known. */
const SPIN_KEYS=[
 [60,0],[60.28,0],[60.79,.470],[61.30,.164],[61.81,.325],
 [62.31,.909],[62.82,1.370],[63.33,2.446],[63.84,2.482],
 [64.34,2.995],[64.85,3.247],[65.36,3.233],[65.87,3.386],
 [66.38,4.208],[66.89,4.208],[67.40,4.287],[67.90,4.891],
 [68.41,4.812],[68.92,4.804],[69.43,4.922],[69.94,4.189],
 [70.44,3.844],[70.95,2.778],[71.46,2.136],[71.97,2.545],
 [72.47,2.50]
];
const MONO_AT=60.95,RECORDED_END=72.47;
function sampleTable(arr,t){
 if(t<=arr[0][0])return arr[0][1];
 for(let k=1;k<arr.length;k++){
  if(t<=arr[k][0]){
   const a=arr[k-1],b=arr[k],u=(t-a[0])/(b[0]-a[0]);
   return a[1]+u*(b[1]-a[1]);
  }
 }
 return arr.at(-1)[1];
}
function spinAt(time,base){
 const t=Math.max(START,Math.floor(Math.min(time,RECORDED_END)*30+1e-9)/30);
 return base+sampleTable(SPIN_KEYS,t);
}
function palette(time){
 // The immutable task-5 palette has already turned gray by 59.2 s.
 // Stay gray across the boundary instead of flashing new color for 0.9s.
 return time<MONO_AT?[0,0,[18,39,96]]:[0,0,[27,48,97]];
}
function cameraAt(game){
 if(game.dead&&game.deathCamera?.affine)return game.deathCamera.affine.slice();
 const t=game.time,rotation=spinAt(t,game._post60BaseRotation||0);
 const quant=Math.floor(t*30+1e-8);
 const beat=t*170/60,phase=((beat%1)+1)%1,pulse=Math.exp(-phase*11);
 const s=1.015+.035*pulse,comp=.93+.014*Math.sin(t*.52),shear=.024*Math.sin(t*.63);
 const c=Math.cos(rotation),sin=Math.sin(rotation);
 const x=(quant%2?1:-1)*Math.round(2.4*pulse*2)/2;
 const y=((quant*3)%5-2)*Math.round(1.5*pulse*2)/2;
 return [(c+shear*sin)*s,comp*sin*s,(-sin+shear*c)*s,comp*c*s,x,y];
}
function actor(w){
 return {...w,actors:w.sectors.flatMap(sector=>
  MIXED.panels(6,sector).map(([a,b],idx)=>({
   id:w.id+':'+sector+':'+idx,waveId:w.id,band:'main',sector,sides:6,
   thickness:w.thickness,offset:0,mixedStart:a,mixedEnd:b,hardPanel:true,
   renderPoly:[[0,0],[0,0],[0,0],[0,0]]
  })))};
}
function createContinuation(game){
 const original=game.timeline,kept=game._actors.filter(w=>w.start<=START+1e-8);
 const tail=kept.reduce((last,w)=>w.impact>last.impact?w:last,{
  impact:START,thickness:42,safeSector:mod6(Math.floor((game.angle%TAU+TAU)%TAU/SIXTH))});
 const random=randomFromSeed(original.seed>>>0),shuffled=[],order=[],waves=[];
 const speed=400,travel=(SPAWN_RADIUS-66)/speed;
 const firstSpawnAfter=START+.15;
 let at=Math.max(START+travel+.18,tail.impact+(tail.thickness+80)/speed+.30);
 let serial=1000000,previousExit=Number.isInteger(tail.safeSector)?tail.safeSector:4,lastPart=null;
 function refill(){
  const bag=PARTS.map((_,i)=>i);
  for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}
  shuffled.push(...bag);
 }
 while(at<original.duration-3 && waves.length<12000){
  if(!shuffled.length)refill();
  let ix=shuffled.pop();if(ix===lastPart&&shuffled.length){shuffled.unshift(ix);ix=shuffled.pop()}
  const part=PARTS[ix];let last=null,count=0;
  // One fixed rotation for the entire recorded part; choose the alignment
  // that retains the outgoing opening of the previous wave.
  const rotation=previousExit;
  for(let i=0;i<part.events.length;i++){
   const [offset,safeShift,relative,width]=part.events[i],impact=at+offset;
   if(impact>=original.duration)break;
   const safeSector=mod6(rotation+safeShift);
   const sectors=[...new Set(relative.map(k=>mod6(safeSector+k)))].sort((a,b)=>a-b);
   if(sectors.length>=6||sectors.includes(safeSector)||!sectors.length)
    throw Error('HEXAGONEST post-60 source mask closes escape sector');
   const radius=SPAWN_RADIUS,start=impact-travel;
   if(start<firstSpawnAfter-1e-6)throw Error('HEXAGONEST new actor before 60s');
   const profiles={};for(const sector of sectors)profiles[sector]={thickness:width,offset:0};
   const w={id:serial++,group:order.length,partId:part.id,partEvent:i,
    sourceVideo:'1557(7).mp4',
    sourceVideoSeconds:part.sourceVideoSeconds[0]+offset/1.016,
    sourceGameSeconds:part.sourceGameSeconds[0]+offset,
    sourceOffset:offset,partRotation:rotation,pattern:sectors.reduce((a,s)=>a|(1<<s),0),
    sides:6,sectors,profiles,innerExtra:0,outerExtra:0,
    safeSector,safeAngle:(safeSector+.5)*SIXTH,impact,r:radius,
    speed,thickness:width,start,end:start+(radius+width-26)/speed};
   waves.push(w);last=w;count++;
  }
  if(!last)break;
  order.push({partId:part.id,at,end:last.impact,played:count,rotation,
   sourceVideoSeconds:part.sourceVideoSeconds.slice(),sourceGameSeconds:part.sourceGameSeconds.slice(),
   entryOpening:rotation,exitSector:last.safeSector});
  previousExit=last.safeSector;
  // Preserve all source intra-part intervals, apply only a safe seam pause.
  at=last.impact+Math.max(.52,(last.thickness+72)/speed+.18);
  lastPart=ix;
 }
 game.timeline={...original,mode:'hexagonest-video-post60',kind:'hexagonest-video',
  sourcePartCountBefore60:original.partOrder?.length||0,
  post60PartCount:PARTS.length,post60PartOrder:order,
  post60Source:'1557(7).mp4 04:45-04:58',post60Estimated:true,
  waves:kept.concat(waves)};
 game._actors=kept.concat(waves.map(actor)).sort((a,b)=>a.start-b.start);
 game._cursor=0;game._active=[];game._lastClock=-Infinity;
 game._post60Active=true;
 game._post60BaseRotation=game.rotation;
 game.sampleWalls();
 return {retained:kept.length,generated:waves.length,parts:order.length};
}
class HexagonestGame extends BASE.HexagonestGame{
 die(w){
  if(!w||this.dead)return;
  if(!this._post60Active){super.die(w);return}
  const rotation=spinAt(this.time,this._post60BaseRotation);
  const affine=cameraAt(this);
  super.die(w); // Inherited collision snapshot and sound/result lifecycle.
  this.rotation=rotation;this.rotationSpeed=0;
  this.deathCamera={rotation,zoom:this.zoom,tilt:this.tilt,
   time:this.time,affine};
 }
 update(dt,input=0){
  if(this.dead||this.timelineEnded)return;
  if(!this._post60Active&&this.time<START&&this.time+dt>=START){
   // Hexagonest already advances its game clock at 1:1 real seconds.
   const before=Math.max(0,START-this.time);
   if(before>0)super.update(before,input);
   if(!this.dead&&!this.timelineEnded)createContinuation(this);
   const after=dt-before;
   if(after>0&&!this.dead&&!this.timelineEnded)super.update(after,input);
  }else{
   if(!this._post60Active&&this.time>=START)createContinuation(this);
   super.update(dt,input);
  }
  if(this._post60Active&&!this.dead){
   this.rotation=spinAt(this.time,this._post60BaseRotation);
   this.rotationSpeed=0;
   this.tilt=0;this.zoom=1;
  }
 }
}
const API={HexagonestGame,PARTS,SPIN_KEYS,MONO_AT,RECORDED_END,
 palette,cameraAt,spinAt,createContinuation};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexHexagonestPost60=API;
})(typeof window!=='undefined'?window:globalThis);
