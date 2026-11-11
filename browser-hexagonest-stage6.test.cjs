'use strict';
// Optional browser regression. Requires Playwright, local server or Pages.
// HEXAGON_URL=https://chansiu11.github.io/hexagon/ node browser-hexagonest-stage6.test.cjs
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 try{
  const page=await b.newPage({viewport:{width:960,height:600}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.HEXAGON_URL||'http://127.0.0.1:4173/',{waitUntil:'load'});
  await page.evaluate(()=>{window.requestAnimationFrame=()=>0});
  const state=await page.evaluate(()=>{
   settings.sound=false;settings.motion=true;selected=2;
   screen='play';transition=null;launch=null;flash=0;uiAge=0;
   game=new HexHexagonestPost60.HexagonestGame(HexHexagonest.createRandomTimeline(70,100));
   game.setControlMode(1);
   const pre=game.timeline.mode;
   game.time=60;HexHexagonestPost60.createContinuation(game);
   game.time=68.5;game.sampleWalls();updatePalette(.1);draw();
   const running={mode:game.timeline.mode,parts:game.timeline.post60PartCount,
    activeWalls:game.walls.length,allFinite:game.walls.every(w=>w.renderPoly.every(p=>p.every(Number.isFinite))),
    matrix:HexHexagonestPost60.cameraAt(game),saturation:displayedSat};
   const center=HexEngine.playerHitPoint(game.angle);
   updateVisualTurn(game,.16,1);const leanRight=game.visualTurn;
   updateVisualTurn(game,.16,0);const leanReturn=game.visualTurn;
   updateVisualTurn(game,.16,-1);const leanLeft=game.visualTurn;
   const unchanged=HexEngine.playerHitPoint(game.angle);
   game.hit=()=>({id:'force',renderPoly:[[0,0],[1,0],[1,1],[0,1]]});
   game.update(1/60,0);
   screen='over';uiAge=.15;draw();
   const a=game.deathCamera?.affine||[],frozen=HexHexagonestPost60.cameraAt(game);
   return {pre,running,leanRight,leanReturn,leanLeft,center,unchanged,
    death:game.dead,freeze:JSON.stringify(a)===JSON.stringify(frozen)};
  });
  assert.equal(state.pre,'hexagonest-video');
  assert.equal(state.running.mode,'hexagonest-video-post60');
  assert.equal(state.running.parts,5);
  assert(state.running.activeWalls>0&&state.running.allFinite);
  assert.equal(state.running.saturation,0,'monochrome era has zero saturation');
  assert(state.running.matrix.every(Number.isFinite));
  assert(state.leanRight>0&&state.leanReturn<state.leanRight&&state.leanLeft<state.leanReturn);
  assert.deepEqual(state.center,state.unchanged,'triangle lean does not move collision center');
  assert(state.death&&state.freeze);
  assert.deepEqual(errors,[]);
  fs.mkdirSync('wall-browser-screenshots',{recursive:true});
  await page.screenshot({path:'wall-browser-screenshots/hexagonest-stage6-death.png'});
  console.log('PASS HEXAGONEST stage6 browser: grayscale, parts, controls, collision freeze');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
