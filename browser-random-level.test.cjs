'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:600}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
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
  assert.deepEqual(errors,[],'no runtime browser errors');
  console.log('PASS random seventh-stage menu/selection, new layout each attempt, real canvas walls and persistent mode-specific records');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
