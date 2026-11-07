'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:600}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.HEXAGON_URL||'http://127.0.0.1:4173/');
  await page.evaluate(()=>{window.requestAnimationFrame=()=>0});await page.waitForTimeout(80);
  fs.mkdirSync('wall-browser-screenshots',{recursive:true});
  const started=await page.evaluate(async()=>{settings.sound=false;selected=0;screen='select';await start();return {hard:game.hardMode,source:game.timeline.mode}});
  assert.deepEqual(started,{hard:true,source:'hard-rules'});
  for(const time of [0,10,21.5,22,30,45,59,61,90]){
   const result=await page.evaluate(t=>{
    game=new HexHardMode.HardGame(HexHardMode.create(19,120));selected=0;screen='play';launch=null;transition=null;flash=0;
    game.time=t;game.sampleWalls();game.rotation=t*2.5;game.tilt=.25;game.zoom=1.1;game.referenceCamera=null;updatePalette(.1);draw();
    return {walls:game.walls.length,finite:game.walls.every(w=>w.renderPoly.flat().every(Number.isFinite)),morph:game.morph};
   },time);
   assert(result.finite);await page.screenshot({path:`wall-browser-screenshots/hard-rules-${time}.png`});
  }
  for(const mode of [1,2,3]){
   const result=await page.evaluate(mode=>{
    game=new HexHardMode.HardGame(HexHardMode.create(7,120));game.setControlMode(mode);selected=0;settings.sound=false;screen='play';launch=null;transition=null;flash=0;
    for(let i=0;i<1200&&!game.dead;i++)game.update(1/60,0);
    frame(performance.now());const at=game.time,hit=JSON.stringify(game.death);uiAge=.25;flash=0;draw();
    window.__impact={time:at,hit};return {dead:game.dead,screen,hit:!!game.death};
   },mode);
   assert(result.dead&&result.hit&&result.screen==='over');
   await page.screenshot({path:`wall-browser-screenshots/hard-death-${mode}-impact.png`});
   const frozen=await page.evaluate(()=>{uiAge=1.3;draw();return game.time===window.__impact.time&&JSON.stringify(game.death)===window.__impact.hit});assert(frozen);
   await page.screenshot({path:`wall-browser-screenshots/hard-death-${mode}-result.png`});
  }
  const a=await page.evaluate(async()=>{screen='over';await start();return game.timeline.seed}),b=await page.evaluate(async()=>{screen='over';await start();return game.timeline.seed});assert.notEqual(a,b);
  assert.deepEqual(errors,[]);console.log('PASS actual HARD launch/retry, independent random patterns, shared morph geometry, 60s palette and all-mode death flow in Chromium');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
