/* 1-2: unpack user-film traced vector wall snapshots.
   Each frame carries observed screen contours plus separately estimated
   background camera angle/core-scale. No previous wall generator is used. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HexReplay=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const cache=new Map();
 let paletteCache=null;
 function fromBase64(text){
  const raw=String(text).trim();
  if(typeof atob==='function')return Uint8Array.from(atob(raw),ch=>ch.charCodeAt(0));
  if(typeof Buffer==='function')return Uint8Array.from(Buffer.from(raw,'base64'));
  throw new Error('Base64 not supported');
 }
 async function inflate(text){
  if(typeof DecompressionStream!=='function')throw new Error('deflate decoding is not supported');
  const bytes=fromBase64(text);
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
 }
 // Track connected visible contours between consecutive original source frames.
 // This is an estimate; split/merge events legitimately terminate tracks.
 function trackFrames(frames,source,fps,rate){
  let serial=0,previous=[],matched=0,total=0;
  function describe(w){
   const pts=w.points,n=pts.length;
   let cx=0,cy=0,twiceArea=0;
   for(let i=0;i<n;i++){
    const a=pts[i],b=pts[(i+1)%n];
    cx+=a[0]/n;cy+=a[1]/n;
    twiceArea+=a[0]*b[1]-a[1]*b[0];
   }
   return {w,center:[cx,cy],area:Math.sqrt(Math.max(1,Math.abs(twiceArea)/2))};
  }
  for(const frame of frames){
   const now=frame.walls.map(describe),candidates=[];
   for(const before of previous)for(const after of now){
    const distance=Math.hypot(before.center[0]-after.center[0],before.center[1]-after.center[1]);
    const radius=Math.max(Math.hypot(...before.center),Math.hypot(...after.center));
    const scale=Math.max(before.area,after.area);
    const score=distance/(10+.15*radius+.15*scale)+
      Math.abs(Math.log(after.area/before.area))*.8;
    if(score<1.5)candidates.push({score,before,after});
   }
   candidates.sort((a,b)=>a.score-b.score);
   const oldUsed=new Set(),newUsed=new Set();
   for(const pair of candidates){
    if(oldUsed.has(pair.before)||newUsed.has(pair.after))continue;
    oldUsed.add(pair.before);newUsed.add(pair.after);
    pair.after.w.id=pair.before.w.id;
    const dx=pair.after.center[0]-pair.before.center[0];
    const dy=pair.after.center[1]-pair.before.center[1];
    pair.after.w.estimatedVelocity=[dx*fps/rate,dy*fps/rate];
    matched++;
   }
   for(const item of now){
    total++;
    if(!item.w.id)item.w.id='video-'+source+'-actor-'+(++serial);
   }
   previous=now;
  }
  return Object.freeze({matched,total,matchRatio:total?matched/total:0,actorTracks:serial});
 }
 function parse(bytes, info={}){
  if(bytes.length<14)throw new Error('HXRF data is too small');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let p=0;
  function requireBytes(n){if(p+n>bytes.length)throw new Error('Truncated HXRF frame at byte '+p);}
  function u8(){requireBytes(1);return view.getUint8(p++);}
  function u16(){requireBytes(2);const n=view.getUint16(p,true);p+=2;return n;}
  function u32(){requireBytes(4);const n=view.getUint32(p,true);p+=4;return n;}
  function i32(){requireBytes(4);const n=view.getInt32(p,true);p+=4;return n;}
  function magic(){return String.fromCharCode(u8(),u8(),u8(),u8());}
  if(magic()!=='HXRF'||u8()!==1)throw new Error('Invalid HEXAGON replay header');
  const fps=u8(),count=u32(),w=u16(),h=u16();
  if(fps<1||fps>60||count<1||count>30000||w!==480||h!==300)
   throw new Error('Invalid HEXAGON replay metadata');
  const frames=[];
  for(let f=0;f<count;f++){
   const angle=i32()/10000,sides=u8(),zoom=u16()/1000,n=u8();
   if(sides<3||sides>12||zoom<.5||zoom>1.6||n>255)
    throw new Error('Invalid replay frame geometry at '+f);
   const c=Math.cos(angle),s=Math.sin(angle);
   function verts(){
    const size=u8(),out=[];
    if(size<3||size>255)throw new Error('Invalid vertex count');
    for(let k=0;k<size;k++){
     const px=u16(),py=u16(),x=px*2-w,y=py*2-h;
     out.push([(c*x+s*y)/zoom,(-s*x+c*y)/zoom]);
    }
    return out;
   }
   const walls=[];
   function sourcePlayerFragment(points){
    // Source frames also contain the filmed player's small bright triangle
    // and tiny center-core fragments. Neither is a descending wall.
    // Recover the original 480x300 source-pixel radius and polygon area
    // from the inverse-camera coordinates; rotation preserves both.
    if(points.length>10)return false;
    const radius=Math.max(...points.map(([x,y])=>Math.hypot(x,y)))*zoom/2;
    if(radius>52)return false;
    let area=0;
    for(let k=0;k<points.length;k++){
     const a=points[k],b=points[(k+1)%points.length];
     area+=a[0]*b[1]-a[1]*b[0];
    }
    const sourceArea=Math.abs(area)*zoom*zoom/8;
    return sourceArea<=65;
   }
   for(let i=0;i<n;i++){
    const points=verts(),holes=[];
    const holeCount=u8();
    for(let j=0;j<holeCount;j++)holes.push(verts());
    if(sourcePlayerFragment(points))continue;
    walls.push({id:'trace-'+f+'-'+i,sourceFrame:f,points,holes});
   }
   frames.push({angle,sides,zoom,walls});
  }
  if(p!==bytes.length)throw new Error('Unexpected trailing HXRF data');
  const rate=Number(info.gameRate)||1.04;
  const trackStats=trackFrames(frames,info.id||'unknown',fps,rate);
  return {fps,frames,trackStats,id:info.id||'',gameRate:rate,
   gameStartOffset:Number(info.gameStartOffset)||0,sourceStart:Number(info.videoStart)||0,
   sourceEnd:Number(info.videoEnd)||0};
 }
 async function decode(text,info={}){
  return parse(await inflate(text),info);
 }
 async function load(id,info){
  const tag=String(id);
  if(!['1595','1596'].includes(tag)||!info||!info.path)
    throw new Error('Unknown reference video');
  if(!cache.has(tag)){
   const promise=fetch(info.path).then(r=>{if(!r.ok)throw new Error('Reference geometry '+r.status);return r.text()})
    .then(text=>decode(text,{...info,id:tag}));
   cache.set(tag,promise);promise.catch(()=>cache.delete(tag));
  }
  return cache.get(tag);
 }
 async function loadPalette(id){
  if(!['1595','1596'].includes(String(id)))throw new Error('Unknown palette source');
  if(!paletteCache){
   paletteCache=fetch('data/hexagon-palettes.json')
     .then(r=>{if(!r.ok)throw new Error('Palette '+r.status);return r.json();});
   paletteCache.catch(()=>{paletteCache=null});
  }
  const data=await paletteCache;
  const entry=data[String(id)];
  if(!entry||!Array.isArray(entry.colors)||entry.colors.length<100)
    throw new Error('Incomplete palette transcript');
  return entry;
 }
 return Object.freeze({decode,load,loadPalette});
});
