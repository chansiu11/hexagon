/* HYPER HEXAGONER — exact visual silhouettes extracted at 60fps from the
 * user-supplied 1557(10).mp4 footage (06:43.467–08:08.100).
 * Contains ONLY segmented wall shapes and their original visible RGB.
 * Original order mode uses these source polygons; randomized mode retains
 * the separate playable event/phrase generator.
 * Do not treat this optical segmentation as the original game's code.
 */
(function(root){'use strict';
const START=403.466667,FPS=60,WIDTH=576,HEIGHT=360,EXPECTED=5079;
const FILE='hyper-hexagoner-filmed-walls-60fps.b64?v=source-wall-silhouettes-20261113-v1';
let frames=null,pending=null,loadError=null,frameCache=null,removedCore=0;
const PI2=Math.PI*2;
// The optical segmentation sometimes mistakes the center hexagon outline
// for a moving wall. It then renders an extra wriggling ring beside the
// live core. A real wall covers only one/few sectors, while the duplicated
// core wraps most of the central 360 degrees and is a narrow annulus.
// Reject ONLY isolated near-center full-ring contours; retain every
// outward wall wedge, including walls that reach the player's orbit.
function isCoreOutline(flat,videoSecond=Infinity){
 if(!flat||flat.length<12||flat.length%2)return false;
 let min=Infinity,max=0,xx=0,yy=0;
 const angles=[];
 for(let i=0;i<flat.length;i+=2){
  const x=flat[i]-WIDTH/2,y=flat[i+1]-HEIGHT/2;
  const r=Math.hypot(x,y);min=Math.min(min,r);max=Math.max(max,r);
  xx+=x;yy+=y;
  angles.push((Math.atan2(y,x)+PI2)%PI2);
 }
 const n=angles.length;
 // In the opening 0.55s the source's shrinking hexagon can exceed
 // a 68px radius. Its narrow full-ring outline is NOT an incoming wall.
 // Only expand this range during that known intro, never during play:
 // later full-ring wall bands must remain hittable and visible.
 const early=videoSecond>=START&&videoSecond<START+.55;
 const maxRing=early?245:68;
 if(min<18||max>maxRing||max-min>28||Math.hypot(xx/n,yy/n)>26)return false;
 angles.sort((a,b)=>a-b);
 let gap=angles[0]+PI2-angles[n-1];
 for(let i=1;i<n;i++)gap=Math.max(gap,angles[i]-angles[i-1]);
 return (PI2-gap)/PI2>.62;
}
async function load(){
 if(frames)return true;
 if(pending)return pending;
 pending=(async()=>{
  if(typeof fetch!=='function'||typeof DecompressionStream!=='function')
   throw Error('This browser cannot decode the original wall silhouettes');
  const response=await fetch(FILE,{cache:'force-cache'});
  if(!response.ok)throw Error('Reference wall data HTTP '+response.status);
  const text=(await response.text()).replace(/\s+/g,'');
  const decoded=atob(text),bytes=new Uint8Array(decoded.length);
  for(let i=0;i<decoded.length;i++)bytes[i]=decoded.charCodeAt(i);
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  const json=JSON.parse(await new Response(stream).text());
  if(json.frames?.length!==EXPECTED||json.fps!==FPS||
   json.width!==WIDTH||json.height!==HEIGHT)
   throw Error('Reference wall frames are incomplete');
  frames=json.frames;
  frameCache=new Array(EXPECTED);
  removedCore=0;
  return true;
 })().catch(error=>{loadError=error;pending=null;
  console.warn('HYPER HEXAGONER video wall atlas unavailable:',error);
  return false;});
 return pending;
}
function getFrame(videoSecond){
 if(!frames)return null;
 const frame=Math.min(frames.length-1,Math.max(0,Math.round((videoSecond-START)*FPS)));
 if(frameCache&&frameCache[frame])return frameCache[frame];
 const [rgb,allPaths]=frames[frame];
 const paths=allPaths.filter(poly=>{
  if(isCoreOutline(poly,START+frame/FPS)){removedCore++;return false}
  return true;
 });
 const clean={index:frame,rgb,paths};
 if(frameCache)frameCache[frame]=clean;
 return clean;
}
const API={load,getFrame,isCoreOutline,START,FPS,WIDTH,HEIGHT,EXPECTED,
 get removedCoreContours(){return removedCore},
 get ready(){return !!frames},get error(){return loadError},
 get loadedFrameCount(){return frames?.length||0}};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else{root.HexHyper910Atlas=API;} // Reference atlas: load explicitly for offline comparison only.
})(typeof window!=='undefined'?window:globalThis);