'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 try{
  const page=await b.newPage({viewport:{width:960,height:600},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.HEXAGON_URL||'http://127.0.0.1:4173/',{waitUntil:'load'});
  await page.evaluate(()=>{window.requestAnimationFrame=()=>0});
  await page.waitForFunction(()=>window.HexHexagonest?.HexagonestGame&&typeof start==='function');
  // The real deployed Pages build must load the NEW calibration, not cached v1.
  const calibrated=await page.evaluate(()=>({
   velocities:[HexHexagonest.speedAt(20),HexHexagonest.speedAt(80),HexHexagonest.speedAt(180)],
   colors:HexHexagonest.COLOR_EVENTS?.length,
   openingHues:[3,5,7,11].map(t=>HexHexagonest.palette(t)[0]),
   spinEvents:HexHexagonest.create(19,30).spinEvents?.length,
   familyVersion:HexHexagonest.PATTERN_TRANSITION_VERSION
  }));
  assert.deepEqual(calibrated,{velocities:[460,515,505],colors:31,
   openingHues:[260,18,194,58],spinEvents:6,
   familyVersion:'video-family-v4'},'new video-calibrated pattern-continuity script must be deployed');
  const init=await page.evaluate(async()=>{
   settings.sound=false;settings.motion=true;selected=2;screen='select';launch=null;
   await start();
   return {screen,level:game.level,flag:game.hexagonestMode,kind:game.timeline.kind,
    duration:game.timeline.duration,waves:game.timeline.waves.length,controls:game.controlMode};
  });
  assert.equal(init.screen,'play');assert.equal(init.level,2);
  assert(init.flag&&init.kind==='hexagonest-video');
  assert(init.duration>=317&&init.waves>300,'317s source should extend the stage past 60s');
  // Source-informed pauses are real: a particular screenshot can be empty.
  // Verify rhythm on a deterministic 320s excerpt; the user session remains
  // randomly seeded as normal.
  const sourceRhythm=await page.evaluate(()=>{
   const d=HexHexagonest.create(137,320);
   return {count:d.waves.length,opening:d.waves.filter(w=>w.impact<60).length,
    middle:d.waves.filter(w=>w.impact>=60&&w.impact<120).length,
    late:d.waves.filter(w=>w.impact>=120).length};
  });
  assert(sourceRhythm.count>320&&sourceRhythm.count<470,'video-informed density');
  let nonempty=0;
  fs.mkdirSync('wall-browser-screenshots',{recursive:true});
  for(const t of [4,10,25,59,61,110,121,180,240,305]){
   const state=await page.evaluate(t=>{
    game.time=t;game.sampleWalls();game.rotation=t*2.0;game.referenceCamera=null;
    screen='play';launch=null;transition=null;flash=0;updatePalette(.05);draw();
    return {time:game.time,walls:game.walls.length,sides:game.sides,
      hue:displayedHue,saturation:displayedSat,lightness:displayedLight.slice(),
      finite:game.walls.every(w=>w.renderPoly&&w.renderPoly.every(p=>p.every(Number.isFinite)))};
   },t);
   assert(state.finite&&state.sides===6,'valid six-sided wall mesh at '+t+'s');
   if(state.walls>=1)nonempty++;
   // Sparse source-video intervals can legitimately show an empty arena.
   if(t>=120)assert.equal(state.saturation,0,'late monochrome mode');
   else if(t>=60)assert.equal(state.saturation,0,'grayscale after 60s');
   else assert(state.saturation>0,'colored opening');
   await page.screenshot({path:'wall-browser-screenshots/hexagonest-'+t+'s.png'});
  }
  assert(nonempty>=6,'source-paced walls should appear in most sampled frames');
  const controls=await page.evaluate(()=>{
   const results=[];
   for(const mode of [1,2,3]){
    game=new HexHexagonest.HexagonestGame(HexHexagonest.create(76,120));
    game.setControlMode(mode);results.push({mode:game.controlMode,stage:game.level,sides:game.sides,changed:mode===3?game.selectSector(3):mode===2?game.stepSector(1):true});
   }
   return results;
  });
  assert.deepEqual(controls.map(c=>c.mode),[1,2,3]);
  assert(controls.every(c=>c.stage===2&&c.sides===6&&c.changed));
  const sources=await page.evaluate(()=>{
   const a=HexHexagonest.create(1,100),b=HexHexagonest.create(2,100);
   const c=HexRandomWaves.create(3,100),d=HexHardMode.create(4,100);
   return {different:JSON.stringify(a.waves)!==JSON.stringify(b.waves),
     otherRandom:c.mode,hard:d.mode};
  });
  assert(sources.different&&sources.hard==='hard-rules');
  assert.deepEqual(errors,[],'browser console JavaScript errors');
  console.log('PASS Hexagonest 317s launch, video-paced density, ten canvas captures with natural quiet gaps, three control modes and stage isolation in Chromium');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
