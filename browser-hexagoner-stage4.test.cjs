'use strict';
// Optional browser smoke test for Task 4 (requires Playwright + HTTP server).
// Start server: node server.cjs
// Then: node browser-hexagoner-stage4.test.cjs
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:600}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.HEXAGON_URL||'http://127.0.0.1:4173/',{waitUntil:'load'});
  await page.evaluate(()=>{window.requestAnimationFrame=()=>0});
  const state=await page.evaluate(async()=>{
   settings.sound=false;settings.motion=true;selected=1;
   screen='play';transition=null;launch=null;flash=0;uiAge=0;
   const data=await loadTimeline(1);
   game=new HexHexagonerPost60.HexagonerGame(data);
   game.setControlMode(1);
   const prePartCount=game.timeline.sourcePartCount;
   game.time=60;const generated=HexHexagonerPost60.build(game);
   game.time=76;game.sampleWalls();updatePalette(.1);draw();
   const after={time:game.time,walls:game.walls.length,camera:game.recordedCamera.slice(),
    palette:displayedHue,mode:game.timeline.mode,sourceParts:generated.parts};
   const center=HexEngine.playerHitPoint(game.angle);
   updateVisualTurn(game,.16,1);const right=game.visualTurn;
   updateVisualTurn(game,.16,0);const released=game.visualTurn;
   updateVisualTurn(game,.16,-1);const left=game.visualTurn;
   const afterCenter=HexEngine.playerHitPoint(game.angle);
   return {prePartCount,after,center,afterCenter,right,released,left,
    triangleUsesVisualLean:!!document.querySelector('canvas#game')};
  });
  assert.equal(state.prePartCount,21);
  assert.equal(state.after.mode,'hexagoner-video-parts-post60');
  assert(state.after.sourceParts>=16&&state.after.walls>0);
  assert(state.after.camera.every(Number.isFinite));
  assert.deepEqual(state.center,state.afterCenter,'visual leaning must not move hitbox');
  assert(state.right>0&&state.released<state.right&&state.left<state.released,
   'triangle leans right/left then recenters');
  assert.deepEqual(errors,[],'no browser JS exceptions');
  fs.mkdirSync('wall-browser-screenshots',{recursive:true});
  await page.screenshot({path:'wall-browser-screenshots/hexagoner-stage4-76s.png'});
  console.log('PASS browser smoke: HEXAGONER post60 waves/camera/palette; mode1 steering hitbox unchanged');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
