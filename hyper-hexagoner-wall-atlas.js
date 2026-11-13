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
let frames=null,pending=null,loadError=null;
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
  return true;
 })().catch(error=>{loadError=error;pending=null;
  console.warn('HYPER HEXAGONER video wall atlas unavailable:',error);
  return false;});
 return pending;
}
function getFrame(videoSecond){
 if(!frames)return null;
 const frame=Math.min(frames.length-1,Math.max(0,Math.round((videoSecond-START)*FPS)));
 const [rgb,paths]=frames[frame];
 return {index:frame,rgb,paths};
}
const API={load,getFrame,START,FPS,WIDTH,HEIGHT,EXPECTED,
 get ready(){return !!frames},get error(){return loadError},
 get loadedFrameCount(){return frames?.length||0}};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else{root.HexHyper910Atlas=API;load();}
})(typeof window!=='undefined'?window:globalThis);