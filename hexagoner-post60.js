/* Task 4: isolated HEXAGONER 60+ dodge-part continuation.
 * Measured from user video 1557(7).mp4, 02:56.8-03:44.5.
 * Source time-to-game: (videoSeconds - 119.25)*25/24.
 * Ring occupancy sampled at 10fps in 480x300 video. Source masks,
 * camera phase and thicknesses are estimates, not frame-exact tracks.
 * Only whole-part order is randomized, never motion, color or sounds.
 */
(function(root){'use strict';
const BASE=typeof module!=='undefined'?require('./hexagoner-parts'):root.HexHexagonerParts;
const TAU=Math.PI*2,STEP=TAU/6,START=60,SPEED=360,MAX_SPAWN=1000;
const wrap=n=>(n%6+6)%6;
const rng=seed=>{let x=(seed^0x6b2f8ea1)>>>0;return ()=>{x=(x+0x6d2b79f5)>>>0;let z=Math.imul(x^x>>>15,1|x);z^=z+Math.imul(z^z>>>7,61|z);return ((z^z>>>14)>>>0)/4294967296}};
/* [clip video start,end, events: source-relative game seconds,
 * safe lane offset, blocked lanes relative to escape opening, width] */
const SOURCE=[
 [176.8,180.3,[[0,0,[1,2,3,4,5],55],[.83,3,[3,4],50],[1.56,0,[1,2,3,4,5],60],[2.19,2,[1,2,3,4,5],53],[3.12,1,[1,2,3,4,5],60],[3.65,-1,[4,5],53]]],
 [182.3,184.5,[[0,0,[1,5],58],[1.15,1,[1,2,3,4],54],[1.77,2,[1,2,3,4,5],60],[2.29,2,[1,3,4,5],49]]],
 [185.9,186.9,[[0,0,[1,3,4],40],[1.04,2,[1,2,4,5],49]]],
 [188.1,190.8,[[0,0,[1,2,3,4],60],[.73,1,[1,2,3,4,5],59],[1.77,3,[1,2,3,4,5],59],[2.29,0,[1,2,3,4,5],142],[2.81,-2,[1,2,3,4,5],75]]],
 [191.7,193.6,[[0,0,[3,4],56],[.63,0,[1,2,3,4,5],57],[1.25,-2,[1,2,3,4,5],57],[1.98,3,[2,3,4,5],55]]],
 [194.2,197.3,[[0,0,[1,2],48],[.63,-1,[1,2,3,4,5],55],[1.25,0,[1,2,3,4,5],60],[1.77,3,[1,2,3,4],56],[2.4,1,[1,5],48],[3.23,0,[2,3,5],47]]],
 [198.7,200.3,[[0,0,[1,5],45],[.42,3,[1,2,3,4,5],51],[1.04,2,[3,4,5],47],[1.67,0,[1,2,5],51]]],
 [201.2,203.0,[[0,0,[2,3,4],68],[1.04,0,[1,2,3,4,5],144],[1.88,2,[1,2,3,4,5],44]]],
 [204.2,206.2,[[0,0,[1,2,3,4,5],51],[.63,0,[1,2,3,4,5],55],[1.25,2,[1,2,3,4,5],55],[2.08,-2,[1,2,3,4,5],74]]],
 [206.8,208.6,[[0,0,[1,2,3,4,5],81],[.62,3,[1,2,3,4,5],131],[1.15,-2,[1,2,3,4,5],78],[1.87,0,[1,2,3,4,5],129]]],
 [209.6,211.9,[[0,0,[1,2,3,4,5],67],[.62,2,[1,2,3,4,5],78],[1.25,-2,[1,2,3,4,5],135],[1.77,-1,[1,2,3],73],[2.4,2,[1,2,3,4,5],78]]],
 [213.0,214.7,[[0,0,[1,2,3,4,5],52],[1.77,0,[1,2,4,5],75]]],
 [215.8,217.9,[[0,0,[1,2,3,4,5],52],[.62,-2,[1,2,5],52],[1.25,3,[1,5],49],[2.19,-1,[1,2,4,5],69]]],
 [219.6,220.4,[[0,0,[1,2,3,4,5],74],[.8,-1,[1,2,3,4],69]]],
 [220.8,223.3,[[0,0,[1,2,3,4],64],[.56,0,[1,2,3,4],42],[1.19,1,[1,2,4,5],59],[1.85,1,[1,2,3,4],45],[2.50,-1,[1,2,3,4],82]]]
];
const PARTS=SOURCE.map((a,i)=>({id:'X4-'+String(i+1).padStart(2,'0'),
  sourceVideoSeconds:[a[0],a[1]],sourceGameSeconds:a.slice(0,2).map(t=>+(25*(t-119.25)/24).toFixed(3)),
  events:a[2]}));
/* Post-minute centered ring sixfold phase measurements sampled once a
 * source-video second; continuity unwrapped, phase median-filtered. */
const CAMERA=[
 [60,-11.66],[60.89,-13.95],[61.93,-14.45],[62.97,-16.12],[64.01,-15.92],
 [65.05,-16.98],[66.09,-17.83],[67.14,-18.57],[68.18,-18.88],[69.22,-19.55],
 [70.26,-19.84],[71.30,-20.51],[72.34,-21.45],[73.39,-21.65],[74.43,-20.93],
 [75.47,-19.78],[76.51,-18.89],[77.55,-18.74],[78.59,-19.47],[79.64,-19.52],
 [80.68,-18.93],[81.72,-19.31],[82.76,-17.96],[83.80,-17.08],[84.84,-16.93],
 [85.89,-16.39],[86.93,-15.10],[87.97,-16.40],[89.01,-18.03],[90.05,-19.34],
 [91.09,-20.27],[92.14,-21.71],[93.18,-22.21],[94.22,-22.83],[95.26,-23.88],
 [96.30,-24.65],[97.34,-24.18],[98.39,-24.38],[99.43,-23.44],[100.47,-23.57],
 [101.51,-22.75],[102.55,-22.70],[103.59,-21.93],[104.64,-20.94],
 [105.50,-21.6],[106.60,-22.1],[107.65,-23.1],[108.34,-23.8]
];
const HUES=[[60,52],[61,235],[64,268],[69,288],[74,310],[78,326],
 [84,336],[88,256],[92,304],[96,332],[100,298],[104,247],[108,323]];
function lookup(table,time){
 let t=Math.max(table[0][0],time),i=0;
 while(i+1<table.length&&table[i+1][0]<t)i++;
 if(i===table.length-1)return table[i][1];
 const a=table[i],b=table[i+1],u=Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0])));
 return a[1]+(b[1]-a[1])*u;
}
function palette(t){return [lookup(HUES,t),92,[96,88,48]]}
function cameraAt(t){
 const time=Math.max(60,Math.floor(t*60)/60);
 const theta=lookup(CAMERA,time),c=Math.cos(theta),s=Math.sin(theta);
 const beat=time*140/60,phase=((beat%1)+1)%1;
 const pulse=Math.exp(-phase*10),frame=Math.floor(time*60);
 // Deliberately stepped, no camera easing and no wall RNG dependency.
 const zoom=.8+.030*pulse,compress=.95+.017*Math.sin(time*.41);
 const kick=.025*Math.sin(time*.77);
 const dx=((frame%2)*2-1)*Math.round(2.6*pulse*2)/2;
 const dy=((frame*3)%5-2)*Math.round(1.8*pulse*2)/2;
 return [(c+kick*s)*zoom,compress*s*zoom,(-s+kick*c)*zoom,compress*c*zoom,dx,dy];
}
function makeBag(random){
 const b=PARTS.map((_,i)=>i);
 for(let i=b.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}
 return b;
}
function build(g){
 const previousTimeline=g.timeline,old=g._spawns.filter(w=>w.start<=60+1e-8);
 const random=rng(previousTimeline.seed>>>0),tail=old.reduce((last,w)=>{
  const impact=w.start+(w.r-66)/w.speed;
  return impact>last.impact?{impact,thickness:w.thickness,
    safe:(()=>{const a=new Set(w.sectors);for(let i=0;i<6;i++)if(!a.has(i))return i;return last.safe})()}:last;
 },{impact:60,thickness:42,safe:Math.floor((g.angle%(TAU)+TAU)%(TAU)/STEP)});
 let impact=Math.max(61.72,tail.impact+Math.max(.55,tail.thickness/SPEED+.30));
 const waves=[],order=[];let serial=1000000,bag=[],lastPart=null,last=tail;
 while(impact<previousTimeline.duration-3&&waves.length<40000){
  if(!bag.length)bag=makeBag(random);
  let ix=bag.pop();if(ix===lastPart&&bag.length){bag.unshift(ix);ix=bag.pop()}
  const part=PARTS[ix];
  // Whole-part rotation is chosen from the previous exit lane. It does not
  // change any source-relative direction, width or inter-wall timing.
  const turn=wrap(last.safe);
  let current=null,events=0;
  for(let j=0;j<part.events.length;j++){
   const [offset,shift,blocked,thickness]=part.events[j],at=impact+offset;
   if(at>previousTimeline.duration)break;
   const gap=wrap(turn+shift),sectors=blocked.map(k=>wrap(gap+k));
   let spawnRadius=Math.min(MAX_SPAWN,66+SPEED*(at-60-.05));
   spawnRadius=Math.max(540,spawnRadius);
   const start=at-(spawnRadius-66)/SPEED;
   const source=part.sourceVideoSeconds[0]+offset*24/25;
   const w={id:serial++,sides:6,partId:part.id,partEvent:j,group:order.length,
    sourceVideo:'1557(7).mp4',sourceVideoSeconds:source,partRotation:turn,
    sourceImpact:part.sourceGameSeconds[0]+offset,
    sourceOffset:offset,sectors,impact:at,safeSector:gap,r:spawnRadius,
    speed:SPEED,thickness,start,end:start+(spawnRadius+thickness-26)/SPEED};
   waves.push(w);current=w;events++;
  }
  if(!current)break;
  order.push({partId:part.id,at:impact,end:current.impact,count:events,
    sourceVideoSeconds:part.sourceVideoSeconds.slice(),
    sourceGameSeconds:part.sourceGameSeconds.slice(),rotation:turn,
    exitSector:current.safeSector});
  last={impact:current.impact,thickness:current.thickness,safe:current.safeSector};
  // Group seam: old walls keep moving. A new group is only scheduled after
  // the previous group leaves time for player movement and wall clearance.
  impact=current.impact+Math.max(.57,current.thickness/SPEED+.27);
  lastPart=ix;
 }
 g.timeline={...previousTimeline,mode:'hexagoner-video-parts-post60',
   sourcePartCountBefore60:previousTimeline.sourcePartCount,
   post60PartCount:PARTS.length,post60PartOrder:order,
   post60Source:'1557(7).mp4 02:56.8-03:44.5',waves:old.concat(waves)};
 g._spawns=old.concat(waves).sort((a,b)=>a.start-b.start);
 g._cursor=0;g._active=[];g._sampleTime=-Infinity;
 g._stage4Active=true;g.sampleWalls();
 return {retained:old.length,newWaves:waves.length,parts:order.length};
}
class HexagonerGame extends BASE.HexagonerGame{
 sampleWalls(){
  super.sampleWalls();
  if(this._stage4Active&&this.time>=START){
   this.recordedCamera=cameraAt(this.time);
   this.referenceCamera=this.recordedCamera;
  }
 }
 update(dt,input=0){
  if(this.dead||this.timelineEnded)return;
  // Allow the original game to carry the pre-60 actors through the boundary;
  // never delete actors that have already spawned.
  super.update(dt,input);
  if(this.time>=START&&!this._stage4Active&&!this.dead)build(this);
 }
}
const API={HexagonerGame,PARTS,CAMERA,HUES,palette,cameraAt,build};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexHexagonerPost60=API;
})(typeof window!=='undefined'?window:globalThis);
