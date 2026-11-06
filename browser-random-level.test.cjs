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
    seed:game.timeline.seed,layout:game.timeline.waves.map(w=>[w.safeSector,w.openings]),
    waves:game.timeline.waves.length};
  });
  assert.equal(starts.screen,'play');
  assert.equal(starts.level,6);
  assert.equal(starts.kind,'procedural-random');
  assert(starts.waves>=20);
  await page.evaluate(()=>{
   game.time=game.timeline.waves[0].impact;
   game.sampleWalls();
   assertRandomVisible=game.walls.length;draw();
  });
  assert(await page.evaluate(()=>window.assertRandomVisible)>0,'random stage must paint incoming walls');
  const retry=await page.evaluate(async()=>{
   change('over');await start();
   return {screen,seed:game.timeline.seed,layout:game.timeline.waves.map(w=>[w.safeSector,w.openings])};
  });
  assert.equal(retry.screen,'play');
  assert.notDeepEqual(retry.layout,starts.layout,'retry must change the layout');
  await page.evaluate(()=>{
   records[6]=17.65;recordsMode2[6]=22.5;save();
   setControlMode(2);
  });
  const m2=await page.evaluate(()=>({mode:settings.controlMode,level:game.level,
   kind:game.timeline.kind,one:records[6],two:recordsMode2[6]}));
  assert.deepEqual(m2,{mode:2,level:6,kind:'procedural-random',one:17.65,two:22.5});
  await page.reload();await page.waitForFunction(()=>window.HexRandomWaves?.create);
  assert.deepEqual(await page.evaluate(()=>({mode:settings.controlMode,one:records[6],two:recordsMode2[6]})),
   {mode:2,one:17.65,two:22.5});
  // Real canvas: verify the seventh stage uses the animated camera rather
  // than the old identity reference transform, and that the core morphs.
  const visuals=await page.evaluate(()=>{
   selected=6;settings.motion=true;screen='play';
   game=new HexEngine.Game(6,HexRandomWaves.create(77));
   game.time=12.2;game.sampleWalls();
   const morph={from:game.fromSides,to:game.sides,progress:game.morph};
   game.referenceCamera=null;game.rotation=0;game.tilt=0;game.zoom=1;
   draw();const original=document.querySelector('#game').toDataURL();
   game.rotation=1.1;game.tilt=.25;draw();
   const moved=document.querySelector('#game').toDataURL();
   const shapes=[];
   for(const t of [9.8,12.2,12.6,27.2,42.2,53.2]){
    game.time=t;game.sampleWalls();
    shapes.push([t,game.fromSides,game.sides,game.morph]);
    draw();
   }
   return {different:original!==moved,morph,shapes};
  });
  assert(visuals.different,'random-level camera rotation and tilt must visibly affect canvas');
  assert.deepEqual([visuals.morph.from,visuals.morph.to],[6,5]);
  assert(visuals.morph.progress>0&&visuals.morph.progress<1);
  assert.deepEqual(visuals.shapes.map(v=>v[2]),[6,5,5,6,4,5]);
  // Capture the actual canvas through the scheduled transitions in Chromium.
  fs.mkdirSync('wall-browser-screenshots',{recursive:true});
  for(const t of [9.8,10.2,12.2,27.2,42.2,45.183,53.2,58]){
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
  console.log('PASS random seventh-stage menu/selection, new layout each attempt, real canvas walls and persistent mode-specific records');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
