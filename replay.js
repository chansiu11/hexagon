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
   for(let i=0;i<n;i++){
    const points=verts(),holes=[];
    const holeCount=u8();
    for(let j=0;j<holeCount;j++)holes.push(verts());
    walls.push({id:'trace-'+f+'-'+i,sourceFrame:f,points,holes});
   }
   frames.push({angle,sides,zoom,walls});
  }
  if(p!==bytes.length)throw new Error('Unexpected trailing HXRF data');
  return {fps,frames,id:info.id||'',gameRate:Number(info.gameRate)||1.04,
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
