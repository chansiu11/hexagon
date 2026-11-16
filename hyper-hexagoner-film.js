/* Step 5-1: independent HYPER HEXAGONER chronological-source adapter.
 * Never use legacy level-5 generators, atlas data, or level-4 contours.
 * Source-specific frame arrays must be transcribed and independently verified
 * from BOTH original videos before stage 5 can start.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HyperHexagonerFilm=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const IDS=['1595','1596'],FPS=60,cache=new Map(),TAU=Math.PI*2;
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 function validPolygon(points){
  if(!Array.isArray(points)||points.length<3||points.length>256)return false;
  if(!points.every(v=>Array.isArray(v)&&v.length===2&&v.every(finite)&&v.every(n=>Math.abs(n)<=5000)))return false;
  let area=0;
  for(let i=0;i<points.length;i++){
   const [x,y]=points[i],[xx,yy]=points[(i+1)%points.length];
   area+=x*yy-y*xx;
  }
  return Math.abs(area)>1e-4;
 }
 function parse(raw,id,{allowFixture=false}={}){
  if(!IDS.includes(String(id)))throw new Error('Unknown HYPER HEXAGONER film id');
  if(!raw||raw.schemaVersion!==1||raw.stageIndex!==4||raw.id!==String(id)||
   raw.fps!==FPS||!finite(raw.videoStart)||!finite(raw.videoEnd)||
   raw.videoStart<0||raw.videoEnd<=raw.videoStart||
   !Array.isArray(raw.frames))
   throw new Error('Incomplete HYPER HEXAGONER original source chronology');
  // The recording's 60fps clock and the game's HUD clock need not run 1:1.
  // Keep the measured conversion with each independent video, rather than
  // splitting the stage at source frame 3600 unconditionally.
  const rate=raw.gameRate===undefined?1:raw.gameRate;
  const offset=raw.gameStartOffset===undefined?0:raw.gameStartOffset;
  if(!finite(rate)||rate<.5||rate>2||!finite(offset)||offset<0||offset>=5)
   throw new Error('Invalid film-to-game clock calibration');
  const boundary=Math.ceil((60-offset)*FPS/rate-1e-9);
  if(raw.frames.length<=boundary)
   throw new Error('Incomplete 0–60 and 60+ HYPER HEXAGONER chronology');
  if(raw.independentlyVerified!==true&&!allowFixture)
   throw new Error('Stage 5 chronological walls have not been verified against the film');
  if(raw.frames.length>FPS*600)throw new Error('Unexpectedly long HYPER HEXAGONER chronology');
  let total=0;
  const frames=raw.frames.map((f,i)=>{
   if(!f||!finite(f.angle)||Math.abs(f.angle)>TAU*1000||
    !finite(f.zoom)||f.zoom<.35||f.zoom>3||
    !Number.isInteger(f.sides)||f.sides<3||f.sides>12||
    !Array.isArray(f.walls)||f.walls.length>200)
    throw new Error('Invalid stage-5 frame '+i);
   const ids=new Set();
   const walls=f.walls.map((w,k)=>{
    if(!w||typeof w.id!=='string'||w.id.length<1||w.id.length>120||
     ids.has(w.id)||!validPolygon(w.points)||
     (w.holes!==undefined&&(!Array.isArray(w.holes)||!w.holes.every(validPolygon))))
     throw new Error('Invalid stage-5 wall/contour at frame '+i+' #'+k);
    ids.add(w.id);total++;
    return Object.freeze({id:'hyper5-'+id+'-'+w.id,sourceFrame:i,
     points:w.points.map(p=>Object.freeze(p.slice())),holes:(w.holes||[]).map(h=>h.map(p=>Object.freeze(p.slice())))});
   });
   return Object.freeze({angle:f.angle,zoom:f.zoom,sides:f.sides,walls:Object.freeze(walls)});
  });
  return Object.freeze({id:String(id),fps:FPS,gameRate:rate,gameStartOffset:offset,
   sourceStart:raw.videoStart,sourceEnd:raw.videoEnd,sourceFile:String(raw.sourceFile||''),
   independentlyVerified:raw.independentlyVerified===true,frames:Object.freeze(frames),
   wallPolygons:total,sourceHasFull60:frames.length>FPS*60});
 }
 function stats(film){
  if(!film||!film.frames||film.fps!==FPS)throw new Error('Invalid stage-5 recording');
  const frames=film.frames,boundary=Math.ceil((60-film.gameStartOffset)*FPS/film.gameRate-1e-9);
  if(boundary<1||boundary>=frames.length)throw new Error('Film does not cross 60 game seconds');
  let longest=0,start=-1,firstWall=-1,tracked=0,framesWithWalls=0;
  const unique=new Set();
  for(let i=0;i<frames.length;i++){
   const walls=frames[i].walls;
   if(walls.length){
    if(start>=0){longest=Math.max(longest,(i-start)/FPS*film.gameRate);start=-1;}
    if(firstWall<0)firstWall=film.gameStartOffset+i/FPS*film.gameRate;framesWithWalls++;
    for(const w of walls)unique.add(w.id);
   }else if(start<0)start=i;
  }
  if(start>=0)longest=Math.max(longest,(frames.length-start)/FPS*film.gameRate);
  const before=new Set(frames[boundary-1].walls.map(w=>w.id));
  for(const w of frames[boundary].walls)if(before.has(w.id))tracked++;
  return Object.freeze({id:film.id,gameEnd:film.gameStartOffset+(frames.length-1)/FPS*film.gameRate,
   boundaryFrame:boundary,before60Frames:boundary,after60Frames:frames.length-boundary,
   firstWallSecond:firstWall,longestNoVisibleWallSeconds:longest,
   framesWithWalls,uniqueTrackedWallIds:unique.size,carriedAcross60:tracked});
 }
 async function load(id,definition){
  id=String(id);
  if(!IDS.includes(id)||!definition?.path||!definition.sourceFile)
   throw new Error('Missing stage-5 source declaration');
  const key=id+'|'+definition.path;
  if(!cache.has(key)){
   const request=fetch(definition.path).then(r=>{
    if(!r.ok)throw new Error('Verified stage-5 video source missing: '+definition.path+' ('+r.status+')');
    return r.json();
   }).then(data=>{
    if(data.sourceFile!==definition.sourceFile)
     throw new Error('Stage-5 video source identity mismatch: '+id);
    return parse(data,id);
   });
   cache.set(key,request);
   request.catch(()=>cache.delete(key));
  }
  return cache.get(key);
 }
 return Object.freeze({parse,load,stats,FRAME_RATE:FPS});
});
