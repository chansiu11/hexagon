/* Task 3-1: HEXAGONEST strict source-only admission and chronological playback.
 * This is deliberately NOT a replacement wall generator. With no measured
 * HEXAGONEST files the third stage remains unregistered / unplayable.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HexagonestSource=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const IDS=Object.freeze(['1595','1596']);
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 function fail(message){throw new Error('HEXAGONEST 3-1: '+message);}
 function checkManifest(manifest){
  if(!manifest||!manifest.recordings||typeof manifest.recordings!=='object')
   fail('verified recording manifest missing');
  const replays={};
  for(const id of IDS){
   const entry=manifest.recordings[id];
   if(!entry||typeof entry.sourceFile!=='string'||!entry.sourceFile.toLowerCase().endsWith('.mp4'))
    fail('original source filename missing: '+id);
   if(typeof entry.path!=='string'||!/^data\/hexagonest-(1595|1596)\.b64$/.test(entry.path)||
      entry.path!==('data/hexagonest-'+id+'.b64'))
    fail('non-HEXAGONEST or aliased trace path for '+id);
   if(![entry.videoStart,entry.videoEnd,entry.gameRate,entry.sampleFps,
          entry.gameStartOffset].every(finite)||
      entry.videoStart<0||entry.videoEnd<=entry.videoStart||
      entry.gameRate<=0||entry.gameRate>3||entry.sampleFps<1||
      entry.sampleFps>60||entry.gameStartOffset<0||entry.gameStartOffset>.5)
    fail('invalid film clock for '+id);
   if(entry.videoEnd-entry.videoStart<=60/entry.gameRate)
    fail('source film interval has no verified 60s+ section for '+id);
   replays[id]={path:entry.path,videoStart:entry.videoStart,videoEnd:entry.videoEnd,
    gameRate:entry.gameRate,sampleFps:entry.sampleFps,
    gameStartOffset:entry.gameStartOffset,sourceFile:entry.sourceFile};
  }
  if(replays['1595'].path===replays['1596'].path)
   fail('two videos cannot share one source trace');
  return replays;
 }
 function checkRecordings(recordings,replays,chronology){
  if(!chronology||typeof chronology.auditBoth!=='function')fail('chronology auditor missing');
  for(const id of IDS){
   const film=recordings?.[id],meta=replays[id];
   if(!film||!Array.isArray(film.frames)||film.frames.length<2)
    fail('decoded film frames missing: '+id);
   if(film.id&&String(film.id)!==id)fail('film ID differs from manifest: '+id);
   if(film.fps!==meta.sampleFps||Math.abs(film.gameRate-meta.gameRate)>1e-5||
      Math.abs(film.gameStartOffset-meta.gameStartOffset)>1e-5)
    fail('decoded timeline and source clock disagree for '+id);
   const observedEnd=meta.videoStart+(film.frames.length-1)/film.fps;
   if(Math.abs(observedEnd-meta.videoEnd)>Math.max(.15,2/film.fps))
    fail('source video range and decoded frame count disagree for '+id);
   const frameAt60=Math.ceil((60-film.gameStartOffset)/film.gameRate*film.fps-1e-9);
   if(frameAt60<1||frameAt60>=film.frames.length)
    fail('60 second boundary outside recorded frames for '+id);
   if(!film.frames.slice(0,frameAt60).some(f=>f.walls?.length)||
      !film.frames.slice(frameAt60).some(f=>f.walls?.length))
    fail('no source-observed wall in 0-60 or 60+ for '+id);
  }
  const report=chronology.auditBoth(recordings);
  if(report.source1595.endSecond<=60||report.source1596.endSecond<=60)
   fail('missing 60+ footage');
  return report;
 }
 function install({manifest,recordings,engine,chronology}){
  if(!engine||typeof engine.registerMap!=='function')fail('engine registry missing');
  const replays=checkManifest(manifest);
  const report=checkRecordings(recordings,replays,chronology);
  // The first core geometry is taken from the first decoded video, never a
  // guessed "6 sides" schedule or reused stage-0/1 data.
  const startingSides=recordings['1595'].frames[0].sides;
  if(!Number.isInteger(startingSides)||startingSides<3||startingSides>12)
   fail('invalid first observed core shape');
  if(recordings['1596'].frames[0].sides!==startingSides)
   fail('recording start shapes disagree; needs manual source alignment');
  if(engine.hasMap?.(2))fail('HEXAGONEST already installed');
  engine.registerMap(2,{
   sourceStatus:'filmed-chronological-3-1-audited-not-randomized',
   shapes:[{at:0,sides:startingSides}],walls:[],
   // Defaults for unmeasured player speed remain in the shared engine;
   // calibration belongs to recorded gameplay analysis.
   replays
  });
  return Object.freeze({ready:true,report,replays});
 }
 async function prepare(options={}){
  const loader=options.loader||((id,entry)=>globalThis.HexReplay.load(id,entry));
  const manifestUrl=options.manifestUrl||'data/hexagonest-sources.json';
  const fetcher=options.fetcher||globalThis.fetch;
  const engine=options.engine||globalThis.HexEngine;
  const chronology=options.chronology||globalThis.HexagonestChronology;
  if(typeof fetcher!=='function')return Object.freeze({ready:false,reason:'fetch unavailable'});
  let response;
  try{response=await fetcher(manifestUrl);}
  catch(e){return Object.freeze({ready:false,reason:'manifest unreachable'});}
  if(!response.ok)
   return Object.freeze({ready:false,reason:'no verified HEXAGONEST sources ('+response.status+')'});
  // A malformed, incomplete or mistaken manifest MUST fail closed.
  const manifest=await response.json();
  const replays=checkManifest(manifest);
  const values=await Promise.all(IDS.map(id=>loader(id,replays[id])));
  return install({manifest,recordings:{'1595':values[0],'1596':values[1]},engine,chronology});
 }
 return Object.freeze({IDS,checkManifest,checkRecordings,install,prepare});
});
