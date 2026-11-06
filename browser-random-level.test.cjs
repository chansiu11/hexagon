'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:600}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=fn=>raf(t=>{if(!window.__freezeAudit)fn(t)})});
  await page.goto(process.env.HEXAGON_URL||'http://127.0.0.1:4173/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.HexRandomWaves?.create&&window.HexEngine?.levels?.length===7);
  // A save from the previous six-stage version must migrate in both modes.
  await page.evaluate(()=>localStorage.setItem('hexagon-web-v2',JSON.stringify({
   records:[1,2,3,4,5,6],recordsMode2:[6,5,4,3,2,1],
   settings:{sound:false,motion:false,controlMode:1}
  })));
  await page.reload();await page.waitForFunction(()=>window.HexRandomWaves?.create&&levels.length===7);
  const migrated=await page.evaluate(()=>({one:[...records],two:[...recordsMode2]}));
  assert.deepEqual(migrated.one,[1,2,3,4,5,6,0]);
  assert.deepEqual(migrated.two,[6,5,4,3,2,1,0]);
  await page.evaluate(()=>{change('select');selected=0;choose(-1)});
  assert.equal(await page.evaluate(()=>selected),6,'stage-select must wrap to the seventh stage');
  assert.equal(await page.evaluate(()=>unlocked(6)),true,'new stage should be immediately playable');
  const starts=await page.evaluate(async()=>{
   await start();
   return {screen,level:game.level,kind:game.timeline.kind,
    seed:game.timeline.seed,layout:game.timeline.waves.map(w=>[w.id,w.start,w.sides,w.sectors]),
    waves:game.timeline.waves.length};
  });
  assert.equal(starts.screen,'play');
  assert.equal(starts.level,6);
  assert.equal(starts.kind,'mixed-pattern');
  assert(starts.waves>=20);
  await page.evaluate(()=>{
   game.time=2;
   game.sampleWalls();
   assertRandomVisible=game.walls.length;draw();
  });
  assert(await page.evaluate(()=>window.assertRandomVisible)>0,'random stage must paint incoming walls');
  const retry=await page.evaluate(async()=>{
   change('over');await start();
   return {screen,seed:game.timeline.seed,layout:game.timeline.waves.map(w=>[w.id,w.start,w.sides,w.sectors])};
  });
  assert.equal(retry.screen,'play');
  assert.notDeepEqual(retry.layout,starts.layout,'retry must remix existing patterns');
  await page.evaluate(()=>{
   records[6]=17.65;recordsMode2[6]=22.5;save();
   setControlMode(2);
  });
  const m2=await page.evaluate(()=>({mode:settings.controlMode,level:game.level,
   kind:game.timeline.kind,one:records[6],two:recordsMode2[6]}));
  assert.deepEqual(m2,{mode:2,level:6,kind:'mixed-pattern',one:17.65,two:22.5});
  await page.reload();await page.waitForFunction(()=>window.HexRandomWaves?.create);
  assert.deepEqual(await page.evaluate(()=>({mode:settings.controlMode,one:records[6],two:recordsMode2[6]})),
   {mode:2,one:17.65,two:22.5});
  const visuals=await page.evaluate(()=>{
   selected=6;settings.motion=true;screen='play';transition=null;launch=null;flash=0;
   const data=HexRandomWaves.create(77);
   game=new HexEngine.Game(6,data);
   const initialTilt=game.tilt;
   const hold=[];
   for(const offset of [0,.325,.65]){
    game.time=data.shapeSchedule[1][0]+offset;game.sampleWalls();draw();
    hold.push({clock:game.wallMotionTime,radii:game.walls.map(w=>[w.id,w.r]),progress:game.morph,core:game.mixedCorePoints.map(p=>p.slice())});
   }

   game.time=data.shapeSchedule[1][0]+.2;game.sampleWalls();
   const morph={from:game.fromSides,to:game.sides,progress:game.morph};
   game.referenceCamera=null;game.rotation=0;game.tilt=0;game.zoom=1;
   draw();const original=document.querySelector('#game').toDataURL();
   game.musicRotation=1.1;game.musicMotion={shakeX:3,shakeY:-2};draw();
   const moved=document.querySelector('#game').toDataURL();
   const matrices={};
   const wall=drawWallField,core=drawCore,player=HexEngine.playerPoly;
   drawWallField=function(...args){matrices.walls=Array.from(ctx.getTransform().toFloat64Array());return wall(...args)};
   drawCore=function(...args){matrices.core=Array.from(ctx.getTransform().toFloat64Array());return core(...args)};
   // The lexical playerPoly is immutable; capture its actual final fill by
   // wrapping polygon only for the triangle matching the player's vertices.
   const poly=polygon;
   polygon=function(points,...args){if(points.length===3&&points.every(([x,y])=>Math.hypot(x,y)<85))matrices.player=Array.from(ctx.getTransform().toFloat64Array());return poly(points,...args)};
   draw();drawWallField=wall;drawCore=core;polygon=poly;
   const shapes=[];
   for(const[at,n]of data.shapeSchedule.slice(1)){
    game.time=at+.2;game.sampleWalls();shapes.push([game.sides,n,game.morph]);
   }
   return {hold,different:original!==moved,morph,expected:data.shapeSchedule[1][1],initialTilt,matrices,shapes};
  });
  assert(visuals.different,'music camera shake and rotation must visibly affect canvas');
  assert.deepEqual(visuals.hold[0].radii,visuals.hold[1].radii);
  assert.deepEqual(visuals.hold[0].radii,visuals.hold[2].radii,'walls stay radially frozen across the full browser morph');
  assert.deepEqual(visuals.hold.map(v=>Math.round(v.progress*100)),[0,50,100]);
  assert.notDeepEqual(visuals.hold[0].core,visuals.hold[1].core);
  assert.notDeepEqual(visuals.hold[1].core,visuals.hold[2].core,'the core keeps morphing while wall descent is paused');

  assert(Math.abs(visuals.initialTilt)>.06,'random initial tilt must be present on the first frame');
  assert.deepEqual([visuals.morph.from,visuals.morph.to],[6,visuals.expected]);
  assert(visuals.morph.progress>0&&visuals.morph.progress<1);
  assert(visuals.shapes.every(v=>v[0]===v[1]&&v[2]>0&&v[2]<1));
  assert.deepEqual(visuals.matrices.walls,visuals.matrices.core,'walls and core must share one camera transform');
  assert.deepEqual(visuals.matrices.walls,visuals.matrices.player,'player must share the wall camera transform');
  // Decode and play every actual bundled song through the stage-seven path.
  const audioPaths=new Set();page.on('request',r=>{if(r.url().includes('/music/'))audioPaths.add(r.url().split('/').pop())});
  await page.evaluate(()=>{selected=6;game=new HexEngine.Game(6,HexRandomWaves.create(1));screen='play'});
  await page.locator('#game').click({position:{x:480,y:300}});
  const songs=await page.evaluate(async()=>{
   screen='paused';music.setEnabled(true);await music.unlock();
   const representatives=new Map();
   for(let seed=1;seed<=100;seed++){const d=HexRandomWaves.create(seed);representatives.set(d.musicTrack.index,d)}
   const rows=[];
   for(const [index,d]of representatives){
    music.randomTrackIndex=index;
    const buffer=await music.load(6);
    rows.push({key:d.musicTrack.key,duration:buffer.duration,bpm:d.musicTrack.bpm});
   }
   music.randomTrackIndex=2;music.play(6,7.5);
   return rows;
  });
  assert.equal(songs.length,3);
  assert.deepEqual(await page.evaluate(()=>[...music.buffers.keys()].sort()),['courtesy','focus','otis']);
  assert(songs.every(s=>s.duration>60&&s.bpm>=130));
  await page.waitForFunction(()=>music.source&&music.level===6&&music.position>=7.5);
  assert.deepEqual(songs.map(s=>s.key).sort(),['courtesy','focus','otis']);
  for(const index of [0,1,2]){
   await page.evaluate(index=>{music.randomTrackIndex=index;music.play(6,7.5)},index);
   await page.waitForFunction(()=>{if(!music.source)return false;music.visualZoom(1/60);return music.motionFeatures().energy>.01});
   const features=await page.evaluate(()=>music.motionFeatures());
   assert(features.active&&features.energy>.01&&Number.isFinite(features.brightness),'live MP3 samples must drive musical motion');
  }
  await page.evaluate(()=>music.stop());
  // A slow first song must keep the run at zero until real audio is ready.
  const delayedTrack=await page.evaluate(()=>{
   window.__savedTimelineLoader=loadTimeline;
   loadTimeline=async()=>HexRandomWaves.create(77);
   const d=HexRandomWaves.create(77);music.buffers.delete(d.musicTrack.key);
   selected=6;screen='select';settings.sound=true;settings.motion=false;music.stop();
   return d.musicTrack.key;
  });
  let releaseDownload,requestStarted;
  const blocked=new Promise(resolve=>{requestStarted=resolve});
  const release=new Promise(resolve=>{releaseDownload=resolve});
  const songRoute='**/assets/music/'+delayedTrack+'.mp3';
  await page.route(songRoute,async route=>{requestStarted();await release;await route.continue()});
  await page.evaluate(()=>{window.__delayedStart=start()});
  await blocked;
  const before=await page.evaluate(()=>({screen,starting,time:game.time,loaded:!!music.source}));
  await page.waitForTimeout(650);
  const during=await page.evaluate(()=>({screen,starting,time:game.time,loaded:!!music.source}));
  assert.deepEqual(during,before,'loading cannot enter gameplay or advance game time');
  assert.equal(during.screen,'select');assert(during.starting&&!during.loaded);
  releaseDownload();
  const ready=await page.evaluate(async()=>{
   await window.__delayedStart;await Promise.resolve();
   return {screen,time:game.time,position:music.position,loaded:!!music.source,state:music.context.state};
  });
  assert.equal(ready.screen,'play');assert.equal(ready.time,0);
  assert(ready.loaded&&ready.state==='running'&&ready.position<.1,'audio is running from its opening when gameplay begins');
  await page.unroute(songRoute);
  await page.evaluate(()=>{loadTimeline=window.__savedTimelineLoader;settings.sound=false;music.stop()});
  // Capture the actual canvas through the scheduled transitions in Chromium.
  fs.mkdirSync('wall-browser-screenshots',{recursive:true});
  const captureTimes=await page.evaluate(()=>{const d=HexRandomWaves.create(1),at=d.shapeSchedule[1][0];return [...new Set([.05,3,at+.01,at+.325,at+.649,at+.74,...d.shapeSchedule.slice(1).map(([t])=>t+.2),58])].sort((a,b)=>a-b)});
  for(const t of captureTimes){
   await page.evaluate(t=>{
    window.__freezeAudit=true;transition=null;launch=null;flash=0;
    selected=6;settings.motion=true;settings.sound=false;screen='play';
    game=new HexEngine.Game(6,HexRandomWaves.create(1));
    for(let i=0;i<Math.floor(t*60);i++){const before=game.rotation;game.dead=false;game.update(1/60,0);HexMusicMotion.apply(game,1/60,game.rotation-before,{active:true,energy:.15,bass:.08,brightness:.5,pulse:Math.exp(-((game.time*game.timeline.musicTrack.bpm/60)%1)*9)},true)}
    game.dead=false;game.time=t;game.sampleWalls();game.referenceCamera=null;
    screen='play';draw();
   },t);
   await page.screenshot({path:'wall-browser-screenshots/random-'+t+'.png'});
  }
  assert.deepEqual(errors,[],'no runtime browser errors');
  console.log('PASS random seventh-stage menu/selection, mixed normal patterns, safe random morphs and music-reactive camera, real canvas walls and persistent mode-specific records');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
