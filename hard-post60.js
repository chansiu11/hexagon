/* HEXAGON HARD continuation: 60+ only. Source recording: 1557(7).mp4,
 * 01:01-01:55 (timer 60-114.58). Measured at 10fps; directions and
 * widths remain estimates, NOT frame-exact reconstructions.
 * 12 contiguous dodge clips; ONLY clip order/whole-clip angle is shuffled.
 */
(function(root){'use strict';
const H=typeof module!=='undefined'?require('./hard-mode'):root.HexHardMode;
const M=typeof module!=='undefined'?require('./mixed-transition'):root.HexMixedTransition;
const V=typeof module!=='undefined'?require('./hard-motion'):root.HexHardMotion;
const TAU=Math.PI*2;
const START=60,TRAVEL=(1250-66)/360;
const wrap=x=>(x%TAU+TAU)%TAU;
function rng(seed){let s=(seed^0x6a5d4e31)>>>0;return ()=>{s=(s+0x6d2b79f5)>>>0;let v=Math.imul(s^s>>>15,1|s);v^=v+Math.imul(v^v>>>7,61|v);return ((v^v>>>14)>>>0)/4294967296}}
/* [video start, video end, [source-relative seconds, safe-lane shift,
 * blocked relative lane numbers (1..5), wall thickness]] */
const RAW=[
 [61.1,64.8,[[0,0,[1,2,3,4],45],[.75,0,[1,2,3,4,5],54],[1.50,0,[1,3,4],42],[2.26,1,[1,2,3,4],63],[3.10,1,[1,2,3,4],42]]],
 [64.9,68.9,[[0,0,[2,3,4,5],58],[.67,0,[1,2,3],47],[1.36,0,[1,3,5],23],[2.21,1,[1,2,4],36],[3.04,1,[1,2,3,4,5],104]]],
 [69.1,72.7,[[0,0,[1,2,3,4],28],[.43,0,[1,2,3,4],25],[.88,0,[1,2,3,4],26],[1.55,1,[1,2,4],39],[2.55,1,[1,3,4],31]]],
 [72.9,77.4,[[0,0,[1,3],31],[.63,0,[1,3],28],[1.26,0,[1,2,3],41],[2.10,1,[1,2,3,4,5],66],[3.18,1,[1,2,3,4],59],[3.74,1,[1,2,3,4],28]]],
 [77.6,81.8,[[0,0,[1,2,3,4],49],[.79,0,[1,2,3,4],52],[1.46,1,[1,3,5],22],[2.21,1,[1,2,4,5],35],[3.30,1,[1,2,3,4],45]]],
 [82.0,86.5,[[0,0,[1,3,5],23],[.58,0,[1,3,5],24],[1.18,0,[1,2,3,4,5],68],[2.19,1,[1,2,3,4],37],[3.13,1,[1,2,3,4,5],68]]],
 [86.7,91.0,[[0,0,[1,2,3,4],63],[.69,0,[1,2,3,4],48],[1.43,0,[1,2,3,4,5],98],[2.43,1,[1,3,5],25],[3.45,1,[1,2,3,4],44]]],
 [91.2,95.9,[[0,0,[1,2,3,4],53],[.53,0,[1,2,3,4],51],[1.08,0,[1,2,3,4],46],[1.65,0,[1,2,3,4],44],[2.43,1,[1,2,3,4,5],89],[3.35,1,[1,2,3],40]]],
 [96.2,100.5,[[0,0,[1,2,4],27],[.72,0,[1,2,4],30],[1.47,1,[1,2,3,4,5],76],[2.33,1,[1,2,3,4],43],[3.37,1,[1,3,4],31]]],
 [100.7,105.3,[[0,0,[1,2,3,4],52],[.71,0,[1,2,3,4],43],[1.45,1,[1,2,3,4],50],[2.27,1,[1,3,5],25],[3.33,1,[1,2,3,4,5],103]]],
 [105.6,110.3,[[0,0,[1,2,4],31],[.52,0,[1,2,4],29],[1.04,0,[1,2,3,4],43],[1.87,1,[1,2,3,4],43],[2.70,1,[1,2,3,4],44],[3.54,1,[1,2,3,4],58]]],
 [110.6,114.8,[[0,0,[1,2,3,4],52],[.68,0,[1,2,3,4],60],[1.37,0,[1,2,3,4],51],[2.12,1,[1,2,3,4,5],102],[3.06,1,[1,2,3,4],57]]]
];
const PARTS=RAW.map((v,i)=>({id:'H2-'+String(i+1).padStart(2,'0'),start:v[0],end:v[1],events:v[2]}));
/* Source-derived approximate morphs and spin reversal/tilt events.
 * Schedules are time-driven and independent of the random clip order. */
const SHAPES=[[60.45,6],[67.2,5],[72.0,4],[76.8,5],[80.7,4],[85.1,5],[91.2,6],[98.8,5],[104.8,4],[111.4,5]];
const CAMERA=[[60,1,.02],[64.9,-1,-.38],[69.6,1,.41],[73.1,-1,-.35],[77.6,1,.46],[81.5,-1,-.43],[85.8,1,.31],[90.5,-1,-.36],[94.7,1,.42],[98.8,-1,-.30],[103.7,1,.39],[108.8,-1,-.41],[112.3,1,.28]];
function appendSchedule(before,events,duration,parse){
 const copy=before.filter(x=>(Array.isArray(x)?x[0]:x.at)<START).map(x=>Array.isArray(x)?x.slice():{...x});
 for(let cycle=0;cycle*54<duration-START;cycle++)for(const e of events){
  const t=e[0]+54*cycle;if(t<duration)copy.push(parse(t,e));
 }
 return copy.sort((a,b)=>(Array.isArray(a)?a[0]:a.at)-(Array.isArray(b)?b[0]:b.at));
}
function makeActor(w){return {...w,actors:w.sectors.flatMap(s=>M.panels(w.sides,s).map(([a,b],i)=>({
 id:w.id+':'+s+':'+i,waveId:w.id,band:'main',sector:s,sides:w.sides,
 thickness:w.profiles[s].thickness,offset:0,mixedStart:a,mixedEnd:b,hardPanel:true,
 renderPoly:[[0,0],[0,0],[0,0],[0,0]]
}))) };}
function createContinuation(g){
 const original=g.timeline,limit=H.wallClock(START,original.shapeSchedule);
 // Preserve every actor that was actually born by 60s, even if still far out.
 const old=g._actors.filter(w=>w.start<=limit+1e-9);
 const schedule=appendSchedule(original.shapeSchedule,SHAPES,original.duration,(t,e)=>[t,e[1]]);
 // Existing task-1 walls remain visible at the 60-second handoff.
 // Choose the first actual task-2 shape change only after those rings
 // clear the player's collision orbit. Do this ONCE at setup; no
 // mid-play movement or teleportation of existing geometry.
 const firstChanged=schedule.findIndex((e,i)=>i>0&&e[0]>=START&&e[1]!==schedule[i-1][1]);
 if(firstChanged>=0){
  const nominal=schedule[firstChanged][0],baseClock=H.wallClock(START,schedule);
  let proposed=nominal;
  for(let guard=0;guard<150;guard++){
   const clock=baseClock+(proposed-START);
   const danger=old.some(w=>{
    if(w.start>clock||w.end<=clock)return false;
    const r=w.r-w.speed*(clock-w.start);
    if(r>200)return false;
    return w.actors.some(a=>r+a.offset+a.thickness>=46);
   });
   if(!danger)break;
   proposed+=.06;
  }
  const shift=proposed-nominal;
  if(shift>1e-8)for(let i=firstChanged;i<schedule.length;i++)schedule[i][0]+=shift;
 }
 const groups=appendSchedule(original.groups,CAMERA,original.duration,(t,e)=>({at:t,rate:e[1],tilt:e[2],post60:true}));
 const prev=old.reduce((a,b)=>b.impact>a.impact?b:a,{impact:60,thickness:50,safeAngle:g.angle});
 let cursor=Math.max(60.45,prev.impact+(prev.thickness+140)/360+.27);
 while(H.wallClock(cursor,schedule)-TRAVEL<=limit+.05)cursor+=.1;
 const random=rng(original.seed>>>0),waves=[],order=[];
 let bag=[],recent=-1,serial=0,exitAngle=Number.isFinite(prev.safeAngle)?prev.safeAngle:g.angle;
 function refill(){bag=PARTS.map((_,i)=>i);for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}}
 while(cursor<original.duration-4&&serial<18000){
  if(!bag.length)refill();
  let idx=bag.pop();if(idx===recent&&bag.length){bag.unshift(idx);idx=bag.pop()}
  const p=PARTS[idx],first=cursor;let last=null,extraLag=0;
  let baseGap=Math.floor(wrap(exitAngle)/TAU*H.shapeAt(first,schedule).to);
  for(let j=0;j<p.events.length;j++){
   const [offset,turn,mask,width]=p.events[j];
   let impact=first+offset+extraLag;
   // If a wall would cross the collision orbit while the polygon is
   // morphing, delay it BEFORE birth. Continue the rest of this part
   // with the same added pause; never pop a wall already on screen.
   for(let pass=0;pass<25;pass++){
    const before=impact;
    for(let i=1;i<schedule.length;i++){
     const a=schedule[i][0];
     if(a<impact-2.5)continue;if(a>impact+2.5)break;
     if(schedule[i][1]===schedule[i-1][1])continue;
     const earliest=a-width/360-.35,latest=a+H.MORPH_SECONDS+.18+.60;
     if(impact>=earliest&&impact<latest)impact=latest;
    }
    if(impact-before<1e-8)break;
   }
   extraLag+=impact-(first+offset+extraLag);
   if(impact>=original.duration)break;
   const sides=H.shapeAt(impact,schedule).to;
   if(j===0)baseGap=Math.floor(wrap(exitAngle)/TAU*sides);
   const gap=((baseGap+turn)%sides+sides)%sides;
   const sectors=[...new Set(mask.map(k=>(gap+1+Math.floor((k-1)*(sides-1)/5))%sides))].sort((a,b)=>a-b);
   const start=H.wallClock(impact,schedule)-TRAVEL;
   const profiles=Object.fromEntries(sectors.map(s=>[s,{thickness:width,offset:0}]));
   last={id:1000000+serial++,partId:p.id,partEvent:j,sourceVideo:'1557(7).mp4',
    sourceVideoSeconds:p.start+offset,sourcePartStart:p.start,sourcePartEnd:p.end,
    sides,sectors,profiles,safeSector:gap,safeAngle:(gap+.5)*TAU/sides,
    impact,r:1250,speed:360,thickness:width,start,
    end:start+(1250+width-26)/360};
   waves.push(last);
  }
  if(!last)break;
  order.push({id:p.id,at:first,sourceStart:p.start,sourceEnd:p.end,count:p.events.length});
  exitAngle=last.safeAngle;
  cursor=last.impact+Math.max(.55,(last.thickness+95)/360+.22);
  recent=idx;
 }
 g.timeline={...original,mode:'hard-rules-post60',shapeSchedule:schedule,groups,
   waves:old.concat(waves),post60Parts:order,post60Source:'1557(7).mp4 01:01-01:55'};
 g._actors=old.concat(waves.map(makeActor)).sort((a,b)=>a.start-b.start);
 g._cursor=0;g._active=[];g._lastClock=-Infinity;
 g._post60Active=true;g._post60RotationStart=g.rotation;g.sampleWalls();
 return {preserved:old.length,generated:waves.length,parts:order.length};
}
function motionAt(t,base){
 const quant=Math.max(60,Math.floor(t*60)/60),span=quant-60;
 let rotate=base;
 function integrate(length){
  for(let i=0;i<CAMERA.length;i++){
   const begin=CAMERA[i][0]-60,end=i+1<CAMERA.length?CAMERA[i+1][0]-60:54;
   const dt=Math.max(0,Math.min(length,end)-begin);
   if(dt)rotate+=CAMERA[i][1]*Math.PI*V.CLOCK_RATE*dt;
  }
 }
 const full=Math.floor(span/54);
 for(let k=0;k<full;k++)integrate(54);
 integrate(span-full*54);
 const phase=60+span%54;let event=CAMERA[0];
 for(const e of CAMERA){if(e[0]>phase)break;event=e}
 return {rotation:rotate,rate:event[1]*Math.PI*V.CLOCK_RATE};
}
function cameraAt(g,rotation,zoom){
 const m=V.cameraAt(g.time,rotation,zoom,g.timeline.groups);
 if(!g._post60Active||g.dead)return m;
 const beat=g.time/V.CLOCK_RATE*130/60,phase=((beat%1)+1)%1;
 const pulse=Math.exp(-phase*12),frame=Math.floor(g.time*60);
 m[4]=Math.round(((frame%2)*2-1)*7*pulse)/2;
 m[5]=Math.round(((frame*3)%5-2)*2.6*pulse)/2;
 return m;
}
class HardGame extends H.HardGame{
 update(dt,input=0){
  if(this.dead||this.timelineEnded)return;
  super.update(dt,input);
  if(!this._post60Active&&this.time>=60&&!this.dead)createContinuation(this);
  if(this._post60Active&&!this.dead){
   const scene=motionAt(this.time,this._post60RotationStart);
   this.rotation=scene.rotation;this.rotationSpeed=scene.rate;
   this.tilt=Math.acos(V.viewState(this.time,this.timeline.groups.filter(x=>x.post60)).compression);
  }
 }
}
const API={HardGame,PARTS,SHAPES,CAMERA,createContinuation,motionAt,cameraAt};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexHardPost60=API;
})(typeof window!=='undefined'?window:globalThis);
