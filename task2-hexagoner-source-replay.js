/* Task 2-1: new, isolated HEXAGONER video-order replay.
 * The source samples are SCREEN-space color occupancy, NOT engine walls.
 * No stage 1 engine or legacy HEXAGONER pattern generator is imported.
 * Integrate only after the task-1 engine commit is available.
 */
(function(root) {
'use strict';
const SAMPLE_FPS = 10, SOURCE_CLOCK_RATE = 25 / 24;
const RADIO = Object.freeze([40,65,100,142]);
const EDGES = Object.freeze([27,52,82,120,168]);
const TAU = Math.PI * 2;
const clipMeta = Object.freeze({
 '1595': Object.freeze({file:'1595.mp4',start:177.96,end:275.01,frames:971,sourceSHA256:'86f9823ab680bb36c6f8416e87b4100ec93a958a886213f5652e888fba4e9b51'}),
 '1596': Object.freeze({file:'1596.mp4',start:119.30,end:223.80,frames:1045,sourceSHA256:'e415d58f955aa3b8198a98c9cfa7c593ea472f4f54f1ad0ab88b77c6ee21032d'})
});
function unpack(packed, frameIndex) {
 if (typeof packed !== 'string' || packed.length % 5) throw Error('Corrupt source samples');
 const n = packed.length / 5, i = Math.min(n-1,Math.max(0,Math.floor(frameIndex)));
 const val = parseInt(packed.slice(i*5,i*5+5),36);
 if (!Number.isSafeInteger(val)||val<0||val>=2**24) throw Error('Invalid occupancy frame '+i);
 return Object.freeze({index:i,masks:Object.freeze([val&63,(val>>>6)&63,(val>>>12)&63,(val>>>18)&63])});
}
async function unpackZlibBase64(value) {
 if(typeof value !== 'string') throw Error('Missing source archive');
 if(typeof module !== 'undefined' && module.exports)
  return require('node:zlib').inflateSync(Buffer.from(value,'base64')).toString('ascii');
 if(typeof DecompressionStream==='undefined') throw Error('Browser lacks deflate support');
 const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
 return await new Response(stream).text();
}
async function load(video, dataset) {
 const meta=clipMeta[video];
 if(!meta) throw Error('Unknown HEXAGONER video '+video);
 const archive=(dataset||root.HexagonerScreenCaptureData)?.[video];
 const samples=await unpackZlibBase64(archive);
 if(samples.length!==meta.frames*5) throw Error('Frame count mismatch for '+video);
 return Object.freeze({
  video,meta,samples,mode:'SOURCE_ORDER_NOT_RANDOM',space:'SCREEN_SPACE',quality:'approximate',
  gameDuration:(meta.end-meta.start)*SOURCE_CLOCK_RATE,
  at(gameTime) {
   if(!Number.isFinite(gameTime)) throw Error('Invalid time');
   // 60 seconds is one continuous sample stream; no restart at the split.
   const index=Math.floor(Math.max(0,gameTime)/SOURCE_CLOCK_RATE*SAMPLE_FPS+1e-9);
   const frame=unpack(samples,index);
   return Object.freeze({...frame,video,gameTime:frame.index*SOURCE_CLOCK_RATE/SAMPLE_FPS,
    videoTime:meta.start+frame.index/SAMPLE_FPS});
  }
 });
}
function drawScreenBands(ctx, frame, options={}) {
 if(!ctx||!frame||!Array.isArray(frame.masks))throw Error('Missing frame/context');
 const cx=options.centerX ?? ctx.canvas.width/2,cy=options.centerY ?? ctx.canvas.height/2;
 const scale=options.scale ?? Math.min(ctx.canvas.width/576,ctx.canvas.height/360);
 ctx.save();
 ctx.fillStyle=options.fillStyle || '#ffffff';
 for(let band=0;band<4;band++)for(let sector=0;sector<6;sector++){
  if(!(frame.masks[band]&(1<<sector)))continue;
  const a=sector*TAU/6,b=(sector+1)*TAU/6,inner=EDGES[band]*scale,outer=EDGES[band+1]*scale;
  ctx.beginPath();ctx.arc(cx,cy,outer,a,b,false);ctx.arc(cx,cy,inner,b,a,true);
  ctx.closePath();ctx.fill();
 }
 ctx.restore();
}
const api=Object.freeze({SAMPLE_FPS,SOURCE_CLOCK_RATE,RADIO,EDGES,clipMeta,unpack,load,drawScreenBands});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.HexagonerSourceReplay=api;
})(typeof window!=='undefined'?window:globalThis);
