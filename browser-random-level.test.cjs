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
  assert.equal(starts.kind,'normal-pattern');
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
  assert.deepEqual(retry.layout,starts.layout,'normal wall order must be fixed on retry');
  await page.evaluate(()=>{
   records[6]=17.65;recordsMode2[6]=22.5;save();
   setControlMode(2);
  });
  const m2=await page.evaluate(()=>({mode:settings.controlMode,level:game.level,
   kind:game.timeline.kind,one:records[6],two:recordsMode2[6]}));
  assert.deepEqual(m2,{mode:2,level:6,kind:'normal-pattern',one:17.65,two:22.5});
  await page.reload();await page.waitForFunction(()=>window.HexRandomWaves?.create);
  assert.deepEqual(await page.evaluate(()=>({mode:settings.controlMode,one:records[6],two:recordsMode2[6]})),
   {mode:2,one:17.65,two:22.5});
  // A reload clears the normal source cache; use the real async loader.
  await page.evaluate(async()=>{await loadTimeline(6)});
  // Real canvas: verify the seventh stage uses the animated camera rather
  // than the old identity reference transform, and that the core morphs.
  const visuals=await page.evaluate(()=>{
   selected=6;settings.motion=true;screen='play';
   game=new HexEngine.Game(6,HexRandomWaves.create(77));
   game.time=20.2;game.sampleWalls();
   const morph={from:game.fromSides,to:game.sides,progress:game.morph};
   game.referenceCamera=null;game.rotation=0;game.tilt=0;game.zoom=1;
   draw();const original=document.querySelector('#game').toDataURL();
   game.rotation=1.1;game.tilt=.25;draw();
   const moved=document.querySelector('#game').toDataURL();
   const shapes=[];
   for(const t of [9.8,20.2,20.8,26.95,36.4,43.2,49.9,55.5]){
    game.time=t;game.sampleWalls();
    shapes.push([t,game.fromSides,game.sides,game.morph]);
    draw();
   }
   return {different:original!==moved,morph,shapes};
  });
  assert(visuals.different,'random-level camera rotation and tilt must visibly affect canvas');
  assert.deepEqual([visuals.morph.from,visuals.morph.to],[6,5]);
  assert(visuals.morph.progress>0&&visuals.morph.progress<1);
  assert.deepEqual(visuals.shapes.map(v=>v[2]),[6,5,5,4,5,4,5,6]);
  // Decode and play every actual bundled song through the stage-seven path.
  const audioPaths=new Set();page.on('request',r=>{if(r.url().includes('/music/'))audioPaths.add(r.url().split('/').pop())});
  await page.evaluate(()=>{selected=6;game=new HexEngine.Game(6,HexRandomWaves.create(1));screen='play'});
  await page.locator('#game').click({position:{x:480,y:300}});
  const songs=await page.evaluate(async()=>{
   screen='paused';await music.unlock();
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
  await page.evaluate(()=>music.stop());
  // Capture the actual canvas through the scheduled transitions in Chromium.
  fs.mkdirSync('wall-browser-screenshots',{recursive:true});
  for(const t of [9.8,10.2,20.2,26.95,36.4,43.2,50.8,55.5,58]){
   await page.evaluate(t=>{
    window.__freezeAudit=true;transition=null;launch=null;flash=0;
    selected=6;settings.motion=true;settings.sound=false;screen='play';
    game=new HexEngine.Game(6,HexRandomWaves.create(1));
    for(let i=0;i<Math.floor(t*60);i++){game.dead=false;game.update(1/60,0)}
    game.dead=false;game.time=t;game.sampleWalls();game.referenceCamera=null;
    screen='play';draw();
   },t);
   await page.screenshot({path:'wall-browser-screenshots/random-'+t+'.png'});
  }
  assert.deepEqual(errors,[],'no runtime browser errors');
  console.log('PASS random seventh-stage menu/selection, fixed normal patterns and random music, real canvas walls and persistent mode-specific records');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
