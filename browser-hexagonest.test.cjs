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
  const init=await page.evaluate(async()=>{
   settings.sound=false;settings.motion=true;selected=2;screen='select';launch=null;
   await start();
   return {screen,level:game.level,flag:game.hexagonestMode,kind:game.timeline.kind,
    duration:game.timeline.duration,waves:game.timeline.waves.length,controls:game.controlMode};
  });
  assert.equal(init.screen,'play');assert.equal(init.level,2);
  assert(init.flag&&init.kind==='hexagonest-video');
  assert(init.duration>=317&&init.waves>500,'317s source should extend the stage past 60s');
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
   assert(state.walls>=1,'visible walls must continue at '+t+'s');
   if(t>=120)assert.equal(state.saturation,0,'late monochrome mode');
   else if(t>=60)assert.equal(state.saturation,0,'grayscale after 60s');
   else assert(state.saturation>0,'colored opening');
   await page.screenshot({path:'wall-browser-screenshots/hexagonest-'+t+'s.png'});
  }
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
  console.log('PASS Hexagonest 317s launch, ten canvas captures, color era boundaries, three control modes and stage isolation in Chromium');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
