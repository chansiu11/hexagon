/* Task 2 — original source-video dodge-part bank.
 * Reference: user-uploaded 1557(7).mp4, 01:01.7–01:53.9.
 * Frame measurements: 1152x720/60fps footage, sampled at 10Hz;
 * bright wall-band crossings at radii 70, 85, 100, 120 (screen pixels).
 * Each token = (video time - 60)*10 . sides . visible-mask-hex . width.
 * Mask uses clockwise 0..sides-1 screen-relative angular sectors.
 * Width is estimated from bright-band dwell time on fixed radial rings.
 * These are SOURCE-ESTIMATED visual measurements, not engine-level truth.
 */
(function(root){'use strict';
const TAU=2*Math.PI,CLOCK_RATE=25/24,VIDEO_ZERO=61.1;
const PACKED=[
'17.6.3b.72,23.6.2f.47,29.6.3b.76,35.6.3e.130,46.6.24.48,52.6.f.50,58.6.37.48,66.6.2f.48',
'81.5.1b.41',
'98.5.19.55,103.5.13.63,110.5.15.75,118.5.d.80',
'131.4.6.47',
'147.4.5.73,153.4.e.44,162.4.2.100',
'180.5.16.106',
'194.5.d.68,199.5.1c.38,205.5.1d.58',
'219.4.2.41',
'235.4.1.57,245.4.5.67,250.4.1.42',
'268.5.f.113',
'281.5.f.75,286.5.d.51,294.5.4.83,299.5.b.47',
'314.6.2f.118',
'330.6.3e.47,336.6.3e.44,346.6.3e.130,350.6.2f.39,357.6.12.105,365.6.6.34,371.6.f.53,376.6.3e.54',
'393.5.8.44',
'409.5.17.40,414.5.15.42,419.5.6.45,424.5.c.44,430.5.1.39',
'444.4.5.42',
'463.4.5.92,468.4.b.43,473.4.d.52,478.4.1.33,483.4.7.52,488.4.c.40,495.4.9.130,501.4.3.70',
'517.5.1c.113,521.5.5.23',
'533.5.7.48,539.5.1e.130'
];
const CAMERA=[
 [60,1],[64.9,-1],[69.6,1],[73.1,-1],[77.6,1],[81.5,-1],
 [85.8,1],[90.5,-1],[94.7,1],[98.8,-1],[103.7,1],
 [108.8,-1],[112.3,1]
];
function referenceSpin(t){
 let a=0;
 for(let i=0;i<CAMERA.length;i++){
  const begin=CAMERA[i][0],end=i+1<CAMERA.length?CAMERA[i+1][0]:t;
  a+=Math.max(0,Math.min(t,end)-begin)*CAMERA[i][1]*Math.PI*CLOCK_RATE;
  if(t<end)break;
 }
 return a;
}
const mod=(i,n)=>(i%n+n)%n;
function visibleToNative(mask,n,t,start){
 // Subtract recorded background rotation within each original clip, so
 // moving camera alone never makes a stationary exit appear to change.
 const turn=Math.round((referenceSpin(t)-referenceSpin(start))*n/TAU);
 const sectors=[];
 for(let i=0;i<n;i++)if(mask&(1<<i))sectors.push(mod(i-turn,n));
 if(sectors.length>=n)sectors.pop();
 if(!sectors.length)sectors.push(0);
 return Object.freeze([...new Set(sectors)].sort((a,b)=>a-b));
}
const PARTS=PACKED.map((row,i)=>{
 const raw=row.split(',').map(token=>{
  const [vid,sides,mask,width]=token.split('.');
  const videoSeconds=60+Number(vid)/10;
  const gameSeconds=60+(videoSeconds-VIDEO_ZERO)*CLOCK_RATE;
  return {videoSeconds,gameSeconds,sides:+sides,screenMask:parseInt(mask,16),width:+width};
 });
 const start=raw[0].gameSeconds,sides=raw[0].sides;
 if(raw.some(e=>e.sides!==sides))throw Error('Source clip crosses native sides unexpectedly');
 const events=raw.map(e=>Object.freeze({
  offset:e.gameSeconds-start,
  sourceGameSeconds:e.gameSeconds,
  sourceVideoSeconds:e.videoSeconds,
  sides,blocked:visibleToNative(e.screenMask,sides,e.gameSeconds,start),
  screenMask:e.screenMask,width:e.width
 }));
 return Object.freeze({
  id:'H2V-'+String(i+1).padStart(2,'0'),
  originalOrder:i,originalStart:start,
  sourceVideoStart:raw[0].videoSeconds,
  sourceVideoEnd:raw.at(-1).videoSeconds,
  sides,length:events.at(-1).offset,
  events:Object.freeze(events)
 });
});
// A connected dodge run continues across brief occlusions even when the
// raw color-band detector split it into small snippets. Rejoin adjacent
// source snippets of the SAME original polygon shape. Exactly ten complete
// dodge phrases remain, corresponding to the ten source shape intervals.
const COMPLETE_PARTS=[];
for(const part of PARTS){
 const last=COMPLETE_PARTS.at(-1);
 if(last&&last.sides===part.sides){
  const offset=part.originalStart-last.originalStart;
  last.fragments.push(part.id);
  for(const e of part.events)last.events.push(Object.freeze({
   ...e,offset:e.offset+offset
  }));
  last.length=last.events.at(-1).offset;
  last.sourceVideoEnd=part.sourceVideoEnd;
 }else{
  COMPLETE_PARTS.push({
   id:'H2-C'+String(COMPLETE_PARTS.length+1).padStart(2,'0'),
   originalOrder:COMPLETE_PARTS.length,fragments:[part.id],
   sides:part.sides,originalStart:part.originalStart,
   sourceVideoStart:part.sourceVideoStart,sourceVideoEnd:part.sourceVideoEnd,
   length:part.length,events:part.events.slice()
  });
 }
}
for(const part of COMPLETE_PARTS){
 Object.freeze(part.fragments);Object.freeze(part.events);Object.freeze(part);
}
Object.freeze(COMPLETE_PARTS);
const ORIGINAL_SEQUENCE=Object.freeze(PARTS.flatMap(part=>part.events.map(e=>({
 partId:part.id,videoSeconds:e.sourceVideoSeconds,
 gameSeconds:e.sourceGameSeconds,
 mask:e.screenMask,
 blocked:e.blocked,
 sides:part.sides,
 width:e.width
}))).sort((a,b)=>a.videoSeconds-b.videoSeconds));
const API=Object.freeze({PARTS,COMPLETE_PARTS,ORIGINAL_SEQUENCE,CAMERA,referenceSpin,
 VIDEO_ZERO,CLOCK_RATE,SOURCE:'1557(7).mp4 01:01.7–01:53.9',
 CLIP_COUNT:PARTS.length,EVENT_COUNT:ORIGINAL_SEQUENCE.length});
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else root.HexHardPost60VideoParts=API;
})(typeof window!=='undefined'?window:globalThis);
